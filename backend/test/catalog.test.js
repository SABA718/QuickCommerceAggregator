const test = require('node:test');
const assert = require('node:assert/strict');
const { createCatalog } = require('../src/catalog');
const { buildLiveCart } = require('../src/recipe');
const { normalizeProducts, cleanPrice, safeUrl } = require('../src/scraperEngine');
const { HttpError } = require('../src/errors');

class MemoryRedis {
  constructor() { this.values = new Map(); this.now = 0; }
  async get(key) {
    const entry = this.values.get(key);
    if (entry && entry.expires > this.now) return entry.value;
    this.values.delete(key);
    return null;
  }
  async set(key, value, options = {}) {
    if (options.NX && await this.get(key)) return null;
    this.values.set(key, { value, expires: this.now + (options.EX || 1000000) });
    return 'OK';
  }
  async setEx(key, ttl, value) { return this.set(key, value, { EX: ttl }); }
  async eval(_script, { keys, arguments: [token] }) {
    if (await this.get(keys[0]) === token) { this.values.delete(keys[0]); return 1; }
    return 0;
  }
}
const logger = { error() {}, warn() {} };
const config = { negativeCacheSeconds: 300, scrapeTimeoutSeconds: 90 };
const product = (query = 'milk', platform = 'Blinkit', price = 25) => ({
  search_query: query, location_key: 'default', platform, name: `${query} 1L`, price, mrp: null,
  image_url: '', time: '', link: 'https://blinkit.com/p/milk', quantity: '1L', created_at: new Date().toISOString(),
});
function fixture(fetchProducts = async queries => queries.map(query => product(query))) {
  const rows = [];
  const database = {
    async findProducts(query) { return rows.filter(row => row.search_query === query); },
    async saveProducts(data) { rows.push(...data); },
    async health() {}, async saveCanonical() {},
  };
  const redis = new MemoryRedis();
  const scraper = { available: true, fetchProducts };
  return { database, redis, scraper, config, logger, rows };
}

test('anonymous cache miss cannot spend on a provider; cached products remain public', async () => {
  let calls = 0;
  const deps = fixture(async () => { calls += 1; return []; });
  const catalog = createCatalog(deps);
  await assert.rejects(catalog.search('milk'), { status: 401, code: 'AUTH_REQUIRED' });
  assert.equal(calls, 0);
  deps.rows.push(product());
  assert.equal((await catalog.search('milk')).results[0].price, 25);
});

test('authenticated search persists live products and finishes polling', async () => {
  const deps = fixture();
  const catalog = createCatalog(deps);
  assert.equal((await catalog.search(' MILK ', true)).isPending, true);
  await catalog.waitForIdle();
  const response = await catalog.search('milk');
  assert.equal(response.isPending, false);
  assert.equal(response.source, 'database');
  assert.equal(response.results.length, 1);
});

test('separate catalog instances share a job lock and cannot duplicate paid scrapes', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const deps = fixture(async () => { calls += 1; await blocked; return [product()]; });
  const first = createCatalog(deps);
  const second = createCatalog(deps);
  await first.search('milk', true);
  assert.equal((await second.search('milk', true)).isPending, true);
  assert.equal(calls, 1);
  release();
  await first.waitForIdle();
  assert.equal((await second.search('milk')).results.length, 1);
});

test('empty provider results end polling and are negatively cached until expiration', async () => {
  let calls = 0;
  const deps = fixture(async () => { calls += 1; return []; });
  const catalog = createCatalog(deps);
  await catalog.search('missing', true);
  await catalog.waitForIdle();
  assert.deepEqual((await catalog.search('missing', true)).results, []);
  assert.equal((await catalog.search('missing')).isPending, false);
  assert.equal(calls, 1);
  deps.redis.now = 301;
  await catalog.search('missing', true);
  await catalog.waitForIdle();
  assert.equal(calls, 2);
});

test('provider errors surface to polling clients and do not start endless retries', async () => {
  let calls = 0;
  const deps = fixture(async () => { calls += 1; throw new HttpError(502, 'SCRAPER_FAILED', 'Unavailable'); });
  const catalog = createCatalog(deps);
  await catalog.search('milk', true);
  await catalog.waitForIdle();
  await assert.rejects(catalog.search('milk', true), { status: 502, code: 'SCRAPER_FAILED' });
  assert.equal(calls, 1);
  assert.equal(await deps.redis.get('catalog:slot:0'), null);
});

test('two global provider slots bound spend and partial baskets remain pending', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  let active = 0;
  const deps = fixture(async queries => { active += 1; await blocked; return queries.map(query => product(query)); });
  const catalog = createCatalog(deps);
  const first = await catalog.resolveProducts(['milk', 'rice', 'bread']);
  assert.equal(first.isPending, true);
  assert.equal(first.products.length, 3);
  assert.equal(active, 2);
  release();
  await catalog.waitForIdle();
  await catalog.resolveProducts(['milk', 'rice', 'bread']);
  await catalog.waitForIdle();
  const cart = await catalog.cart(['milk', 'rice', 'bread']);
  assert.equal(cart.isPending, false);
  assert.equal(cart.totals.Blinkit.totalPrice, 75);
  assert.equal(cart.totals.Blinkit.itemsFound, '3/3');
  assert.equal(cart.totals.Zepto.isComplete, false);
});

test('database errors fail closed without causing provider calls', async () => {
  let calls = 0;
  const deps = fixture(async () => { calls += 1; return []; });
  deps.database.findProducts = async () => { throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Unavailable'); };
  await assert.rejects(createCatalog(deps).search('milk', true), { status: 503 });
  assert.equal(calls, 0);
});

test('normalization rejects unsafe URLs, invalid prices, unknown stores and duplicates', () => {
  const items = normalizeProducts('milk', [
    { platform: 'blinkit', name: 'Milk', price: '₹25.50', url: 'javascript:alert(1)' },
    { platform: 'Blinkit', name: 'Milk', price: 25.5 },
    { platform: 'Zepto', name: 'Milk', price: '10-20' },
    { platform: 'Unknown', name: 'Milk', price: 10 },
    { platform: 'Instamart', name: 'Milk', price: 0 },
    { platform: 'Zepto', name: 'Milk', price: 10, inStock: false },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 25.5);
  assert.equal(items[0].link, '');
  assert.equal(items[0].time, '');
  assert.equal(cleanPrice('INR 1,099.00'), 1099);
  assert.equal(cleanPrice(-1), null);
  assert.equal(cleanPrice('free'), null);
  assert.equal(safeUrl('https://secret:token@example.com'), '');
});

test('recipe ranking favors complete baskets and never labels an empty cart as winner', () => {
  assert.equal(buildLiveCart([]).winner, null);
  const result = buildLiveCart([
    { ingredient: 'milk', results: [product('milk', 'Blinkit', 30), product('milk', 'Zepto', 10)] },
    { ingredient: 'bread', results: [product('bread', 'Blinkit', 25)] },
  ]);
  assert.equal(result.winner.platform, 'Blinkit');
  assert.equal(result.winner.totalPrice, 55);
  assert.equal(result.winner.isComplete, true);
  assert.deepEqual(result.runnerUps[0].missingItems, ['bread']);
  assert.equal(result.runnerUps[0].isComplete, false);
  assert.equal(result.winner.items[0].variants[0].link, 'https://blinkit.com/p/milk');
});
