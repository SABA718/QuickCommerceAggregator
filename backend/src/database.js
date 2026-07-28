// backend/src/database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 1. THIS IS THE MISSING LINE: We must define 'supabase' here!
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const checkFastLaneDB = async (query) => {
    const cleanQuery = query.toLowerCase().trim();
    
    // Calculate the exact time 6 hours ago
    const sixHoursAgo = new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString();

    console.log(`DEBUG: Searching DB for '${cleanQuery}' newer than ${sixHoursAgo}`);

    const { data, error } = await supabase
        .from('top_products')
        .select('*')
        .eq('search_query', cleanQuery)
        .gte('created_at', sixHoursAgo); // ⏱️ ONLY return if newer than 6 hours!

    if (error) {
        console.error("Supabase Error:", error);
        return null;
    }

    return data && data.length > 0 ? data : null;
};

// 2. Now that 'supabase' is defined above, this export will work perfectly.
module.exports = { checkFastLaneDB, supabase };