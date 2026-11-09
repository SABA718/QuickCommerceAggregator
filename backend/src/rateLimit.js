const crypto = require('node:crypto');
const {HttpError} = require('./errors');
const RATE_SCRIPT = `-- rate_limit
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('TTL', KEYS[1])}`;
function rateLimit(redis, {name,limit,windowSeconds,key = req => req.ip}) {
  return async (req,res,next) => {
    const digest = crypto.createHash('sha256').update(String(key(req))).digest('hex');
    let result;
    try { result = await redis.eval(RATE_SCRIPT,{keys:[`rate:${name}:${digest}`],arguments:[String(windowSeconds)]}); }
    catch { throw new HttpError(503,'RATE_LIMIT_UNAVAILABLE','Service temporarily unavailable. Please try again.'); }
    const [count, ttl] = result;
    res.setHeader('RateLimit-Limit',limit);
    res.setHeader('RateLimit-Remaining',Math.max(0,limit-Number(count)));
    if (Number(count) > limit) {
      res.setHeader('Retry-After',Math.max(1,Number(ttl)));
      throw new HttpError(429,'RATE_LIMITED','Too many requests. Please wait and try again.');
    }
    next();
  };
}
module.exports = {rateLimit,RATE_SCRIPT};
