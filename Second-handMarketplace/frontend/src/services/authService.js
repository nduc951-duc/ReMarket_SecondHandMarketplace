import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Thiếu cấu hình Supabase. Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env.';
const DEFAULT_BACKEND_URL = 'http://localhost:4000';

const EMPTY_AUTH_SUBSCRIPTION = {
  data: {
    subscription: {
      unsubscribe: () => {},
    },
  },
};

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }
}

function getSupabaseIfConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  return supabase;
}

/**
 * Get the current Supabase access token for authenticated API calls.
 */
async function getAccessToken() {
  ensureSupabase();

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Bạn chưa đăng nhập.');
  }

  return data.session.access_token;
}

export function isAuthAvailable() {
  return Boolean(getSupabaseIfConfigured());
}

export async function registerWithEmail({ fullName, email, password }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const response = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName,
      email,
      password,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Đăng ký thất bại.');
  }

  return {
    message: result.message || 'Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.',
    session: null,
  };
}

export async function loginWithEmail({ email, password }) {
  ensureSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message = String(error.message || '');
    if (message.toLowerCase().includes('email not confirmed')) {
      const err = new Error('Email chưa xác nhận. Vui lòng kiểm tra email và bấm link xác nhận trước.');
      err.code = 'EMAIL_NOT_CONFIRMED';
      err.email = email;
      throw err;
    }

    throw new Error(error.message || 'Đăng nhập thất bại.');
  }

  return {
    message: 'Đăng nhập thành công.',
    session: data.session,
  };
}

export async function loginWithGoogle() {
  ensureSupabase();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Không thể đăng nhập với Google.');
  }
}

export async function requestPasswordReset(email) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể gửi email đặt lại mật khẩu.');
  }

  return {
    message: result.message || 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.',
  };
}

export async function updatePassword(newPassword) {
  ensureSupabase();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message || 'Cập nhật mật khẩu thất bại.');
  }

  return {
    message: 'Mật khẩu mới đã được cập nhật thành công.',
  };
}

/**
 * Resend email verification for an unconfirmed user.
 */
export async function resendVerificationEmail(email) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const response = await fetch(`${backendUrl}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể gửi lại email xác nhận.');
  }

  return {
    message: result.message || 'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.',
  };
}

/**
 * Change password for the currently authenticated user.
 * Requires current password verification.
 */
export async function changePassword({ currentPassword, newPassword }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const token = await getAccessToken();

  const response = await fetch(`${backendUrl}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Đổi mật khẩu thất bại.');
  }

  return {
    message: result.message || 'Đổi mật khẩu thành công.',
  };
}

export async function getCurrentSession() {
  const client = getSupabaseIfConfigured();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Không thể lấy phiên đăng nhập hiện tại.');
  }

  return data.session;
}

export function onAuthStateChange(callback) {
  const client = getSupabaseIfConfigured();
  if (!client) {
    return EMPTY_AUTH_SUBSCRIPTION;
  }

  return client.auth.onAuthStateChange(callback);
}

export async function logout() {
  ensureSupabase();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Đăng xuất thất bại.');
  }
}
