const { randomUUID } = require('node:crypto');

function requestContextMiddleware(req, res, next) {
  const requestId = `req_${randomUUID()}`;

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}

module.exports = requestContextMiddleware;
