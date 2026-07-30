import type { Report, ReportStatus } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export type ModerationAction = 'none' | 'warn' | 'hide_listing' | 'suspend_user';

export interface ModerateReportInput {
  status: Exclude<ReportStatus, 'submitted'>;
  action: ModerationAction;
  note: string;
}

async function getAccessToken() {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.access_token) throw new Error('Bạn cần đăng nhập để xử lý báo cáo.');
  return data.session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
  };
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý báo cáo.');
  return result.data as T;
}

export function createProductReport(
  productId: string,
  reason: string,
  details = '',
  evidenceUrls: string[] = [],
): Promise<Report> {
  return request<Report>('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      target_type: 'product',
      product_id: productId,
      reason,
      details,
      evidence_urls: evidenceUrls,
    }),
  });
}

export function getModerationReports(status = 'all'): Promise<Report[]> {
  const query = new URLSearchParams({ status, limit: '100' });
  return request<Report[]>(`/api/admin/reports?${query.toString()}`);
}

export function moderateReport(reportId: string, input: ModerateReportInput): Promise<Report> {
  return request<Report>(`/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
