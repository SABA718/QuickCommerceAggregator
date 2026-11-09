require('dotenv').config({quiet:true});
const {loadConfig} = require('./src/config');
const {createDatabase} = require('./src/database');
const {createScraper} = require('./src/scraperEngine');
const {createLogger} = require('./src/logger');
const {parse,queryText} = require('./src/validation');
const logger = createLogger();
async function main() {
  const queries = process.argv.slice(2);
  if (!queries.length || queries.length > 20) throw new Error('Usage: npm run seed -- "milk" "bread" (1–20 explicit queries; calls the paid Apify integration).');
  const validated = queries.map(query => parse(queryText,query));
  const config = loadConfig();
  const database = createDatabase(config);
  const scraper = createScraper(config,logger);
  const products = await scraper.fetchProducts(validated);
  await database.saveProducts(products);
  logger.info({saved:products.length},'catalog_import_completed');
}
main().catch(error => {logger.error({code:error.code || 'IMPORT_FAILED',message:error.message},'catalog_import_failed');process.exitCode=1;});
