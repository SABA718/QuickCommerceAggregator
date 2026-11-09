const { createClient } = require('@supabase/supabase-js');
const { HttpError } = require('./errors');

/**
 * @typedef {object} Product
 * @property {string} search_query
 * @property {string} location_key
 * @property {string} platform
 * @property {string} name
 * @property {number} price
 * @property {number | null} mrp
 * @property {string} image_url
 * @property {string} time
 * @property {string} link
 * @property {string} quantity
 * @property {string} created_at
 */

/** @param {{supabaseUrl:string, supabaseKey:string, cacheTtlSeconds:number}} config */
function createDatabase(config) {
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const columns = 'search_query,location_key,platform,name,price,mrp,image_url,time,link,quantity,created_at';

  return {
    async health() {
      const { error } = await client.from('top_products').select('id').limit(1);
      if (error) throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Product database is unavailable.');
      const { error: catalogError } = await client.from('canonical_products').select('id').limit(1);
      if (catalogError) throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Product database is unavailable.');
    },
    /** @param {string} query @returns {Promise<Product[]>} */
    async findProducts(query) {
      const cutoff = new Date(Date.now() - config.cacheTtlSeconds * 1000).toISOString();
      const { data, error } = await client.from('top_products').select(columns)
        .eq('search_query', query).eq('location_key', 'default').gte('created_at', cutoff)
        .order('price', { ascending: true }).limit(100);
      if (error) throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Product database is unavailable.');
      return (data || []).map(row => ({ ...row, price: Number(row.price), mrp: row.mrp === null ? null : Number(row.mrp) }));
    },
    /** @param {Product[]} rows */
    async saveProducts(rows) {
      if (!rows.length) return;
      const { error } = await client.from('top_products').upsert(rows, {
        onConflict: 'search_query,location_key,platform,name,quantity',
      });
      if (error) throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Product prices could not be saved.');
    },
    /** @param {string[]} names @param {string} category */
    async saveCanonical(names, category) {
      if (!names.length) return;
      const { error } = await client.from('canonical_products').upsert(
        [...new Set(names)].map(name => ({ name, category })), { onConflict: 'name', ignoreDuplicates: true },
      );
      if (error) throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Product catalog could not be saved.');
    },
  };
}

module.exports = { createDatabase };
