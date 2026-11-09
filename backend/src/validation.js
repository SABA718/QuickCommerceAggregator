const {z} = require('zod');
const {HttpError} = require('./errors');
const queryText = z.string().trim().min(1).max(120).refine(value => !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'Control characters are not allowed');
function normalizePhone(value) {
  const compact = value.replace(/[ ()-]/g, '');
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}
const phone = z.string().max(30).transform(normalizePhone).refine(value => value !== null, 'Use an international phone number or a 10 digit Indian mobile number');
const sendOtpSchema = z.object({phoneNumber:phone}).strict();
const verifyOtpSchema = z.object({phoneNumber:phone,otp:z.string().regex(/^\d{6}$/, 'OTP must have six digits')}).strict();
const searchSchema = z.object({query:queryText.optional(),q:queryText.optional()}).strict().refine(value => Boolean(value.query || value.q), 'Search query is required');
const cartSchema = z.object({items:z.array(queryText).min(1).max(20)}).strict();
const recipeSchema = z.object({dishName:queryText}).strict();
const listSchema = z.object({raw_list:z.string().trim().min(1).max(4000)}).strict();
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400,'VALIDATION_ERROR',result.error.issues.map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; '));
  return result.data;
}
module.exports = {parse,queryText,sendOtpSchema,verifyOtpSchema,searchSchema,cartSchema,recipeSchema,listSchema};
