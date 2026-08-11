import type {
  PaymentMethod,
  Transaction,
  TransactionListResult,
  TransactionStats,
  TransactionStatus,
} from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể xử lý giao dịch.',
  });
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
