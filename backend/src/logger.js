const pino = require('pino');
function createLogger(level = 'info') {
  return pino({level,redact:{paths:['password','token','otp','phoneNumber','authorization','cookie','req.headers.authorization','req.headers.cookie'],censor:'[REDACTED]'}});
}
module.exports = {createLogger};
