const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.access_token) throw new Error('Bạn cần đăng nhập để báo cáo.');
  return data.session.access_token;
}

async function fetchReports(path, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý báo cáo.');
  return result.data;
}

export function createProductReport(productId, reason, details = '', evidenceUrls = []) {
  return fetchReports('/api/reports', {
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

export function getModerationReports(status = 'all') {
  const query = new URLSearchParams({ status, limit: '100' });
  return fetchReports(`/api/admin/reports?${query.toString()}`);
}

export function moderateReport(reportId, payload) {
  return fetchReports(`/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
