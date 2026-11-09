class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function errorHandler(logger) {
  return (error, req, res, _next) => {
    const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    const code = error instanceof HttpError ? error.code : status === 400 ? 'INVALID_JSON' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
    const message = error instanceof HttpError ? error.message : status === 400 ? 'Request body must be valid JSON.' : status === 413 ? 'Request body is too large.' : 'Something went wrong. Please try again.';
    logger[status >= 500 ? 'error' : 'warn']({requestId:req.id,code,status}, 'request_failed');
    res.status(status).json({success:false,code,message,error:message,requestId:req.id});
  };
}
module.exports = {HttpError,errorHandler};
