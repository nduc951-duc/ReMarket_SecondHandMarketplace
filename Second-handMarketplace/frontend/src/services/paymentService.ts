import type { PaymentMethod } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  orderInfo?: string;
  paymentMethod: Exclude<PaymentMethod, 'cod'> | string;
  notifyUrl?: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  payUrl?: string;
  paymentUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  [key: string]: unknown;
}

export async function createPayment(payload: CreatePaymentInput): Promise<CreatePaymentResult> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập để tạo thanh toán.');

  const response = await fetch(`${backendUrl}/api/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...payload,
      notifyUrl: payload.notifyUrl || `${backendUrl}/api/payment/ipn/${payload.paymentMethod}`,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    data?: CreatePaymentResult;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || 'Không thể tạo thanh toán.');
  }
  return result.data || {};
}
