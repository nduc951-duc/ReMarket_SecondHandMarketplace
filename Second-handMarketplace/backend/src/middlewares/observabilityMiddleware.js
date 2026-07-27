const logger = require('../services/logger');

function createObservabilityMiddleware({ log = logger, now = () => process.hrtime.bigint() } = {}) {
  return function observabilityMiddleware(req, res, next) {
    const startedAt = now();

    res.once('finish', () => {
      const durationMs = Number(now() - startedAt) / 1e6;
      log.info('http_request_completed', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl?.split('?')[0] || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      });
    });

    const originalEnd = res.end;
    res.end = function endWithResponseTime(...args) {
      if (!res.headersSent) {
        const durationMs = Number(now() - startedAt) / 1e6;
        res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      }
      return originalEnd.apply(this, args);
    };

    next();
  };
}

module.exports = {
  createObservabilityMiddleware,
  observabilityMiddleware: createObservabilityMiddleware(),
};
