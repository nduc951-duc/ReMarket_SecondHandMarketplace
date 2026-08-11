const LOCAL_BACKEND_URL = 'http://localhost:4000';
const DEFAULT_TIMEOUT_MS = 20_000;

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
  error?: { code?: string; message?: string };
  [key: string]: unknown;
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
  fallbackMessage?: string;
  timeoutMs?: number;
  unwrapData?: boolean;
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
}

export function getBackendUrl() {
  const configuredUrl = String(import.meta.env.VITE_BACKEND_URL || '').trim();
  if (!configuredUrl && import.meta.env.PROD) {
    throw new Error('Website chưa được cấu hình API. Vui lòng liên hệ quản trị viên.');
  }
  return (configuredUrl || LOCAL_BACKEND_URL).replace(/\/$/, '');
}

export async function getAccessToken(requiredMessage = 'Bạn cần đăng nhập để tiếp tục.') {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) throw new Error(requiredMessage);
  return token;
}

function parsePayload(text: string, contentType: string): ApiEnvelope<unknown> {
  if (!text) return {};
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      'Máy chủ trả về dữ liệu không hợp lệ. Hãy kiểm tra VITE_BACKEND_URL và thử lại.',
    );
  }
  try {
    return JSON.parse(text) as ApiEnvelope<unknown>;
  } catch {
    throw new Error('Máy chủ trả về JSON không hợp lệ. Vui lòng thử lại.');
  }
}

function networkMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Máy chủ phản hồi quá lâu. Nếu backend vừa khởi động, hãy đợi vài giây rồi thử lại.';
  }
  return 'Không thể kết nối máy chủ. Backend có thể đang khởi động; hãy đợi vài giây rồi thử lại.';
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    auth = false,
    fallbackMessage = 'Không thể xử lý yêu cầu.',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    unwrapData = true,
    ...init
  } = options;
  const method = String(init.method || 'GET').toUpperCase();
  const attempts = method === 'GET' ? 2 : 1;
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) headers.set('Authorization', `Bearer ${await getAccessToken()}`);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${getBackendUrl()}${path}`, {
        ...init,
        method,
        headers,
        signal: controller.signal,
      });
      const text = await response.text();
      const payload = parsePayload(
        text,
        response.headers.get('content-type') || '',
      ) as ApiEnvelope<T>;

      if (!response.ok) {
        if (attempt + 1 < attempts && response.status >= 500) {
          await wait(800);
          continue;
        }
        const error = new ApiError(payload.error?.message || payload.message || fallbackMessage);
        error.status = response.status;
        error.code = payload.error?.code;
        error.requestId = response.headers.get('x-request-id') || undefined;
        throw error;
      }

      return (
        unwrapData && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
      ) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const isNetworkFailure = error instanceof TypeError;
      if (!isAbort && !isNetworkFailure) throw error;
      if (attempt + 1 < attempts) {
        await wait(800);
        continue;
      }
      throw new Error(networkMessage(error));
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new Error(fallbackMessage);
}
