const AppError = require('../errors/AppError');

function notFoundHandler(req, _res, next) {
  next(
    new AppError(`Route ${req.method} ${req.originalUrl} not found`, {
      statusCode: 404,
      code: 'ROUTE_NOT_FOUND',
    }),
  );
}

function normalizeError(error) {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    Object.prototype.hasOwnProperty.call(error, 'body')
  ) {
    return new AppError('Invalid JSON payload', {
      statusCode: 400,
      code: 'INVALID_JSON',
    });
  }

  return error;
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);
  const statusCode = normalized.statusCode || normalized.status || 500;
  const code = normalized.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');
  const message =
    statusCode >= 500 && !normalized.expose ? 'Internal server error' : normalized.message;

  res.locals.errorCause = normalized;

  return res.status(statusCode).json({
    ok: false,
    success: false,
    message,
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(normalized.fields ? { fields: normalized.fields } : {}),
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  normalizeError,
};
