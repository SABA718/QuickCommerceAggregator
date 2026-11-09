const crypto = require('node:crypto');
const {HttpError} = require('./errors');
const COOKIE_NAME = 'dd_session';
// Verification and consumption happen in one Redis operation, including attempts.
const VERIFY_SCRIPT = `-- verify_otp
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local record = cjson.decode(value)
if record.attempts >= tonumber(ARGV[2]) then return -2 end
if record.hash ~= ARGV[1] then
  record.attempts = record.attempts + 1
  redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
  if record.attempts >= tonumber(ARGV[2]) then return -2 end
  return -1
end
redis.call('DEL', KEYS[1])
return 1`;
const DELETE_OWN_SCRIPT = `-- delete_own
if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end
return 0`;
function createAuth({redis,config,sendSms}) {
  const cookieName = config.nodeEnv === 'production' ? '__Host-dd_session' : COOKIE_NAME;
  const digest = value => crypto.createHmac('sha256',config.sessionSecret).update(value).digest('hex');
  const phoneKey = phone => digest(`phone:${phone}`);
  const cookieOptions = {httpOnly:true,secure:config.nodeEnv === 'production',sameSite:/** @type {'lax'} */('lax'),path:'/'};
  async function sendOtp(phoneNumber) {
    const phoneHash = phoneKey(phoneNumber);
    const reservation = crypto.randomUUID();
    const cooldownKey = `otp-cooldown:${phoneHash}`;
    const reserved = await redis.set(cooldownKey,reservation,{NX:true,EX:config.otpResendSeconds});
    if (!reserved) throw new HttpError(429,'OTP_COOLDOWN','Please wait before requesting another OTP.');
    const otp = String(crypto.randomInt(100000,1000000));
    const key = `otp:${phoneHash}`;
    try {
      await sendSms(phoneNumber,`Your DealDock OTP is ${otp}. It expires in ${Math.ceil(config.otpExpirySeconds / 60)} minutes.`);
      await redis.setEx(key,config.otpExpirySeconds,JSON.stringify({hash:digest(`${phoneNumber}:${otp}`),attempts:0}));
    } catch (error) {
      await redis.eval(DELETE_OWN_SCRIPT,{keys:[cooldownKey],arguments:[reservation]});
      throw error;
    }
    return {success:true,message:'OTP sent successfully',phoneNumber,resendAfterSeconds:config.otpResendSeconds};
  }
  async function verifyOtp(phoneNumber,otp,res,previousToken) {
    const status = Number(await redis.eval(VERIFY_SCRIPT,{keys:[`otp:${phoneKey(phoneNumber)}`],arguments:[digest(`${phoneNumber}:${otp}`),String(config.otpMaxAttempts)]}));
    if (status !== 1) throw new HttpError(400,status === -2 ? 'OTP_LOCKED' : 'INVALID_OTP',status === -2 ? 'Too many incorrect codes. Request a new OTP after the cooldown.' : 'Invalid or expired OTP. Please try again.');
    const token = crypto.randomBytes(32).toString('hex');
    const user = {phoneNumber};
    await redis.setEx(`session:${digest(token)}`,config.sessionTtlSeconds,JSON.stringify(user));
    if (validToken(previousToken)) await redis.del(`session:${digest(previousToken)}`);
    res.cookie(cookieName,token,{...cookieOptions,maxAge:config.sessionTtlSeconds*1000});
    return {success:true,message:'OTP verified successfully',user};
  }
  function validToken(token) { return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token); }
  async function getUser(token) {
    if (!validToken(token)) return null;
    const value = await redis.get(`session:${digest(token)}`);
    if (!value) return null;
    return JSON.parse(value);
  }
  async function attach(req,_res,next) {
    try { req.user = await getUser(req.cookies[cookieName]); }
    catch { throw new HttpError(503,'AUTH_UNAVAILABLE','Authentication is temporarily unavailable.'); }
    next();
  }
  function requireUser(req,_res,next) {
    if (!req.user) throw new HttpError(401,'AUTH_REQUIRED','Please log in to continue.');
    next();
  }
  async function logout(req,res) {
    const token = req.cookies[cookieName];
    if (validToken(token)) await redis.del(`session:${digest(token)}`);
    res.clearCookie(cookieName,cookieOptions);
    return {success:true};
  }
  return {sendOtp,verifyOtp,getUser,attach,requireUser,logout,cookieName};
}
function createSmsSender(config) {
  return async (phoneNumber,message) => {
    if (!config.textbeeDeviceId || !config.textbeeApiKey) throw new HttpError(503,'SMS_UNAVAILABLE','SMS login is not configured. Please try again later.');
    try {
      const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${encodeURIComponent(config.textbeeDeviceId)}/send-sms`,{
        method:'POST',headers:{'Content-Type':'application/json','x-api-key':config.textbeeApiKey},
        body:JSON.stringify({recipients:[phoneNumber],message}),signal:AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('SMS provider rejected request');
    } catch { throw new HttpError(502,'SMS_DELIVERY_FAILED','We could not send your code. Please try again shortly.'); }
  };
}
module.exports = {createAuth,createSmsSender,COOKIE_NAME,VERIFY_SCRIPT};
