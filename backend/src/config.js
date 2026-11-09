const { z } = require('zod');

const httpUrl = z.url().refine(value => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
}, 'must be an HTTP(S) URL without credentials, query or fragment');
const optionalString = z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional());
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_URL: httpUrl.refine(value => URL.canParse(value) && new URL(value).pathname === '/', 'must be an origin without a path'),
  SUPABASE_URL: httpUrl,
  SUPABASE_KEY: z.string().min(1),
  REDIS_URL: z.url().refine(value => URL.canParse(value) && ['redis:', 'rediss:'].includes(new URL(value).protocol), 'must use redis:// or rediss://'),
  SESSION_SECRET: z.string().min(32),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  OTP_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
  OTP_RESEND_SECONDS: z.coerce.number().int().min(15).max(300).default(30),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(2592000).default(604800),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(21600).default(21600),
  NEGATIVE_CACHE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  SCRAPE_TIMEOUT_SECONDS: z.coerce.number().int().min(10).max(180).default(90),
  TEXTBEE_DEVICE_ID: optionalString,
  TEXTBEE_API_KEY: optionalString,
  GROQ_API_KEY: optionalString,
  GROQ_MODEL: z.string().min(1).default('llama-3.3-70b-versatile'),
  APIFY_TOKEN: optionalString,
  APIFY_ACTOR_ID: z.string().min(1).default('zangscraper/blinkit-zepto-apify-actor'),
  AI_SERVICE_URL: z.preprocess(value => value === '' ? undefined : value, httpUrl.optional()),
  AI_SERVICE_TOKEN: z.preprocess(value => value === '' ? undefined : value, z.string().min(32).optional()),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
}).superRefine((value, ctx) => {
  if (!URL.canParse(value.FRONTEND_URL) || !URL.canParse(value.SUPABASE_URL)) return;
  if (value.NODE_ENV === 'production' && new URL(value.FRONTEND_URL).protocol !== 'https:') {
    ctx.addIssue({code:'custom',path:['FRONTEND_URL'],message:'must use HTTPS in production'});
  }
  const databaseUrl = new URL(value.SUPABASE_URL);
  if (databaseUrl.pathname !== '/' || (databaseUrl.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(databaseUrl.hostname))) {
    ctx.addIssue({code:'custom',path:['SUPABASE_URL'],message:'must be an HTTPS origin (HTTP allowed only on loopback)'});
  }
  if (value.NODE_ENV === 'production') {
    let serviceRole = false;
    try { serviceRole = JSON.parse(Buffer.from(value.SUPABASE_KEY.split('.')[1], 'base64url').toString()).role === 'service_role'; }
    catch { /* Supabase also supports opaque server secret keys. */ }
    if (!value.SUPABASE_KEY.startsWith('sb_secret_') && !serviceRole) {
      ctx.addIssue({code:'custom',path:['SUPABASE_KEY'],message:'must be a server-only Supabase secret or service_role key'});
    }
    if (value.AI_SERVICE_TOKEN === value.SESSION_SECRET) {
      ctx.addIssue({code:'custom',path:['AI_SERVICE_TOKEN'],message:'must differ from SESSION_SECRET'});
    }
  }
  for (const [first, second] of [['TEXTBEE_DEVICE_ID','TEXTBEE_API_KEY'], ['AI_SERVICE_URL','AI_SERVICE_TOKEN']]) {
    if (Boolean(value[first]) !== Boolean(value[second])) {
      ctx.addIssue({code:'custom',path:[first],message:`must be configured together with ${second}`});
    }
  }
});

function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  const e = parsed.data;
  return {
    nodeEnv:e.NODE_ENV,port:e.PORT,frontendUrl:new URL(e.FRONTEND_URL).origin,
    supabaseUrl:e.SUPABASE_URL,supabaseKey:e.SUPABASE_KEY,redisUrl:e.REDIS_URL,
    sessionSecret:e.SESSION_SECRET,trustProxy:e.TRUST_PROXY,otpExpirySeconds:e.OTP_EXPIRY_SECONDS,
    otpResendSeconds:e.OTP_RESEND_SECONDS,otpMaxAttempts:e.OTP_MAX_ATTEMPTS,sessionTtlSeconds:e.SESSION_TTL_SECONDS,
    cacheTtlSeconds:e.CACHE_TTL_SECONDS,negativeCacheSeconds:e.NEGATIVE_CACHE_SECONDS,scrapeTimeoutSeconds:e.SCRAPE_TIMEOUT_SECONDS,
    textbeeDeviceId:e.TEXTBEE_DEVICE_ID,textbeeApiKey:e.TEXTBEE_API_KEY,groqApiKey:e.GROQ_API_KEY,groqModel:e.GROQ_MODEL,
    apifyToken:e.APIFY_TOKEN,apifyActorId:e.APIFY_ACTOR_ID,aiServiceUrl:e.AI_SERVICE_URL,aiServiceToken:e.AI_SERVICE_TOKEN,logLevel:e.LOG_LEVEL,
  };
}
module.exports = {loadConfig};
