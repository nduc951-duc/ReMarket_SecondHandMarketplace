import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';
const SESSION_CHECK_TIMEOUT_MS = 8000;
const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Thiếu cấu hình Supabase. Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env.';

interface AuthFeedback {
  message: string;
}

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface AuthApiResponse {
  message?: string;
}

export class AuthenticationError extends Error {
  code?: string;
  email?: string;
}

export function getLoginErrorMessage(message = '') {
  const normalized = String(message).trim().toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('user not found')
  ) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một chút rồi thử lại.';
  }

  return 'Không thể đăng nhập. Vui lòng thử lại.';
}

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }
  return supabase;
}

function backendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

async function parseResponse(response: Response, fallback: string): Promise<AuthFeedback> {
  const result = (await response.json().catch(() => ({}))) as AuthApiResponse;
  if (!response.ok) throw new Error(result.message || fallback);
  return { message: result.message || fallback };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

async function getAccessToken() {
  const client = ensureSupabase();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Bạn chưa đăng nhập.');
  return data.session.access_token;
}

export function isAuthAvailable() {
  return Boolean(isSupabaseConfigured && supabase);
}

export async function registerWithEmail(input: RegisterInput): Promise<AuthFeedback> {
  const response = await fetch(`${backendUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResponse(response, 'Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.');
}

export async function loginWithEmail({ email, password }: LoginInput) {
  const client = ensureSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    if (String(error.message).toLowerCase().includes('email not confirmed')) {
      const authError = new AuthenticationError(
        'Email chưa xác nhận. Vui lòng kiểm tra hộp thư trước khi đăng nhập.',
      );
      authError.code = 'EMAIL_NOT_CONFIRMED';
      authError.email = email;
      throw authError;
    }
    throw new Error(getLoginErrorMessage(error.message));
  }

  return { message: 'Đăng nhập thành công.', session: data.session };
}

export async function loginWithGoogle() {
  const client = ensureSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` },
  });
  if (error) throw new Error(error.message || 'Không thể đăng nhập với Google.');
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${backendUrl()}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(response, 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.');
}

export async function updatePassword(newPassword: string) {
  const client = ensureSupabase();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Cập nhật mật khẩu thất bại.');
  return { message: 'Mật khẩu mới đã được cập nhật.' };
}

export async function resendVerificationEmail(email: string) {
  const response = await fetch(`${backendUrl()}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(response, 'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.');
}

export async function changePassword(input: ChangePasswordInput) {
  const token = await getAccessToken();
  const response = await fetch(`${backendUrl()}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  return parseResponse(response, 'Đổi mật khẩu thành công.');
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    SESSION_CHECK_TIMEOUT_MS,
    'Kiểm tra phiên đăng nhập quá lâu. Vui lòng kiểm tra kết nối và thử lại.',
  );
  if (error) throw new Error(error.message || 'Không thể lấy phiên đăng nhập hiện tại.');
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { subscription: { unsubscribe: () => undefined } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

export async function logout() {
  const client = ensureSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message || 'Đăng xuất thất bại.');
}
