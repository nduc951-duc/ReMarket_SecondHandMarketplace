import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/toast';
import WishlistPage from '@/pages/client/WishlistPage';
import { getWishlist, toggleWishlist } from '@/services/wishlistService';

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Điều hướng thử nghiệm" />,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'buyer-1' } }),
}));

vi.mock('@/services/wishlistService', () => ({
  getWishlist: vi.fn(),
  toggleWishlist: vi.fn(),
}));

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.mocked(getWishlist).mockResolvedValue({
      items: [
        {
          product_id: 'product-1',
          product: {
            id: 'product-1',
            seller_id: 'seller-1',
            title: 'Máy ảnh cũ còn tốt',
            price: 2500000,
            status: 'active',
            category: 'Điện tử',
            location: 'TP.HCM',
          },
        },
      ],
    });
    vi.mocked(toggleWishlist).mockResolvedValue({ wishlisted: false });
  });

  it('loads saved products and removes one after a successful toggle', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <WishlistPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Máy ảnh cũ còn tốt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ khỏi danh sách đã lưu' }));

    await waitFor(() => expect(toggleWishlist).toHaveBeenCalledWith('product-1'));
    await waitFor(() => expect(screen.queryByText('Máy ảnh cũ còn tốt')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Bạn chưa lưu sản phẩm nào' })).toBeInTheDocument();
  });
});
