const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  SIGNUP_CONFIRM_PATH: process.env.SIGNUP_CONFIRM_PATH || '/login',
  RESET_PASSWORD_PATH: process.env.RESET_PASSWORD_PATH || '/reset-password',
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'ReMarket',
  MAIL_API_KEY: process.env.MAIL_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SIGNUP_COOLDOWN_SECONDS: Number(process.env.SIGNUP_COOLDOWN_SECONDS || 90),
  FORGOT_PASSWORD_COOLDOWN_SECONDS: Number(process.env.FORGOT_PASSWORD_COOLDOWN_SECONDS || 60),
};
