const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet').default;
const cookieParser = require('cookie-parser');
const {createAuth} = require('./auth');
const {HttpError,errorHandler} = require('./errors');
const {rateLimit} = require('./rateLimit');
const {parse,sendOtpSchema,verifyOtpSchema,searchSchema,cartSchema,recipeSchema,listSchema} = require('./validation');
const {buildLiveCart} = require('./recipe');

function createApp({config,redis,database,catalog,integrations,sendSms,logger}) {
  const app = express();
  const auth = createAuth({redis,config,sendSms});
  app.disable('x-powered-by');
  app.set('trust proxy',config.trustProxy);
  app.use(helmet());
  app.use((req,res,next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id',req.id);
    res.setHeader('Cache-Control','no-store');
    const started = Date.now();
    res.on('finish', () => logger.info({requestId:req.id,method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-started},'http_request'));
    next();
  });
  app.use(cors({origin:(origin,callback) => callback(null,!origin || origin === config.frontendUrl),credentials:true,methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type']}));
  app.use((req,_res,next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin !== config.frontendUrl) throw new HttpError(403,'ORIGIN_REJECTED','Request origin is not allowed.');
      if (!req.is('application/json')) throw new HttpError(415,'CONTENT_TYPE_REQUIRED','Use application/json for this request.');
    }
    next();
  });
  app.use(express.json({limit:'16kb',strict:true}));
  app.use(cookieParser());
  app.get(['/health','/api/health'], async (_req,res) => {
    const bounded = operation => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Health check timed out')), 3000);
      Promise.resolve().then(operation).then(resolve, reject).finally(() => clearTimeout(timer));
    });
    const checks = await Promise.allSettled([bounded(() => database.health()),bounded(() => redis.ping())]);
    const databaseReady = checks[0].status === 'fulfilled';
    const redisReady = checks[1].status === 'fulfilled';
    const ready = databaseReady && redisReady;
    res.status(ready ? 200 : 503).json({success:ready,status:ready ? 'ok' : 'unavailable',uptime:Math.floor(process.uptime()),checks:{database:databaseReady ? 'ok' : 'unavailable',redis:redisReady ? 'ok' : 'unavailable'}});
  });
  app.use('/api',auth.attach);
  const authIpLimit = rateLimit(redis,{name:'auth-ip',limit:30,windowSeconds:900});
  const writeLimit = rateLimit(redis,{name:'write-user',limit:60,windowSeconds:60,key:req => req.user.phoneNumber});
  const searchLimit = rateLimit(redis,{name:'search-ip',limit:90,windowSeconds:60});
  app.post('/api/auth/send-otp',authIpLimit,async (req,res,next) => {
    req.validatedBody = parse(sendOtpSchema,req.body);
    next();
  },rateLimit(redis,{name:'otp-phone',limit:5,windowSeconds:900,key:req => req.validatedBody.phoneNumber}),async (req,res) => {
    res.json(await auth.sendOtp(parse(sendOtpSchema,req.body).phoneNumber));
  });
  app.post('/api/auth/verify-otp',authIpLimit,async (req,res) => {
    const body = parse(verifyOtpSchema,req.body);
    res.json(await auth.verifyOtp(body.phoneNumber,body.otp,res,req.cookies[auth.cookieName]));
  });
  app.get('/api/auth/me',(req,res) => res.json({success:true,user:req.user || null}));
  app.post('/api/auth/logout',async (req,res) => res.json(await auth.logout(req,res)));
  app.get('/api/search',searchLimit,async (req,res) => {
    const origin = req.get('origin');
    const fetchSite = req.get('sec-fetch-site');
    if ((origin && origin !== config.frontendUrl) || (!origin && fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none')) {
      throw new HttpError(403,'ORIGIN_REJECTED','Request origin is not allowed.');
    }
    const query = parse(searchSchema,req.query);
    const raw = (query.query || query.q).toLowerCase().trim();
    // Anonymous cache lookups never spend on external AI or scraper services.
    let normalized = raw;
    if (req.user) {
      const cacheKey = `normalized:${crypto.createHash('sha256').update(raw).digest('hex')}`;
      const cached = await redis.get(cacheKey);
      normalized = cached || await integrations.normalize(raw);
      if (!cached) await redis.setEx(cacheKey,86400,normalized);
    }
    res.json(await catalog.search(normalized,Boolean(req.user)));
  });
  app.post('/api/cart',auth.requireUser,writeLimit,async (req,res) => {
    const {items} = parse(cartSchema,req.body);
    res.json(await catalog.cart(items));
  });
  app.post('/api/parse-list',auth.requireUser,writeLimit,rateLimit(redis,{name:'ai-list-user',limit:10,windowSeconds:300,key:req => req.user.phoneNumber}),async (req,res) => {
    const {raw_list} = parse(listSchema,req.body);
    res.json(await integrations.parseList(raw_list));
  });
  app.post('/api/get-ingredients',auth.requireUser,writeLimit,async (req,res) => {
    if (!req.user) throw new HttpError(401,'AUTH_REQUIRED','Please log in to continue.');
    const {dishName} = parse(recipeSchema,req.body);
    const key = `recipe:${crypto.createHash('sha256').update(dishName.toLowerCase()).digest('hex')}`;
    const cached = await redis.get(key);
    let recipe;
    if (cached) recipe = JSON.parse(cached);
    else {
      const locked = await redis.set(`${key}:lock`,'pending',{NX:true,EX:35});
      if (!locked) return res.json({success:true,isPending:true,message:'Preparing your ingredient list.',data:null});
      try {
        const aiBudget = await redis.set(`recipe-budget:${crypto.createHash('sha256').update(req.user.phoneNumber).digest('hex')}`,'1',{NX:true,EX:10});
        if (!aiBudget) throw new HttpError(429,'RECIPE_RATE_LIMITED','Please wait before generating another recipe.');
        recipe = await integrations.recipe(dishName);
        await database.saveCanonical(recipe.ingredients,recipe.category);
        await redis.setEx(key,86400,JSON.stringify(recipe));
      } finally { await redis.del(`${key}:lock`); }
    }
    const resolved = await catalog.resolveProducts(recipe.ingredients);
    const data = buildLiveCart(resolved.products);
    res.json({success:true,isPending:resolved.isPending,message:resolved.isPending ? 'Fetching current prices.' : undefined,data});
  });
  app.use((_req,_res,next) => next(new HttpError(404,'NOT_FOUND','This endpoint does not exist.')));
  app.use(errorHandler(logger));
  return app;
}
module.exports = {createApp};
