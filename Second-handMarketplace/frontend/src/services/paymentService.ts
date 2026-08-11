import type { PaymentMethod } from '@/types/domain';
import { apiRequest, getBackendUrl } from '@/services/apiClient';

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
  expiresAt?: string;
  [key: string]: unknown;
}

export interface VerifyPaymentReturnResult {
  isValid: boolean;
  status: 'success' | 'failed' | string;
  orderId?: string;
  responseCode?: string | number;
  processing?: { outcome?: string; replayed?: boolean } | null;
}

export async function createPayment(payload: CreatePaymentInput): Promise<CreatePaymentResult> {
  const backendUrl = getBackendUrl();
  return apiRequest<CreatePaymentResult>('/api/payment/create', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      ...payload,
      notifyUrl: payload.notifyUrl || `${backendUrl}/api/payment/ipn/${payload.paymentMethod}`,
    }),
    fallbackMessage: 'Không thể tạo thanh toán.',
  });
}

export async function verifyPaymentReturn(
  paymentMethod: string,
  searchParams: URLSearchParams,
): Promise<VerifyPaymentReturnResult> {
  return apiRequest<VerifyPaymentReturnResult>(
    `/api/payment/return/${encodeURIComponent(paymentMethod)}?${searchParams.toString()}`,
    { fallbackMessage: 'Không thể xác minh kết quả thanh toán.' },
  );
}
