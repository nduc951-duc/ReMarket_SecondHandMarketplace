const DEFAULT_BACKEND_URL = 'http://localhost:4000';

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function createPayment(payload) {
  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để tạo thanh toán.');
  }

  const response = await fetch(`${getBackendUrl()}/api/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({
      ...payload,
      notifyUrl: payload.notifyUrl || `${getBackendUrl()}/api/payment/ipn/${payload.paymentMethod}`,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể tạo thanh toán.');
  }

  return result.data;
}
