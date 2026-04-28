const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL } = require('../config/env');

/**
 * Express middleware that verifies the Supabase access token
 * sent as a Bearer token in the Authorization header.
 *
 * On success it attaches `req.user` (the Supabase user object).
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      message: 'Thiếu hoặc sai định dạng Authorization header.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: 'Access token trống.',
    });
  }

  try {
    // Create a temporary Supabase client with the user's token
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(SUPABASE_URL, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        ok: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: error.message || 'Xác thực thất bại.',
    });
  }
}

/**
 * Optional auth middleware: attach req.user when a valid token is provided.
 * If no token is provided, continues without user.
 */
async function attachUserIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  if (!token) {
    return next();
  }

  try {
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(SUPABASE_URL, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: error.message || 'Xác thực thất bại.',
    });
  }
}

module.exports = { requireAuth, attachUserIfPresent };
