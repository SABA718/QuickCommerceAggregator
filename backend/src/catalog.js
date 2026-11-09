const { createHash, randomUUID } = require('node:crypto');
const { HttpError } = require('./errors');
const { PLATFORMS } = require('./scraperEngine');

const RELEASE_LOCK = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

/**
 * @param {{database: ReturnType<import('./database').createDatabase>, redis:any,
 * scraper: ReturnType<import('./scraperEngine').createScraper>, config:{negativeCacheSeconds:number,scrapeTimeoutSeconds:number},
 * logger:{error:Function,warn:Function}}} dependencies
 */
function createCatalog({ database, redis, scraper, config, logger }) {
  /** @type {Set<Promise<void>>} */
  const jobs = new Set();
  const jobTtl = config.scrapeTimeoutSeconds * 2 + 60;
  const pendingResponse = () => ({ source: 'live-provider', isPending: true, results: [],
    message: 'Fetching current prices. This may take up to two minutes.' });
  /** @param {string} key @param {string} token */
  const release = (key, token) => redis.eval(RELEASE_LOCK, { keys: [key], arguments: [token] });

  /** @param {string} rawQuery @param {boolean} [allowScrape] */
  async function search(rawQuery, allowScrape = false) {
    const query = rawQuery.toLowerCase().trim();
    const results = await database.findProducts(query);
    if (results.length) return { source: 'database', isPending: false, results };
    const digest = createHash('sha256').update(query).digest('hex');
    const statusKey = `catalog:status:${digest}`;
    const lockKey = `catalog:job:${digest}`;
    const status = await redis.get(statusKey);
    if (status === 'empty') return { source: 'database', isPending: false, results: [] };
    if (status) {
      const failure = JSON.parse(status);
      throw new HttpError(failure.status, failure.code, failure.message);
    }
    if (await redis.get(lockKey)) return pendingResponse();
    if (!allowScrape) throw new HttpError(401, 'AUTH_REQUIRED', 'Sign in to fetch live prices for this search.');
    if (scraper.available === false) throw new HttpError(503, 'SCRAPER_UNAVAILABLE', 'Live prices are not configured yet.');
    const token = randomUUID();
    const acquired = await redis.set(lockKey, token, { NX: true, EX: jobTtl });
    if (!acquired) return pendingResponse();
    let slotKey = '';
    try {
      for (let index = 0; index < 2; index += 1) {
        const key = `catalog:slot:${index}`;
        if (await redis.set(key, token, { NX: true, EX: jobTtl })) { slotKey = key; break; }
      }
      if (!slotKey) throw new HttpError(429, 'SCRAPER_BUSY', 'Price lookups are busy. Please retry shortly.');
    } catch (error) {
      await release(lockKey, token);
      throw error;
    }

    const job = (async () => {
      try {
        const liveRows = await scraper.fetchProducts([query]);
        await database.saveProducts(liveRows);
        if (!liveRows.length) await redis.setEx(statusKey, config.negativeCacheSeconds, 'empty');
      } catch (error) {
        const failure = error instanceof HttpError ? error : new HttpError(502, 'SCRAPER_FAILED', 'Live prices could not be fetched. Please try again later.');
        logger.error({ event: 'catalog_job_failed', code: failure.code });
        await redis.setEx(statusKey, 60, JSON.stringify({ status: failure.status, code: failure.code, message: failure.message }));
      } finally {
        await Promise.all([release(lockKey, token), release(slotKey, token)]);
      }
    })().catch(() => { logger.error({ event: 'catalog_job_cleanup_failed' }); });
    jobs.add(job);
    void job.finally(() => jobs.delete(job));
    return pendingResponse();
  }

  /** @param {string[]} queries */
  async function resolveProducts(queries) {
    let isPending = false;
    /** @type {{ingredient:string,results:import('./database').Product[]}[]} */
    const products = [];
    for (const ingredient of new Set(queries.map(value => value.toLowerCase().trim()))) {
      try {
        const found = await search(ingredient, true);
        if (found.isPending) isPending = true;
        products.push({ ingredient, results: found.results });
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== 'SCRAPER_BUSY') throw error;
        isPending = true;
        products.push({ ingredient, results: [] });
      }
    }
    return { isPending, products };
  }

  /** @param {string[]} items */
  async function cart(items) {
    const { isPending, products } = await resolveProducts(items);
    const entries = products.map(({ ingredient, results }) => [ingredient, Object.fromEntries(PLATFORMS.map(platform => [platform,
      results.filter(item => item.platform === platform).sort((a, b) => a.price - b.price)[0] || null,
    ]))]);
    const cartDetails = Object.fromEntries(entries);
    const totals = Object.fromEntries(PLATFORMS.map(platform => {
      const matches = products.map(({ ingredient }) => cartDetails[ingredient][platform]).filter(Boolean);
      return [platform, { totalPrice: Math.round(matches.reduce((sum, row) => sum + row.price, 0) * 100) / 100,
        itemsFound: `${matches.length}/${products.length}`, isComplete: matches.length === products.length }];
    }));
    return { isPending, cartDetails, totals, ...(isPending ? { message: 'Fetching current prices for your basket.' } : {}) };
  }

  return { search, resolveProducts, cart, async waitForIdle() { await Promise.all(jobs); } };
}

module.exports = { createCatalog };
