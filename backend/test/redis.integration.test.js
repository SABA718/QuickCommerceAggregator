const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createClient} = require('redis');
const {createAuth} = require('../src/auth');
const {RATE_SCRIPT} = require('../src/rateLimit');
const {testConfig} = require('./helpers');

test('real Redis: atomic OTP consumption, attempt lockout, expiry, sessions and rate limit', {skip:!process.env.TEST_REDIS_URL},async()=>{
  const client=createClient({url:process.env.TEST_REDIS_URL});
  await client.connect();
  const prefix=`test:${crypto.randomUUID()}:`;
  const keys=new Set();
  const key=value=>{const k=prefix+value;keys.add(k);return k;};
  const redis={
    get:k=>client.get(key(k)),set:(k,v,o)=>client.set(key(k),v,o),setEx:(k,t,v)=>client.setEx(key(k),t,v),del:k=>client.del(key(k)),
    eval:(script,{keys:scriptKeys,arguments:args})=>client.eval(script,{keys:scriptKeys.map(key),arguments:args}),
  };
  let otp;
  const auth=createAuth({redis,config:testConfig(),sendSms:async(_phone,message)=>{otp=message.match(/\b\d{6}\b/)[0];}});
  const cookies=[];
  const response={cookie:(_name,token)=>cookies.push(token)};
  try {
    await auth.sendOtp('+919876543210');
    const attempts=await Promise.allSettled(Array.from({length:10},()=>auth.verifyOtp('+919876543210',otp,response)));
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1,'OTP must be consumed by exactly one concurrent verification');
    assert.deepEqual(await auth.getUser(cookies[0]),{phoneNumber:'+919876543210'});
    await auth.sendOtp('+919876543211');
    for(let i=0;i<5;i++) await assert.rejects(auth.verifyOtp('+919876543211','000000',response));
    await assert.rejects(auth.verifyOtp('+919876543211',otp,response),error=>error.code==='OTP_LOCKED');
    await auth.sendOtp('+919876543212');
    const hash=crypto.createHmac('sha256',testConfig().sessionSecret).update('phone:+919876543212').digest('hex');
    await client.pExpire(prefix+`otp:${hash}`,1);
    await new Promise(resolve=>setTimeout(resolve,10));
    await assert.rejects(auth.verifyOtp('+919876543212',otp,response));
    const results=await Promise.all(Array.from({length:20},()=>redis.eval(RATE_SCRIPT,{keys:['rate:test'],arguments:['60']})));
    assert.equal(Math.max(...results.map(value=>Number(value[0]))),20);
    assert.ok(await client.ttl(prefix+'rate:test')>0);
  } finally {
    if(keys.size) await client.del([...keys]);
    await client.quit();
  }
});
