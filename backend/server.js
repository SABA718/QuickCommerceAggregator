require('dotenv').config({quiet:true});
const {loadConfig} = require('./src/config');
const {createLogger} = require('./src/logger');
const {createRedis} = require('./src/redis');
const {createDatabase} = require('./src/database');
const {createScraper} = require('./src/scraperEngine');
const {createCatalog} = require('./src/catalog');
const {createIntegrations} = require('./src/integrations');
const {createSmsSender} = require('./src/auth');
const {createApp} = require('./src/app');
const logger = createLogger(process.env.LOG_LEVEL || 'info');
async function start() {
  const config = loadConfig();
  const redis = createRedis(config,logger);
  const database = createDatabase(config);
  await redis.connect();
  try { await database.health(); }
  catch (error) { redis.destroy(); throw error; }
  const scraper = createScraper(config,logger);
  const catalog = createCatalog({database,redis,scraper,config,logger});
  const app = createApp({config,redis,database,catalog,integrations:createIntegrations(config,logger),sendSms:createSmsSender(config),logger});
  const server = app.listen(config.port,'0.0.0.0',() => logger.info({port:config.port},'api_listening'));
  server.requestTimeout = 45000;
  server.headersTimeout = 15000;
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    logger.info('shutdown_started');
    const deadline = setTimeout(() => {server.closeAllConnections();redis.destroy();process.exit(1);},10000).unref();
    server.close(async () => {
      await catalog.waitForIdle();
      await redis.quit();
      clearTimeout(deadline);
    });
  };
  process.on('SIGTERM',shutdown);
  process.on('SIGINT',shutdown);
}
start().catch(error => {
  // Configuration errors describe variable names and rules, never secret values.
  logger.fatal({message:error.message},'startup_failed');
  process.exit(1);
});
