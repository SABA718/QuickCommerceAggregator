const { ApifyClient } = require('apify-client');
const { HttpError } = require('./errors');

const PLATFORMS = Object.freeze(['Blinkit', 'Zepto', 'Instamart', 'BigBasket', 'JioMart']);

/** @param {unknown} value @returns {number | null} */
function cleanPrice(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const cleaned = String(value).trim().replace(/^(?:₹|Rs\.?|INR)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const price = Number(cleaned);
  return Number.isFinite(price) && price > 0 && price <= 1000000 ? price : null;
}

/** @param {unknown} value */
function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : '';
  } catch { return ''; }
}

/** @param {unknown} value @param {number} [max] */
function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** @param {string} query @param {Record<string, unknown>[]} items @returns {import('./database').Product[]} */
function normalizeProducts(query, items) {
  const seen = new Set();
  /** @type {import('./database').Product[]} */
  const products = [];
  for (const item of items.slice(0, 100)) {
    if (!item || typeof item !== 'object') continue;
    const platform = PLATFORMS.find(name => name.toLowerCase() === cleanText(item.platform).toLowerCase());
    const name = cleanText(item.name);
    const price = cleanPrice(item.discountedPrice ?? item.sellingPrice ?? item.price);
    if (!platform || !name || price === null || item.isInStock === false || item.inStock === false) continue;
    const quantity = cleanText(item.quantity || item.weight || item.unit || item.size, 100);
    const key = JSON.stringify([platform, name, quantity]);
    if (seen.has(key)) continue;
    seen.add(key);
    products.push({
      search_query: query.toLowerCase().trim(), location_key: 'default', platform, name, price,
      mrp: cleanPrice(item.mrp ?? item.originalPrice),
      image_url: safeUrl(item.image || item.imageUrl || item.image_url),
      time: cleanText(item.deliveryTime, 100), link: safeUrl(item.url || item.link), quantity,
      created_at: new Date().toISOString(),
    });
  }
  return products;
}

/**
 * @param {{apifyToken?:string, apifyActorId:string, scrapeTimeoutSeconds:number}} config
 * @param {{warn:Function}} logger
 */
function createScraper(config, logger) {
  const client = config.apifyToken ? new ApifyClient({ token: config.apifyToken, maxRetries: 1, timeoutSecs: 15 }) : null;
  return {
    available: Boolean(client),
    /** @param {string[]} queries @returns {Promise<import('./database').Product[]>} */
    async fetchProducts(queries) {
      if (!client) throw new HttpError(503, 'SCRAPER_UNAVAILABLE', 'Live prices are not configured yet.');
      if (queries.length > 20) throw new HttpError(400, 'INVALID_ITEMS', 'Compare at most 20 items at a time.');
      /** @type {import('./database').Product[]} */
      const results = [];
      const pending = [...new Set(queries)];
      const worker = async () => {
        while (pending.length) {
          const query = pending.shift();
          if (!query) continue;
          try {
            const run = await client.actor(config.apifyActorId).call({ searchQuery: query, maxItems: 15 }, {
              timeout: config.scrapeTimeoutSeconds,
              waitSecs: config.scrapeTimeoutSeconds + 5,
            });
            if (run.status !== 'SUCCEEDED') throw new Error('Actor did not complete');
            const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 100 });
            const normalized = normalizeProducts(query, items);
            if (items.length && !normalized.length) {
              throw new HttpError(502, 'SCRAPER_INVALID_RESPONSE', 'The price provider returned invalid product data.');
            }
            results.push(...normalized);
          } catch (error) {
            logger.warn({ event: 'scrape_failed', errorType: error?.constructor?.name });
            if (error instanceof HttpError) throw error;
            throw new HttpError(502, 'SCRAPER_FAILED', 'The price provider is temporarily unavailable. Please try again later.');
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker));
      return results;
    },
  };
}

module.exports = { createScraper, normalizeProducts, cleanPrice, safeUrl, PLATFORMS };
