const {createClient} = require('redis');
function createRedis(config,logger) {
  const redis = createClient({url:config.redisUrl,socket:{connectTimeout:5000,reconnectStrategy:retries => retries > 3 ? new Error('Redis unavailable') : Math.min(100 * (retries + 1),1000)},disableOfflineQueue:true});
  redis.on('error', () => logger.error({code:'REDIS_UNAVAILABLE'},'redis_connection_error'));
  return redis;
}
module.exports = {createRedis};
