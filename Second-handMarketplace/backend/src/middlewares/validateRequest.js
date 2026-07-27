const AppError = require('../errors/AppError');

function formatIssues(target, issues) {
  return issues.reduce((fields, issue) => {
    const path = [target, ...issue.path].join('.');
    fields[path] = [...(fields[path] || []), issue.message];
    return fields;
  }, {});
}

function validateRequest(schemas) {
  return function validateRequestMiddleware(req, _res, next) {
    const fields = {};

    for (const [target, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
        Object.assign(fields, formatIssues(target, result.error.issues));
        continue;
      }

      req[target] = result.data;
    }

    if (Object.keys(fields).length > 0) {
      return next(
        new AppError('Request validation failed', {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          fields,
        }),
      );
    }

    return next();
  };
}

module.exports = validateRequest;
