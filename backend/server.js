const express = require('express');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');
const Groq = require('groq-sdk');
const { createClient } = require('redis');
const axios = require('axios'); // 🌟 NEW: Added Axios to communicate with Python AI Service

// --- YOUR EXISTING CONTROLLERS & DB ---
const { searchProducts } = require('./src/searchController');
const { calculateCart } = require('./src/cartController');
const { supabase } = require('./src/database');
const { runLiveBatchScraper } = require('./src/scraperEngine');

const app = express();
const port = process.env.PORT || 3000;

// --- INITIALIZATIONS ---

// 1. Initialize Redis (Cloud Ready!)
const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.log('❌ Redis Error:', err.message));

// 2. Initialize Groq (AI)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'MISSING_API_KEY'
});

// --- MIDDLEWARE ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// --- 🌟 REFINED: AI INTERCEPTOR MIDDLEWARE 🌟 ---
const aiSearchInterceptor = async (req, res, next) => {
  // Catch the query whether the frontend sends ?query=milk OR ?q=milk
  const rawQuery = req.query.query || req.query.q;
  
  if (!rawQuery) return next();

  let targetQuery = rawQuery;

  // 1. ISOLATED TRANSLATION (Only trigger if non-English characters are detected)
  const containsRegionalText = /[^\x00-\x7F]/.test(targetQuery);
  
  if (containsRegionalText) {
    try {
      const translationRes = await axios.post('http://localhost:8000/api/translate', { text: targetQuery });
      if (translationRes.data && translationRes.data.success) {
        targetQuery = translationRes.data.translated;
        console.log(`🌍 AI Translate: "${rawQuery}" -> "${targetQuery}"`);
      }
    } catch (error) {
      // Silently ignore translation failures
    }
  }

// 2. ISOLATED NORMALIZATION (Spell Check)
  try {
    const normalizationRes = await axios.post('http://localhost:8000/api/normalize', { raw_name: targetQuery });
    if (normalizationRes.data && normalizationRes.data.success) {
      targetQuery = normalizationRes.data.normalized;
      console.log(`🎯 AI Normalize: Snapped to catalog -> "${targetQuery}"`);
    } else {
      console.log(`⚠️ AI Normalize: No catalog match found. Triggering raw scrape...`);
    }
  } catch (error) {
    console.error("⚠️ Python Normalization Service unavailable.");
  }

  // 🌟 THE FIX: Use a dedicated custom property to hand off the data to the controller
  req.aiCleanedQuery = targetQuery; 
  req.originalRawQuery = rawQuery; 
  
  next();
};

// --- MEMORY STORES & UTILITIES (OTP) ---
const otpStore = new Map();

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendSmsWithTextbee(phoneNumber, message) {
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const apiKey = process.env.TEXTBEE_API_KEY;

  if (!deviceId || !apiKey) {
    throw new Error('Missing TEXTBEE_DEVICE_ID or TEXTBEE_API_KEY in backend .env');
  }

  const response = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ recipients: [phoneNumber], message }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || 'Failed to send SMS');
  return data;
}

// --- CHEF AGENT SCHEMA (AI) ---
const chefSchema = {
  type: "object",
  properties: {
    dish_profile: { type: "string", description: "Identify the EXACT regional cuisine or drink type." },
    spices_and_herbs: { type: "array", items: { type: "string" }, description: "Whole/ground spices, fresh herbs. Leave empty if none." },
    fresh_produce: { type: "array", items: { type: "string" }, description: "Vegetables, fruits, aromatics, etc." },
    proteins_and_grains: { type: "array", items: { type: "string" }, description: "Meat, dairy, flour, rice, etc. Leave empty if none." },
    cooking_fat: { type: "string", enum: ["Oil", "Ghee", "Butter", "None"], description: "Select 'None' if the recipe requires no cooking fat." },
    salt_included: { type: "boolean", description: "True if the dish requires salt. False for sweet drinks/desserts." }
  },
  required: ["dish_profile", "spices_and_herbs", "fresh_produce", "proteins_and_grains", "cooking_fat", "salt_included"]
};

// --- LIVE AGGREGATOR ENGINE WITH VARIANTS ---
async function buildLiveCart(allScrapedData) {
  console.log(`🛒 Aggregating prices across platforms and grouping variants...\n`);
  
  const platformTotals = {
    'Zepto': { totalPrice: 0, items: [] },
    'Blinkit': { totalPrice: 0, items: [] },
    'Instamart': { totalPrice: 0, items: [] }
  };

  // Group variants for the frontend
  allScrapedData.forEach(({ ingredient, results }) => {
    Object.keys(platformTotals).forEach(plat => {
      
      const platResults = results.filter(r => r.platform && r.platform.toLowerCase() === plat.toLowerCase());

      if (platResults.length > 0) {
        // Sort variants by live price (cheapest first)
        platResults.sort((a, b) => a.price - b.price);
        
        // Map them into a clean variants array for the frontend Dropdown
        const availableVariants = platResults.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity || 'Standard', 
        }));

        const cheapestVariant = availableVariants[0]; 

        platformTotals[plat].totalPrice += cheapestVariant.price;
        platformTotals[plat].items.push({
          originalQuery: ingredient,
          image_url: platResults[0].image_url,
          time: platResults[0].time || 'Check App',
          variants: availableVariants, // Frontend dropdown will use this!
          selectedVariant: cheapestVariant 
        });
      }
    });
  });

  // Format into Winner & Runner-Ups
  const formattedCarts = Object.keys(platformTotals).map(platform => {
    const data = platformTotals[platform];
    return {
      platform: platform,
      totalPrice: data.totalPrice,
      deliveryTime: data.items.length > 0 ? data.items[0].time : 'Unknown',
      items: data.items,
      itemsFound: data.items.length 
    };
  });

  // Sort Carts (Prioritize carts that found the most items, then lowest price)
  formattedCarts.sort((a, b) => {
    if (a.itemsFound !== b.itemsFound) {
      return b.itemsFound - a.itemsFound;
    }
    return a.totalPrice - b.totalPrice;
  });

  return {
    winner: formattedCarts[0],
    runnerUps: formattedCarts.slice(1)
  };
}

// --- ROUTES ---

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'Server running' }));

// 🌟 YOUR ROUTES (Search & Cart) 🌟
// Notice how the aiSearchInterceptor is added before searchProducts!
app.get('/api/search', aiSearchInterceptor, searchProducts);
app.post('/api/cart', calculateCart);

// 🌟 NEW: SMART LIST PROXY ROUTE 🌟
// This allows your React frontend to send WhatsApp lists to your Node server, which safely asks Python to parse it.
app.post('/api/parse-list', async (req, res) => {
  const { raw_list } = req.body;
  if (!raw_list) return res.status(400).json({ error: "raw_list is required" });

  try {
    const aiRes = await axios.post('http://localhost:8000/api/parse-list', { raw_list });
    return res.json(aiRes.data);
  } catch (error) {
    console.error("Smart List Parsing Error:", error.message);
    return res.status(500).json({ success: false, error: "Failed to parse list via AI engine" });
  }
});

// Friend's Auth Routes (OTP)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber);
    if (!phoneNumber) return res.status(400).json({ success: false, message: 'Invalid phone number' });

    const now = Date.now();
    const expiryMs = Number(process.env.OTP_EXPIRY_SECONDS || 300) * 1000;
    const resendMs = Number(process.env.OTP_RESEND_SECONDS || 25) * 1000;

    const existing = otpStore.get(phoneNumber);
    if (existing && now - existing.lastSentAt < resendMs) {
      return res.status(429).json({ success: false, message: 'Please wait before requesting another OTP' });
    }

    const otp = generateOtp();
    otpStore.set(phoneNumber, { otp, expiresAt: now + expiryMs, lastSentAt: now, attempts: 0 });

    const textbeeResponse = await sendSmsWithTextbee(phoneNumber, `Your DealDock OTP is ${otp}. It expires in 5 minutes.`);
    return res.status(200).json({ success: true, message: 'OTP sent successfully', phoneNumber, providerResponse: textbeeResponse });
  } catch (error) {
    console.error('SEND OTP ERROR:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber);
    const otp = String(req.body.otp || '').trim();

    if (!phoneNumber || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Invalid phone number or OTP' });

    const record = otpStore.get(phoneNumber);
    if (!record) return res.status(400).json({ success: false, message: 'OTP not found. Please request a new OTP.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }
    if (record.otp !== otp) {
      record.attempts += 1;
      otpStore.set(phoneNumber, record);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    otpStore.delete(phoneNumber);
    return res.status(200).json({ success: true, message: 'OTP verified successfully', user: { phoneNumber }, token: crypto.randomUUID() });
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to verify OTP' });
  }
});

// --- THE NERVE CENTER / CORE API ROUTE (AI RECIPE) ---
app.post('/api/get-ingredients', async (req, res) => {
  const { dishName } = req.body;
  if (!dishName) return res.status(400).json({ error: 'Please provide a dishName' });

  const cacheKey = `search:${dishName.toLowerCase().trim()}`;
  try {
    if (redisClient.isReady) {
      const cachedCart = await redisClient.get(cacheKey);
      if (cachedCart) {
        console.log(`\n======================================================`);
        console.log(`⚡ REDIS CACHE HIT FOR: "${dishName}"`);
        console.log(`======================================================`);
        console.log(`🚀 Serving data in < 50ms.`);
        return res.json({ success: true, data: JSON.parse(cachedCart) });
      }
    }
  } catch (error) { console.error("⚠️ Redis Read Failed"); }

  console.log(`\n======================================================`);
  console.log(`🧠 ADAPTIVE PIPELINE (GROQ 70B) FOR: "${dishName}"`);
  console.log(`======================================================`);

  try {
    // 🌟 THE ULTIMATE CHEF PROMPT 🌟
    const chefPrompt = `
      You are an elite Michelin-star Chef. Generate a precise e-commerce grocery list for: "${dishName}".
      - ADAPTIVE COMPLEXITY: Scale your item count to reality.
      - Output MUST be valid JSON matching this exact schema: ${JSON.stringify(chefSchema)}
      - CRITICAL: Return the JSON directly. Do NOT wrap the properties inside a parent key.
      - NAMING RULE: You MUST use these exact generic base names when applicable: "chicken", "basmati rice", "onion", "tomato", "ginger garlic paste", "biryani masala", "curd", "mint leaves", "coriander leaves", "green chilies", "lemon", "ghee", "oil", "red chili powder", "turmeric powder", "salt", "paneer", "butter", "fresh cream", "cashews", "kasuri methi", "garam masala", "dosa batter", "potato", "mustard seeds", "curry leaves", "chana dal", "spinach", "cumin seeds", "black urad dal", "rajma", "tomato puree", "kashmiri red chili powder".
    `;

    const chefResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: chefPrompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2, 
    });

    const chefData = JSON.parse(chefResponse.choices[0].message.content);
    const finalDishProfile = chefData.dish_profile || "Unknown Category";
    
    const rawIngredients = [
      ...(chefData.spices_and_herbs || []),
      ...(chefData.fresh_produce || []),
      ...(chefData.proteins_and_grains || [])
    ];
    if (chefData.cooking_fat && chefData.cooking_fat !== "None") rawIngredients.push(chefData.cooking_fat);
    if (chefData.salt_included) rawIngredients.push("Salt");
    
    // Clean and deduplicate the ingredients
    const currentIngredients = [...new Set(rawIngredients)]
      .filter(item => item && !item.toLowerCase().includes('http'))
      .map(item => item.toLowerCase().trim()); 
        
    if (currentIngredients.length === 0) throw new Error("AI returned an empty list.");

    // 🌟 THE SUPABASE DICTIONARY WRITE LAYER 🌟
    try {
      const itemsToInsert = currentIngredients.map(item => ({
        name: item,
        category: finalDishProfile
      }));
      await supabase.from('canonical_products').upsert(itemsToInsert, { onConflict: 'name', ignoreDuplicates: true });
      console.log(`✅ Supabase Canonical Dictionary Synced Successfully.`);
    } catch (dbError) {
      console.log(`⚠️ Supabase DB sync failed:`, dbError.message);
    }

    // 🌟 1. THE SMART CACHE CHECK (Live DB matching) 🌟
    console.log(`\n🔍 Checking Supabase for live prices...`);
    const missingIngredients = [];
    let allScrapedData = [];

    const { data: cachedItems } = await supabase
      .from('top_products')
      .select('*')
      .in('search_query', currentIngredients);

    currentIngredients.forEach(ingredient => {
      const dbMatches = cachedItems?.filter(item => item.search_query === ingredient);
      if (dbMatches && dbMatches.length > 0) {
        allScrapedData.push({ ingredient, results: dbMatches });
      } else {
        missingIngredients.push(ingredient);
      }
    });

    // 🌟 2. THE LIVE APIFY TRIGGER (Batch Scraper) 🌟
    if (missingIngredients.length > 0) {
      console.log(`⚠️ Missing ${missingIngredients.length} live items. Triggering ONE Batch Apify Scrape...`);
      
      const liveBatchResults = await runLiveBatchScraper(missingIngredients); 
      
      if (liveBatchResults && liveBatchResults.length > 0) {
        console.log(`💽 Saving ${liveBatchResults.length} fresh live products to Supabase...`);
        const { error: insertError } = await supabase.from('top_products').insert(liveBatchResults);
        if (insertError) console.error("⚠️ Failed to save live data to DB:", insertError.message);

        // Merge the freshly scraped data
        missingIngredients.forEach(ingredient => {
          const itemResults = liveBatchResults.filter(r => r.search_query === ingredient);
          allScrapedData.push({ ingredient, results: itemResults });
        });
      }
    } else {
      console.log(`✅ 100% Cache Hit! Serving instantly from Supabase.`);
    }

    // 🌟 3. CART BUILDER 🌟
    const finalCart = await buildLiveCart(allScrapedData);

    if (finalCart && finalCart.winner && finalCart.winner.items.length > 0) {
      try {
        if (redisClient.isReady) {
          await redisClient.setEx(cacheKey, 86400, JSON.stringify(finalCart));
          console.log(`⚡ Final Cart saved to Redis Cache.`);
        }
      } catch (error) { console.error("⚠️ Failed to write to Redis"); }
    }

    res.json({ success: true, data: finalCart });
  } catch (error) {
    console.error("❌ Pipeline Failed:", error);
    res.status(500).json({ success: false, error: "Failed to process request" });
  }
});

// --- SERVER START WITH SAFE BOOT ---
(async () => {
  try {
    console.log(`⚡ Attempting to connect Speed Layer (Redis)...`);
    await redisClient.connect();
    console.log(`✅ Speed Layer Active (Redis)`);
  } catch (err) {
    console.log(`⚠️ Redis connection failed. Check your Upstash URL in .env`);
  }

  app.listen(port, () => {
    console.log(`🚀 Unified API Gateway running on http://localhost:${port}`);
    console.log(`🔗 Scraper Engine & App Routes Ready`);
  });
})();