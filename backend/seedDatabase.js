require('dotenv').config();
const { supabase } = require('./src/database');
const { runLiveBatchScraper } = require('./src/scraperEngine');

// 1. THE VARIANT DICTIONARY (Strict 5-Tier Quantities)
// This guarantees the scraper fetches exact matches for a "pucca" frontend UI.
const ingredientVariants = {
  // Veggies
  "onion": ["onion 250g", "onion 500g", "onion 1kg", "onion 2kg", "onion 5kg"],
  "tomato": ["tomato 250g", "tomato 500g", "tomato 1kg", "tomato 2kg", "tomato 5kg"],
  "potato": ["potato 250g", "potato 500g", "potato 1kg", "potato 2kg", "potato 5kg"],
  "lemon": ["lemon 1 pc", "lemon 3 pcs", "lemon 6 pcs", "lemon 12 pcs", "lemon 1kg"],
  "green chilli": ["green chilli 50g", "green chilli 100g", "green chilli 200g", "green chilli 500g", "green chilli 1kg"],
  
  // Dairy & Refrigerated
  "paneer": ["paneer 100g", "paneer 200g", "paneer 400g", "paneer 500g", "paneer 1kg"],
  "amul butter": ["amul butter 50g", "amul butter 100g", "amul butter 200g", "amul butter 500g", "amul butter 1kg"],
  "amul fresh cream": ["amul fresh cream 100ml", "amul fresh cream 200ml", "amul fresh cream 250ml", "amul fresh cream 500ml", "amul fresh cream 1l"],
  "curd": ["curd 100g", "curd 200g", "curd 400g", "curd 500g", "curd 1kg"],
  "idli dosa batter": ["idli dosa batter 500g", "idli dosa batter 1kg", "idli dosa batter 2kg", "millet dosa batter 1kg", "dosa batter 1kg pouch"],
  
  // Proteins
  "chicken curry cut": ["chicken curry cut 250g", "chicken curry cut 500g", "chicken curry cut 1kg", "chicken breast 500g", "chicken whole 1kg"],
  
  // Grains & Dals
  "basmati rice": ["basmati rice 500g", "basmati rice 1kg", "basmati rice 2kg", "basmati rice 5kg", "basmati rice 10kg"],
  "chana dal": ["chana dal 250g", "chana dal 500g", "chana dal 1kg", "chana dal 2kg", "chana dal 5kg"],
  "black urad dal": ["black urad dal 250g", "black urad dal 500g", "black urad dal 1kg", "black urad dal 2kg", "black urad dal 5kg"],
  "rajma": ["rajma 250g", "rajma 500g", "rajma 1kg", "rajma 2kg", "rajma 5kg"],
  
  // Spices & Powders
  "tata salt": ["tata salt 250g", "tata salt 500g", "tata salt 1kg", "tata salt 2kg", "tata salt 5kg"],
  "turmeric powder": ["turmeric powder 50g", "turmeric powder 100g", "turmeric powder 200g", "turmeric powder 500g", "turmeric powder 1kg"],
  "red chilli powder": ["red chilli powder 50g", "red chilli powder 100g", "red chilli powder 200g", "red chilli powder 500g", "red chilli powder 1kg"],
  "biryani masala": ["biryani masala 25g", "biryani masala 50g", "biryani masala 100g", "biryani masala 200g", "biryani masala 500g"],
  "garam masala": ["garam masala 25g", "garam masala 50g", "garam masala 100g", "garam masala 200g", "garam masala 500g"],
  "kashmiri red chilli powder": ["kashmiri red chilli powder 50g", "kashmiri red chilli powder 100g", "kashmiri red chilli powder 200g", "kashmiri red chilli powder 500g", "kashmiri red chilli powder 1kg"],
  "mustard seeds": ["mustard seeds 50g", "mustard seeds 100g", "mustard seeds 200g", "mustard seeds 500g", "mustard seeds 1kg"],
  "cumin seeds": ["cumin seeds 50g", "cumin seeds 100g", "cumin seeds 200g", "cumin seeds 500g", "cumin seeds 1kg"],
  
  // Oils & Liquids
  "ghee": ["ghee 100ml", "ghee 200ml", "ghee 500ml", "ghee 1l", "ghee 2l"],
  "sunflower oil": ["sunflower oil 500ml", "sunflower oil 1l", "sunflower oil 2l", "sunflower oil 5l", "sunflower oil 10l"],
  
  // Pastes & Herbs
  "ginger garlic paste": ["ginger garlic paste 50g", "ginger garlic paste 100g", "ginger garlic paste 200g", "ginger garlic paste 500g", "ginger garlic paste 1kg"],
  "tomato puree": ["tomato puree 100g", "tomato puree 200g", "tomato puree 500g", "tomato puree 800g", "tomato puree 1kg"],
  "mint leaves": ["mint leaves 1 bunch", "mint leaves 50g", "mint leaves 100g", "mint leaves 200g", "mint leaves 500g"],
  "coriander leaves": ["coriander leaves 1 bunch", "coriander leaves 50g", "coriander leaves 100g", "coriander leaves 200g", "coriander leaves 500g"],
  "curry leaves": ["curry leaves 1 bunch", "curry leaves 50g", "curry leaves 100g", "curry leaves 200g", "curry leaves 500g"],
  "spinach": ["spinach 1 bunch", "spinach 250g", "spinach 500g", "spinach 1kg", "spinach baby leaves 200g"],
  "kasuri methi": ["kasuri methi 25g", "kasuri methi 50g", "kasuri methi 100g", "kasuri methi 200g", "kasuri methi 500g"],
  
  // Dry Fruits
  "cashews": ["cashews 50g", "cashews 100g", "cashews 200g", "cashews 500g", "cashews 1kg"]
};

// 2. The 5 Golden Dishes Mapping
// Instead of raw strings, they now point to the keys in our dictionary above.
const masterDishes = {
  "Chicken Biryani": [
    "chicken curry cut", "basmati rice", "onion", "tomato", 
    "ginger garlic paste", "biryani masala", "curd", "mint leaves", 
    "coriander leaves", "green chilli", "lemon", "ghee", 
    "sunflower oil", "red chilli powder", "tata salt"
  ],
  "Paneer Butter Masala": [
    "paneer", "amul butter", "amul fresh cream", "cashews", 
    "kasuri methi", "onion", "tomato", "ginger garlic paste", 
    "garam masala", "tata salt", "sunflower oil"
  ],
  "Masala Dosa": [
    "idli dosa batter", "potato", "mustard seeds", "curry leaves", 
    "chana dal", "onion", "green chilli", "turmeric powder", 
    "tata salt", "sunflower oil"
  ],
  "Palak Paneer": [
    "paneer", "spinach", "onion", "tomato", "ginger garlic paste", 
    "green chilli", "garam masala", "cumin seeds", "amul fresh cream", 
    "tata salt", "sunflower oil"
  ],
  "Dal Makhani": [
    "black urad dal", "rajma", "amul butter", "amul fresh cream", 
    "tomato puree", "ginger garlic paste", "kashmiri red chilli powder", 
    "garam masala", "tata salt"
  ]
};

async function runMasterSeed() {
  console.log(`\n🌟 STARTING THE LIVE MASTER SEEDER (MULTI-VARIANT PRO MODE) 🌟`);
  
  // 3. Extract, Flatten, and Deduplicate ALL 5-Tier Variants
  let allQueries = [];
  
  Object.values(masterDishes).forEach(dishBaseIngredients => {
    dishBaseIngredients.forEach(baseItem => {
      if (ingredientVariants[baseItem]) {
        // Push all 5 variants of this ingredient into the scrape list
        allQueries.push(...ingredientVariants[baseItem]);
      } else {
        console.warn(`⚠️ Missing variant mapping for: ${baseItem}`);
      }
    });
  });
  
  const uniqueQueries = [...new Set(allQueries)];
  console.log(`🛒 Found ${uniqueQueries.length} strictly formatted search queries across 5 dishes.`);

  // 4. Clear the old test data from Supabase
  console.log(`🧹 Clearing old database records...`);
  
  // Note: If uniqueQueries > 1000, Supabase might reject the .in() array limit. 
  // Slicing it in chunks for safety during deletion.
  for (let i = 0; i < uniqueQueries.length; i += 500) {
     const deleteChunk = uniqueQueries.slice(i, i + 500);
     await supabase.from('top_products').delete().in('search_query', deleteChunk);
  }

  // 5. Batch Processing for Apify (To prevent crashing / rate-limits)
  const batchSize = 5; 
  let totalSaved = 0;

  for (let i = 0; i < uniqueQueries.length; i += batchSize) {
    const chunk = uniqueQueries.slice(i, i + batchSize);
    console.log(`\n🚀 Triggering Apify Batch ${Math.ceil(i/batchSize) + 1} of ${Math.ceil(uniqueQueries.length/batchSize)}...`);
    console.log(`👉 Items: ${chunk.join(', ')}`);

    try {
      const liveData = await runLiveBatchScraper(chunk);

      if (liveData && liveData.length > 0) {
        const { error } = await supabase.from('top_products').insert(liveData);
        if (error) {
          console.error(`❌ Failed to save chunk to Supabase:`, error.message);
        } else {
          totalSaved += liveData.length;
          console.log(`✅ Saved ${liveData.length} live SKU variants to Supabase.`);
        }
      }
    } catch (err) {
      console.error(`❌ Batch failed:`, err.message);
    }

    if (i + batchSize < uniqueQueries.length) {
      console.log(`⏳ Waiting 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n🎉 MASTER SEED COMPLETE!`);
  console.log(`💽 Successfully populated ${totalSaved} highly-specific variants into your database!`);
}

runMasterSeed();