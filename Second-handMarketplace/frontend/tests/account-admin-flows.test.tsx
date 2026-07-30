import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/pages/auth/LoginPage';
import ModerationPage from '@/pages/admin/ModerationPage';
import { validateProfileForm } from '@/pages/client/ProfilePage';
import { loginWithEmail } from '@/services/authService';
import { getModerationReports, moderateReport } from '@/services/reportService';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Điều hướng thử nghiệm" />,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { errorMessage: string; user: null }) => unknown) =>
    selector({ errorMessage: '', user: null }),
}));

vi.mock('@/services/authService', () => ({
  AuthenticationError: class AuthenticationError extends Error {},
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock('@/services/reportService', () => ({
  getModerationReports: vi.fn(),
  moderateReport: vi.fn(),
}));

vi.mock('@/services/profileService', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock('@/services/reviewService', () => ({ getReviewsByUser: vi.fn() }));
vi.mock('@/services/transactionService', () => ({ getTransactionStats: vi.fn() }));

describe('account and moderation flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getModerationReports).mockResolvedValue([
      {
        id: 'report-1',
        reporter_id: 'reporter-1',
        target_type: 'product',
        product_id: 'product-1',
        reason: 'Sản phẩm giả mạo',
        details: 'Hình ảnh không khớp mô tả.',
        evidence_urls: ['https://example.com/evidence.png'],
        status: 'submitted',
        created_at: '2026-07-30T07:00:00.000Z',
      },
    ]);
    vi.mocked(moderateReport).mockResolvedValue({
      id: 'report-1',
      reporter_id: 'reporter-1',
      target_type: 'product',
      product_id: 'product-1',
      reason: 'Sản phẩm giả mạo',
      status: 'in_review',
    });
  });

  it('keeps invalid login credentials at the typed form boundary', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'email-sai' } });
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), {
      target: { value: 'ngắn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByText('Email không đúng định dạng.')).toBeInTheDocument();
    expect(loginWithEmail).not.toHaveBeenCalled();
  });

  it('validates profile fields before calling the API', () => {
    expect(
      validateProfileForm({
        full_name: 'A',
        phone: 'abc',
        address: 'Hà Nội',
        bio: 'Giới thiệu',
      }),
    ).toEqual(
      expect.objectContaining({
        full_name: expect.any(String),
        phone: expect.any(String),
      }),
    );
  });

  it('lets an agent accept a submitted moderation report', async () => {
    render(
      <MemoryRouter>
        <ModerationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Sản phẩm giả mạo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    fireEvent.change(screen.getByLabelText('Ghi chú xử lý'), {
      target: { value: 'Đã kiểm tra bằng chứng.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nhận xử lý' }));

    await waitFor(() =>
      expect(moderateReport).toHaveBeenCalledWith('report-1', {
        status: 'in_review',
        action: 'none',
        note: 'Đã kiểm tra bằng chứng.',
      }),
    );
  });
});
