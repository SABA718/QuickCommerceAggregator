const {loadConfig} = require('../src/config');
class MemoryRedis {
  constructor() { this.values = new Map(); }
  async get(key) {
    const entry = this.values.get(key);
    if (!entry || entry.expires <= Date.now()) { this.values.delete(key); return null; }
    return entry.value;
  }
  async set(key,value,options = {}) {
    if (options.NX && await this.get(key)) return null;
    this.values.set(key,{value,expires:options.EX ? Date.now()+options.EX*1000 : Infinity});
    return 'OK';
  }
  async setEx(key,ttl,value) { return this.set(key,value,{EX:ttl}); }
  async del(key) { return this.values.delete(key) ? 1 : 0; }
  async ping() { return 'PONG'; }
  async eval(script,{keys,arguments:args}) {
    const key = keys[0];
    if (script.includes('-- rate_limit')) {
      const value = Number(await this.get(key) || 0)+1;
      const expires = this.values.get(key)?.expires || Date.now()+Number(args[0])*1000;
      this.values.set(key,{value:String(value),expires});
      return [value,Math.ceil((expires-Date.now())/1000)];
    }
    if (script.includes('-- verify_otp')) {
      const raw = await this.get(key);
      if (!raw) return 0;
      const record = JSON.parse(raw);
      if (record.attempts >= Number(args[1])) return -2;
      if (record.hash !== args[0]) {
        record.attempts++;
        this.values.get(key).value = JSON.stringify(record);
        return record.attempts >= Number(args[1]) ? -2 : -1;
      }
      await this.del(key);
      return 1;
    }
    if (await this.get(key) === args[0]) return this.del(key);
    return 0;
  }
}
const logger = {info(){},warn(){},error(){},fatal(){}};
function testConfig() {
  return loadConfig({NODE_ENV:'test',FRONTEND_URL:'http://localhost:5173',SUPABASE_URL:'https://example.supabase.co',SUPABASE_KEY:'test-service-key',REDIS_URL:'redis://localhost:6379',SESSION_SECRET:'test-secret-that-is-longer-than-32-characters'});
}
module.exports = {MemoryRedis,logger,testConfig};
