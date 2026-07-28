require('dotenv').config();
const { ApifyClient } = require('apify-client');

// Initialize Apify
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

// Helper to turn "₹132" into the number 132
const cleanPrice = (rawPrice) => {
    if (!rawPrice) return 0;
    const numericString = String(rawPrice).replace(/[^0-9.]/g, '');
    return parseFloat(numericString) || 0;
};

// 🌟 THE UNIFIED BATCH ENGINE
const runLiveBatchScraper = async (ingredientsArray) => {
    console.log(`🚀 Triggering Apify Actor for ${ingredientsArray.length} items:`, ingredientsArray);

    try {
        const allPromises = ingredientsArray.map(async (query) => {
            try {
                const run = await client.actor("zangscraper/blinkit-zepto-apify-actor").call({
                    "searchQuery": query,
                    "maxItems": 15
                });
                
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                return { query, items: items || [] };
            } catch (err) {
                console.error(`⚠️ Apify failed for "${query}":`, err.message);
                return { query, items: [] };
            }
        });

        const scrapedDatasets = await Promise.all(allPromises);
        let allFormattedResults = [];

        scrapedDatasets.forEach(({ query, items }) => {
            console.log(`📦 Apify returned ${items?.length || 0} raw items for "${query}"`);

            if (items && items.length > 0) {
                // 1. STRICT FILTERING
                const searchWords = query.toLowerCase().split(' ');
                let relevantItems = items.filter(item => {
                    const productName = (item.name || "").toLowerCase();
                    return searchWords.some(word => productName.includes(word));
                });

                // 2. THE FAILSAFE (Crucial for generic terms like "milk")
                if (relevantItems.length === 0 && items.length > 0) {
                    console.log(`⚠️ Strict filter deleted everything for "${query}". Triggering Failsafe (keeping raw items).`);
                    relevantItems = items;
                }

                if (relevantItems.length > 0) {
                    // 3. FORMATTING FOR DB
                    const formattedItems = relevantItems.map(item => ({
                        search_query: query.toLowerCase(),
                        platform: item.platform || 'Unknown',
                        name: item.name || 'Unnamed Product',
                        price: cleanPrice(item.discountedPrice || item.sellingPrice || item.price), 
                        mrp: cleanPrice(item.mrp || item.originalPrice || item.price),
                        image_url: item.image || item.imageUrl || item.image_url || '',
                        time: item.deliveryTime || '10 mins',
                        link: item.url || '',
                        quantity: item.quantity || item.weight || item.unit || item.size || '1 pc' 
                    }));

                    allFormattedResults.push(...formattedItems);
                }
            }
        });

        return allFormattedResults;

    } catch (e) {
        console.error("❌ Apify Master Scraper Error:", e.message);
        return [];
    }
};

// Export ONLY the new batch engine
module.exports = { runLiveBatchScraper };