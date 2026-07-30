import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export interface ProfileUpdateInput {
  full_name: string;
  phone: string;
  address: string;
  bio: string;
}

async function getAccessToken() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Bạn chưa đăng nhập.');
  return data.session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
  };
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý hồ sơ.');
  return result.data as T;
}

export function getProfile(): Promise<Profile> {
  return request<Profile>('/api/profile');
}

export function updateProfile(input: ProfileUpdateInput): Promise<Profile> {
  return request<Profile>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(file: File): Promise<Profile> {
  const body = new FormData();
  body.append('avatar', file);
  return request<Profile>('/api/profile/avatar', { method: 'POST', body });
}
