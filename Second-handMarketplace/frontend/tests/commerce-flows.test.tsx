import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusBadge } from '@/components/ui';
import { validateProductForm } from '@/pages/client/ProductFormPage';
import TransactionHistoryPage from '@/pages/client/TransactionHistoryPage';
import {
  getTransactionStats,
  getTransactions,
  updateTransactionStatus,
} from '@/services/transactionService';

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Điều hướng thử nghiệm" />,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'buyer-1' } }),
}));

vi.mock('@/lib/supabaseClient', () => ({ supabase: null }));

vi.mock('@/services/transactionService', () => ({
  getTransactions: vi.fn(),
  getTransactionStats: vi.fn(),
  getTransactionById: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

vi.mock('@/services/reviewService', () => ({ createReview: vi.fn() }));

describe('commerce UI flows', () => {
  beforeEach(() => {
    vi.mocked(getTransactionStats).mockResolvedValue({
      totalBuy: 1,
      completedBuy: 0,
      totalSell: 0,
      completedSell: 0,
    });
    vi.mocked(getTransactions).mockResolvedValue({
      transactions: [
        {
          id: 'transaction-1',
          buyer_id: 'buyer-1',
          seller_id: 'seller-1',
          product_id: 'product-1',
          product_name: 'Máy ảnh Fujifilm cũ',
          amount: 4500000,
          status: 'shipped',
          payment_status: 'paid',
          created_at: '2026-07-29T10:00:00.000Z',
        },
      ],
      page: 1,
      totalPages: 1,
      total: 1,
    });
    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 'transaction-1',
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      product_id: 'product-1',
      amount: 4500000,
      status: 'completed',
    });
  });

  it('validates the typed product form at the API boundary', () => {
    expect(
      validateProductForm(
        {
          title: 'Ngắn',
          description: '',
          price: '-10',
          category: '',
          condition: 'good',
          location: '',
        },
        0,
      ),
    ).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        price: expect.any(String),
        category: expect.any(String),
        images: expect.any(String),
      }),
    );
  });

  it('maps transaction and payment states to Vietnamese labels', () => {
    render(
      <>
        <StatusBadge status="awaiting_payment" />
        <StatusBadge status="paid" />
        <StatusBadge status="refunded" />
      </>,
    );

    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
  });

  it('lets the buyer confirm receipt using the valid shipped-to-completed transition', async () => {
    render(
      <MemoryRouter>
        <TransactionHistoryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Máy ảnh Fujifilm cũ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Đã nhận hàng/i }));

    await waitFor(() =>
      expect(updateTransactionStatus).toHaveBeenCalledWith('transaction-1', 'completed', ''),
    );
  });
});
