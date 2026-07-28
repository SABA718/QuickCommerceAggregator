// backend/src/cartController.js
const { checkFastLaneDB } = require('./database');
const { fetchLiveProduct } = require('./scraperEngine');

// Shared memory lock to prevent duplicate scrapes
const activeScrapes = new Set();

const calculateCart = async (req, res) => {
    // Expects a JSON body like: { "items": ["onion", "milk", "bread"] }
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Please provide an array of items." });
    }

    try {
        console.log(`🛒 Processing Smart-Cart for: ${items.join(', ')}`);
        
        let isPending = false;
        const cartResults = {};

        // 1. Process every item in the cart concurrently
        const promises = items.map(async (query) => {
            const cleanQuery = query.toLowerCase().trim();
            let productData = [];

            // A. Check the Fast Lane (Database)
            const dbResults = await checkFastLaneDB(cleanQuery);
            
            if (dbResults && dbResults.length > 0) {
                productData = dbResults;
            } else {
                // B. Missing? Trigger Background Scrape (The Fire & Forget)
                if (!activeScrapes.has(cleanQuery)) {
                    activeScrapes.add(cleanQuery);
                    fetchLiveProduct(cleanQuery)
                        .then(() => activeScrapes.delete(cleanQuery))
                        .catch(err => {
                            console.error(`Cart Scrape Error for ${cleanQuery}:`, err);
                            activeScrapes.delete(cleanQuery);
                        });
                }
                isPending = true; // Flag that we are waiting on the scraper
            }

            // C. Find the CHEAPEST valid item for each platform
            // The DB might have 7 onions. We want the lowest price.
            const blinkitItem = productData
                .filter(i => i.platform.toLowerCase() === 'blinkit')
                .sort((a, b) => a.price - b.price)[0]; // Sort ascending, grab the first

            const zeptoItem = productData
                .filter(i => i.platform.toLowerCase() === 'zepto')
                .sort((a, b) => a.price - b.price)[0];

            cartResults[cleanQuery] = {
                Blinkit: blinkitItem || null,
                Zepto: zeptoItem || null
            };
        });

        await Promise.all(promises);

        // 2. If ANY item is still scraping, tell the frontend to poll
        if (isPending) {
            return res.json({
                isPending: true,
                message: "Assembling your smart cart... fetching live prices."
            });
        }

        // 3. Math Time! Calculate the Totals
        let blinkitTotal = 0;
        let zeptoTotal = 0;
        let blinkitFoundCount = 0;
        let zeptoFoundCount = 0;

        items.forEach(query => {
            const cleanQuery = query.toLowerCase().trim();
            const itemData = cartResults[cleanQuery];

            if (itemData.Blinkit) {
                blinkitTotal += itemData.Blinkit.price;
                blinkitFoundCount++;
            }
            if (itemData.Zepto) {
                zeptoTotal += itemData.Zepto.price;
                zeptoFoundCount++;
            }
        });

        // 4. Return the Final Receipt
        return res.json({
            isPending: false,
            cartDetails: cartResults,
            totals: {
                Blinkit: {
                    totalPrice: blinkitTotal,
                    itemsFound: `${blinkitFoundCount}/${items.length}`
                },
                Zepto: {
                    totalPrice: zeptoTotal,
                    itemsFound: `${zeptoFoundCount}/${items.length}`
                }
            }
        });

    } catch (error) {
        console.error("Cart Controller Error:", error);
        res.status(500).json({ error: "Failed to process cart" });
    }
};

module.exports = { calculateCart };