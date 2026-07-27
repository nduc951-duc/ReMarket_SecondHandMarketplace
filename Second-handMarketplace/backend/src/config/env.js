const dotenv = require('dotenv');

dotenv.config();

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  SIGNUP_CONFIRM_PATH: process.env.SIGNUP_CONFIRM_PATH || '/login',
  RESET_PASSWORD_PATH: process.env.RESET_PASSWORD_PATH || '/reset-password',
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: parseBoolean(process.env.SMTP_SECURE),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'ReMarket',
  MAIL_API_KEY: process.env.MAIL_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ADMIN_EMAILS: process.env.ADMIN_EMAILS || '',
  AGENT_EMAILS: process.env.AGENT_EMAILS || '',
  SIGNUP_COOLDOWN_SECONDS: Number(process.env.SIGNUP_COOLDOWN_SECONDS || 90),
  FORGOT_PASSWORD_COOLDOWN_SECONDS: Number(process.env.FORGOT_PASSWORD_COOLDOWN_SECONDS || 60),
  AUTH_EMAIL_RATE_LIMIT_WINDOW_MS: Number(
    process.env.AUTH_EMAIL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  ),
  AUTH_EMAIL_RATE_LIMIT_MAX: Number(process.env.AUTH_EMAIL_RATE_LIMIT_MAX || 10),
  API_RATE_LIMIT_WINDOW_MS: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  API_RATE_LIMIT_MAX: Number(process.env.API_RATE_LIMIT_MAX || 300),
  DEMO_READ_ONLY_ADMIN: parseBoolean(process.env.DEMO_READ_ONLY_ADMIN),
  READINESS_TIMEOUT_MS: Number(process.env.READINESS_TIMEOUT_MS || 3000),
};
