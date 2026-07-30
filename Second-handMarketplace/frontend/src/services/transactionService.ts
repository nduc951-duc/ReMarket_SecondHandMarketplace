import type {
  PaymentMethod,
  Transaction,
  TransactionListResult,
  TransactionStats,
  TransactionStatus,
} from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

interface TransactionFilters {
  type?: 'buy' | 'sell';
  page?: number;
  limit?: number;
  status?: string;
}

interface CreateTransactionInput {
  product_id: string;
  product_name?: string;
  product_image?: string;
  amount?: number;
  payment_method: PaymentMethod | string;
  note?: string;
}

async function getAccessToken() {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập để tiếp tục.');
  return token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || 'Không thể xử lý giao dịch.');
  }
  return result.data as T;
}

export async function getTransactions(
  params: TransactionFilters = {},
): Promise<TransactionListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return request<TransactionListResult>(`/api/transactions?${query.toString()}`);
}

export function getTransactionById(transactionId: string): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${transactionId}`);
}

export function createTransaction(payload: CreateTransactionInput): Promise<Transaction> {
  return request<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  rejectionReason = '',
): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${transactionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejection_reason: rejectionReason }),
  });
}

export function getTransactionStats(): Promise<TransactionStats> {
  return request<TransactionStats>('/api/transactions/stats');
}
