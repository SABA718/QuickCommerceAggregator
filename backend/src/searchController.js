const { supabase } = require('./database');
const { runLiveBatchScraper } = require('./scraperEngine');

// 🛡️ THE LOCK: This prevents infinite scrape loops!
const activeScrapes = new Set(); 

const searchProducts = async (req, res) => {
    // 🌟 THE FIX: Strictly grab the dedicated AI variable passed from the middleware
    const cleanQuery = (req.aiCleanedQuery || req.query.query || req.query.q || '').toLowerCase().trim();
    
    if (!cleanQuery) {
        return res.status(400).json({ error: "Missing search query" });
    }

    try {
        // 1. FAST LANE: Check Cache & Data Storage (Supabase) First
        const { data: dbResults, error: dbError } = await supabase
            .from('top_products')
            .select('*')
            .eq('search_query', cleanQuery);

        // 🌟 If "amul taaza toned milk 500ml" is in the DB, it stops here!
        if (dbResults && dbResults.length > 0) {
            console.log(`⚡ Fast Lane Hit! Serving cached results for "${cleanQuery}"`);
            return res.json({ 
                source: 'Supabase Fast Lane 🗄️', 
                isPending: false, 
                results: dbResults 
            });
        }

        // 2. CHECK THE LOCK: Are we already scraping this?
        if (activeScrapes.has(cleanQuery)) {
            console.log(`⏳ Already scraping "${cleanQuery}", just waiting...`);
            return res.json({ 
                source: 'Background Scraper 🤖', 
                isPending: true, 
                message: `Still fetching live prices for "${cleanQuery}"...`,
                results: [] 
            });
        }

        // 3. THE FIRE & FORGET (Trigger ONCE to Data Sources)
        console.log(`🚀 Node Gateway sending to Scraper: "${cleanQuery}"`);
        
        // Add it to the lock so we don't trigger it again
        activeScrapes.add(cleanQuery); 

        runLiveBatchScraper([cleanQuery])
            .then(async (liveResults) => {
                if (liveResults && liveResults.length > 0) {
                    console.log(`💽 Saving ${liveResults.length} fresh items to Supabase for "${cleanQuery}"...`);
                    await supabase.from('top_products').insert(liveResults);
                }
                activeScrapes.delete(cleanQuery);
            })
            .catch(err => {
                console.error("Background Scrape Error:", err);
                activeScrapes.delete(cleanQuery);
            });

        // 4. IMMEDIATE RESPONSE 
        return res.json({ 
            source: 'Background Scraper 🤖', 
            isPending: true, 
            message: `Fetching live prices for "${cleanQuery}"... This usually takes 30 seconds.`,
            results: [] 
        });

    } catch (error) {
        console.error("Hybrid Engine Error:", error);
        res.status(500).json({ error: "Search failed" });
    }
};

module.exports = { searchProducts };