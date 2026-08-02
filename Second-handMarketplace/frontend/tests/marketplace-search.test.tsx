import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchResultsPage from '@/pages/client/SearchResultsPage';
import { ToastProvider } from '@/components/ui/toast';
import { getCategories } from '@/services/categoryService';
import { getProducts } from '@/services/productService';

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Điều hướng thử nghiệm" />,
}));

vi.mock('@/services/categoryService', () => ({
  getCategories: vi.fn(),
}));

vi.mock('@/services/productService', () => ({
  getProducts: vi.fn(),
}));

describe('SearchResultsPage', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue([{ id: 'electronics', name: 'Điện tử', count: 8 }]);
    vi.mocked(getProducts).mockResolvedValue({
      products: [],
      pagination: { total: 0 },
    });
  });

  it('loads products from the URL query and updates category filters', async () => {
    render(
      <MemoryRouter initialEntries={['/search?q=iphone']}>
        <Routes>
          <Route path="/search" element={<SearchResultsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'iphone', category: '' }),
      ),
    );

    const categorySelect = await screen.findByLabelText('Danh mục');
    fireEvent.change(categorySelect, { target: { value: 'Điện tử' } });

    await waitFor(() =>
      expect(getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'iphone', category: 'Điện tử' }),
      ),
    );
  });

  it('shows an actionable empty state', async () => {
    render(
      <MemoryRouter initialEntries={['/search?q=khong-co']}>
        <Routes>
          <Route path="/search" element={<SearchResultsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Chưa tìm thấy sản phẩm phù hợp' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();
  });

  it('labels fuzzy fallback results instead of presenting them as exact matches', async () => {
    vi.mocked(getProducts).mockResolvedValueOnce({
      products: [
        {
          id: 'camera-1',
          seller_id: 'seller-1',
          title: 'Camera Sony cũ',
          price: 4_500_000,
          status: 'active',
        },
      ],
      pagination: { total: 1, matchMode: 'fuzzy' },
    });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/search?q=camra']}>
          <Routes>
            <Route path="/search" element={<SearchResultsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(await screen.findByText(/Không có kết quả trùng hoàn toàn/i)).toBeInTheDocument();
    expect(screen.getByText('Camera Sony cũ')).toBeInTheDocument();
  });
});
