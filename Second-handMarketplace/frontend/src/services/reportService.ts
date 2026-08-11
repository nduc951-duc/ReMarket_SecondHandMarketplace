import type { Report, ReportStatus } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

export type ModerationAction = 'none' | 'warn' | 'hide_listing' | 'suspend_user';

export interface ModerateReportInput {
  status: Exclude<ReportStatus, 'submitted'>;
  action: ModerationAction;
  note: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể xử lý báo cáo.',
  });
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
