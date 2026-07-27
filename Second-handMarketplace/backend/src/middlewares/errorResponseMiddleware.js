const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  501: 'NOT_IMPLEMENTED',
  503: 'SERVICE_UNAVAILABLE',
};

function normalizeErrorPayload(body, statusCode, requestId) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const existingError =
    source.error && typeof source.error === 'object' && !Array.isArray(source.error)
      ? source.error
      : {};
  const message =
    existingError.message ||
    source.message ||
    (statusCode >= 500 ? 'Internal server error' : 'Request failed');
  const code = existingError.code || source.code || STATUS_CODES[statusCode] || 'REQUEST_FAILED';

  return {
    ...source,
    ok: source.ok ?? false,
    success: false,
    message,
    error: {
      ...existingError,
      code,
      message,
      requestId,
    },
  };
}

function createErrorResponseMiddleware({ logger = console } = {}) {
  return function errorResponseMiddleware(req, res, next) {
    const sendJson = res.json.bind(res);

    res.json = function jsonWithStandardErrors(body) {
      if (res.statusCode < 400) {
        return sendJson(body);
      }

      const normalized = normalizeErrorPayload(body, res.statusCode, req.requestId);
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : 'warn',
        requestId: req.requestId,
        method: req.method,
        path: (req.originalUrl || req.url || '').split('?')[0],
        statusCode: res.statusCode,
        code: normalized.error.code,
        message: normalized.error.message,
      };

      const cause = res.locals.errorCause;
      if (cause?.stack && process.env.NODE_ENV !== 'production') {
        logEntry.stack = cause.stack;
      }

      const log = res.statusCode >= 500 ? logger.error : logger.warn;
      log.call(logger, JSON.stringify(logEntry));

      return sendJson(normalized);
    };

    next();
  };
}

module.exports = {
  createErrorResponseMiddleware,
  errorResponseMiddleware: createErrorResponseMiddleware(),
  normalizeErrorPayload,
};
