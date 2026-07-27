const { rateLimit } = require('express-rate-limit');
const {
  API_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  AUTH_EMAIL_RATE_LIMIT_MAX,
  AUTH_EMAIL_RATE_LIMIT_WINDOW_MS,
} = require('../config/env');

const apiRateLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  limit: API_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Qua nhieu yeu cau API. Vui long thu lai sau.',
    }),
});

const authEmailRateLimiter = rateLimit({
  windowMs: AUTH_EMAIL_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_EMAIL_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Qua nhieu yeu cau email. Vui long thu lai sau.',
    }),
});

Object.defineProperty(authEmailRateLimiter, 'name', {
  value: 'authEmailRateLimiter',
});
Object.defineProperty(apiRateLimiter, 'name', {
  value: 'apiRateLimiter',
});

module.exports = {
  apiRateLimiter,
  authEmailRateLimiter,
};
