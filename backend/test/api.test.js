const {test} = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {createApp} = require('../src/app');
const {createAuth,createSmsSender} = require('../src/auth');
const {loadConfig} = require('../src/config');
const {MemoryRedis,logger,testConfig} = require('./helpers');

function fixture(overrides = {}) {
  const config = testConfig();
  const redis = new MemoryRedis();
  const messages = [];
  const dependencies = {
    config,redis,logger,
    database:{health:async()=>{},saveCanonical:async()=>{}},
    catalog:{search:async(query,allowed)=>({isPending:false,results:[{name:query}],allowed}),cart:async(items)=>({isPending:false,items}),resolveProducts:async()=>({isPending:false,products:[]})},
    integrations:{normalize:async query=>query,parseList:async()=>({success:true,parsed_items:[{item:'milk',quantity:'1 litre'}]}),recipe:async()=>({ingredients:['milk'],category:'drink'})},
    sendSms:async(phone,message)=>messages.push({phone,message}),...overrides,
  };
  return {app:createApp(dependencies),messages,...dependencies};
}
const post = (app,path,body) => request(app).post(path).set('Origin','http://localhost:5173').send(body);
async function login(fixture,phoneNumber='+919876543210') {
  await post(fixture.app,'/api/auth/send-otp',{phoneNumber}).expect(200);
  const otp = fixture.messages.at(-1).message.match(/\b\d{6}\b/)[0];
  const verified = await post(fixture.app,'/api/auth/verify-otp',{phoneNumber,otp}).expect(200);
  return {cookie:verified.headers['set-cookie'][0].split(';')[0],otp};
}

test('OTP creates a restorable HttpOnly session, rejects replay, and logout revokes it',async()=>{
  const f = fixture();
  const {cookie,otp} = await login(f);
  assert.match(cookie,/dd_session=[a-f0-9]{64}/);
  const me = await request(f.app).get('/api/auth/me').set('Cookie',cookie).expect(200);
  assert.equal(me.body.user.phoneNumber,'+919876543210');
  await post(f.app,'/api/auth/verify-otp',{phoneNumber:'+919876543210',otp}).expect(400);
  await post(f.app,'/api/auth/logout',{}).set('Cookie',cookie).expect(200);
  const loggedOut = await request(f.app).get('/api/auth/me').set('Cookie',cookie).expect(200);
  assert.equal(loggedOut.body.user,null);
});

test('OTP is hashed, expires, has resend cooldown and locks after five wrong attempts',async()=>{
  const f = fixture();
  await post(f.app,'/api/auth/send-otp',{phoneNumber:'+919876543210'}).expect(200);
  const otp = f.messages[0].message.match(/\b\d{6}\b/)[0];
  const key = [...f.redis.values.keys()].find(key=>key.startsWith('otp:'));
  assert.ok(!f.redis.values.get(key).value.includes(otp));
  await post(f.app,'/api/auth/send-otp',{phoneNumber:'+919876543210'}).expect(429);
  for (let i=0;i<5;i++) await post(f.app,'/api/auth/verify-otp',{phoneNumber:'+919876543210',otp:'000000'}).expect(400);
  const locked = await post(f.app,'/api/auth/verify-otp',{phoneNumber:'+919876543210',otp}).expect(400);
  assert.equal(locked.body.code,'OTP_LOCKED');
  f.redis.values.get(key).expires=Date.now()-1;
  const expired=await post(f.app,'/api/auth/verify-otp',{phoneNumber:'+919876543210',otp}).expect(400);
  assert.equal(expired.body.code,'INVALID_OTP');
});

test('write APIs reject anonymous users, invalid origins, invalid JSON and oversize payloads',async()=>{
  const f = fixture();
  for (const path of ['/api/cart','/api/parse-list','/api/get-ingredients']) await post(f.app,path,{}).expect(401);
  await request(f.app).post('/api/auth/send-otp').send({phoneNumber:'+919876543210'}).expect(403);
  await request(f.app).post('/api/auth/send-otp').set('Origin','https://evil.example').send({phoneNumber:'+919876543210'}).expect(403);
  await request(f.app).post('/api/auth/send-otp').set('Origin',f.config.frontendUrl).set('Content-Type','application/json').send('{oops').expect(400);
  await post(f.app,'/api/auth/send-otp',{phoneNumber:'a'.repeat(20000)}).expect(413);
  const cors = await request(f.app).get('/api/auth/me').set('Origin','https://evil.example').expect(200);
  assert.equal(cors.headers['access-control-allow-origin'],undefined);
});

test('authenticated creation and validation use real handler contracts',async()=>{
  const f = fixture();
  const {cookie}=await login(f);
  await post(f.app,'/api/cart',{items:['milk','bread']}).set('Cookie',cookie).expect(200);
  await post(f.app,'/api/cart',{items:[{name:'milk'}]}).set('Cookie',cookie).expect(400);
  await post(f.app,'/api/cart',{items:Array(21).fill('milk')}).set('Cookie',cookie).expect(400);
  await post(f.app,'/api/parse-list',{raw_list:'milk 1l'}).set('Cookie',cookie).expect(200);
  await post(f.app,'/api/get-ingredients',{dishName:'tea'}).set('Cookie',cookie).expect(200);
  await request(f.app).get('/api/search?query[x]=milk').expect(400);
  await request(f.app).get('/api/search?query=milk').expect(200);
});

test('health reports failed dependency, unknown routes and exceptions are safe',async()=>{
  const f=fixture({database:{health:async()=>{throw new Error('secret-database-password');}}});
  const health=await request(f.app).get('/health').expect(503);
  assert.deepEqual(health.body.checks,{database:'unavailable',redis:'ok'});
  assert.ok(!JSON.stringify(health.body).includes('secret'));
  await request(f.app).get('/missing').expect(404);
  const healthy=fixture();
  const response=await request(healthy.app).get('/health').expect(200);
  assert.equal(response.headers['x-content-type-options'],'nosniff');
  assert.ok(response.headers['x-request-id']);
});

test('SMS failures never expose provider payloads and missing configuration is explicit',async()=>{
  const sender=createSmsSender({...testConfig(),textbeeDeviceId:undefined,textbeeApiKey:undefined});
  await assert.rejects(sender('+919876543210','test'),error=>error.status===503);
  const f=fixture({sendSms:sender});
  const response=await post(f.app,'/api/auth/send-otp',{phoneNumber:'+919876543210'}).expect(503);
  assert.equal(response.body.code,'SMS_UNAVAILABLE');
});

test('environment validator fails fast with names and requires production HTTPS',()=>{
  assert.throws(()=>loadConfig({}),/SUPABASE_URL/);
  assert.throws(()=>loadConfig({NODE_ENV:'production',FRONTEND_URL:'http://example.com',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'test',REDIS_URL:'redis://localhost',SESSION_SECRET:'x'.repeat(32)}),/HTTPS/);
  assert.throws(()=>loadConfig({FRONTEND_URL:'http://localhost:5173',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'test',REDIS_URL:'redis://localhost',SESSION_SECRET:'x'.repeat(32),AI_SERVICE_URL:'http://localhost:8000'}),/AI_SERVICE_TOKEN/);
});

test('authentication rejects forged session tokens',async()=>{
  const f=fixture();
  const response=await request(f.app).get('/api/auth/me').set('Cookie',`dd_session=${'a'.repeat(64)}`).expect(200);
  assert.equal(response.body.user,null);
  const auth=createAuth(f);
  assert.equal(await auth.getUser('bad'),null);
});

test('search rejects cross-site and sibling-site requests before invoking paid integrations',async()=>{
  let calls=0;
  const f=fixture({integrations:{normalize:async value=>{calls++;return value;}}});
  const {cookie}=await login(f);
  for(const site of ['cross-site','same-site']) {
    await request(f.app).get('/api/search?query=milk').set('Cookie',cookie).set('Sec-Fetch-Site',site).expect(403);
  }
  await request(f.app).get('/api/search?query=milk').set('Cookie',cookie).set('Origin','https://evil.example').expect(403);
  assert.equal(calls,0);
  await request(f.app).get('/api/search?query=milk').set('Cookie',cookie).set('Sec-Fetch-Site','same-origin').expect(200);
  assert.equal(calls,1);
});

test('production session uses host-bound secure cookie, rotates login and revokes logout',async()=>{
  const f=fixture({config:{...testConfig(),nodeEnv:'production'}});
  const first=await login(f);
  assert.match(first.cookie,/^__Host-dd_session=/);
  const key=[...f.redis.values.keys()].find(value=>value.startsWith('otp-cooldown:'));
  await f.redis.del(key);
  await post(f.app,'/api/auth/send-otp',{phoneNumber:'+919876543210'}).expect(200);
  const otp=f.messages.at(-1).message.match(/\b\d{6}\b/)[0];
  const verified=await post(f.app,'/api/auth/verify-otp',{phoneNumber:'+919876543210',otp}).set('Cookie',first.cookie).expect(200);
  const header=verified.headers['set-cookie'][0];
  for(const flag of ['HttpOnly','Secure','SameSite=Lax','Path=/']) assert.ok(header.includes(flag));
  assert.ok(!header.includes('Domain='));
  const old=await request(f.app).get('/api/auth/me').set('Cookie',first.cookie).expect(200);
  assert.equal(old.body.user,null);
  const cookie=header.split(';')[0];
  const current=await request(f.app).get('/api/auth/me').set('Cookie',cookie).expect(200);
  assert.equal(current.body.user.phoneNumber,'+919876543210');
  await post(f.app,'/api/auth/logout',{}).set('Cookie',cookie).expect(200);
  const expired=await request(f.app).get('/api/auth/me').set('Cookie',cookie).expect(200);
  assert.equal(expired.body.user,null);
});

test('auth rate limits cannot be bypassed by spoofing forwarding headers on direct API',async()=>{
  const f=fixture();
  for(let index=0;index<30;index++) {
    await post(f.app,'/api/auth/verify-otp',{}).set('X-Forwarded-For',`192.0.2.${index}`).expect(400);
  }
  const limited=await post(f.app,'/api/auth/verify-otp',{}).set('X-Forwarded-For','198.51.100.1').expect(429);
  assert.ok(Number(limited.headers['retry-after'])>0);
});

test('auth and write requests fail closed when Redis fails',async()=>{
  const f=fixture();
  const {cookie}=await login(f);
  f.redis.get=async()=>{throw new Error('secret-redis-url');};
  for(const path of ['/api/cart','/api/get-ingredients','/api/parse-list']) {
    const result=await post(f.app,path,{}).set('Cookie',cookie).expect(503);
    assert.ok(!JSON.stringify(result.body).includes('secret-redis-url'));
  }
});

test('production configuration accepts fixed proxy chain and rejects public keys or credential URLs',()=>{
  const base={NODE_ENV:'production',FRONTEND_URL:'https://example.com',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'sb_secret_test-only',REDIS_URL:'redis://redis:6379',SESSION_SECRET:'x'.repeat(32),TRUST_PROXY:'2'};
  assert.equal(loadConfig(base).trustProxy,2);
  assert.throws(()=>loadConfig({...base,TRUST_PROXY:'3'}),/TRUST_PROXY/);
  assert.throws(()=>loadConfig({...base,SUPABASE_KEY:'sb_publishable_test-only'}),/SUPABASE_KEY/);
  assert.throws(()=>loadConfig({...base,FRONTEND_URL:'https://user:password@example.com'}),/FRONTEND_URL/);
  assert.throws(()=>loadConfig({...base,SUPABASE_URL:'http://remote.example'}),/SUPABASE_URL/);
  assert.throws(()=>loadConfig({...base,AI_SERVICE_URL:'http://ai:8000',AI_SERVICE_TOKEN:base.SESSION_SECRET}),/AI_SERVICE_TOKEN/);
});

test('health fails promptly when the database does not respond',async()=>{
  const f=fixture({database:{health:()=>new Promise(()=>{})}});
  const started=Date.now();
  const response=await request(f.app).get('/health').expect(503);
  assert.equal(response.body.checks.database,'unavailable');
  assert.equal(response.body.checks.redis,'ok');
  assert.ok(Date.now()-started<4500);
});

test('AI list adapter preserves parsed items and rejects malformed upstream responses',async()=>{
  const {createIntegrations}=require('../src/integrations');
  const original=global.fetch;
  const config={...testConfig(),aiServiceUrl:'http://ai:8000',aiServiceToken:'internal-test-token-with-32-characters'};
  try {
    global.fetch=async (_url,options)=>{
      assert.equal(options.headers.Authorization,`Bearer ${config.aiServiceToken}`);
      return new Response(JSON.stringify({success:true,parsed_items:[{item:'milk',quantity:'1 litre'}]}),{status:200});
    };
    const integrations=createIntegrations(config,logger);
    const result=await integrations.parseList('milk 1 litre');
    assert.deepEqual(result.items,[{item:'milk',quantity:'1 litre'}]);
    global.fetch=async()=>new Response(JSON.stringify({success:true,parsed_items:[{item:'',quantity:'1'}]}),{status:200});
    await assert.rejects(integrations.parseList('milk'),error=>error.status===502 && error.code==='INVALID_AI_RESPONSE');
  } finally { global.fetch=original; }
});
