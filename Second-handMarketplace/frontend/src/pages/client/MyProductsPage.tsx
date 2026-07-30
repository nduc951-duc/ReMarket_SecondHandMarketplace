import { Edit3, Eye, EyeOff, PackageOpen, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { deleteProduct, getMyProducts, updateProduct } from '@/services/productService';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/domain';

const filters = [
  ['all', 'Tất cả'],
  ['active', 'Đang bán'],
  ['sold', 'Đã bán'],
  ['hidden', 'Đang ẩn'],
  ['banned', 'Bị khóa'],
] as const;

function productImage(product: Product) {
  return product.image_url || product.images?.[0] || '';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

function MyProductsPage() {
  const user = useAuthStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');
      const result = await getMyProducts({
        status: filter === 'all' ? undefined : filter,
        page: pagination.page,
        limit: 12,
      });
      setProducts(result.products || []);
      setPagination((current) => ({
        page: result.pagination?.page || current.page,
        totalPages: result.pagination?.totalPages || 1,
        total: result.pagination?.total || 0,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page, user]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const changeStatus = async (productId: string, status: string) => {
    try {
      setBusyId(productId);
      await updateProduct(productId, { status });
      await loadProducts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật sản phẩm.');
    } finally {
      setBusyId('');
    }
  };

  const hideProduct = async (productId: string) => {
    try {
      setBusyId(productId);
      await deleteProduct(productId);
      await loadProducts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể ẩn sản phẩm.');
    } finally {
      setBusyId('');
    }
  };

  if (!user) {
    return (
      <MarketplaceLayout className="grid min-h-[60vh] place-items-center">
        <EmptyState
          title="Bạn cần đăng nhập"
          description="Đăng nhập để xem và quản lý các tin đăng của mình."
          action={<Button render={<Link to="/login" />}>Đăng nhập</Button>}
        />
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Kho sản phẩm</p>
          <h1 className="mt-2 text-3xl font-bold">Sản phẩm của tôi</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Quản lý trạng thái hiển thị, chỉnh sửa thông tin và theo dõi toàn bộ tin đăng.
          </p>
        </div>
        <Button render={<Link to="/products/new" />}>
          <Plus className="size-4" />
          Đăng sản phẩm
        </Button>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        {filters.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            className="shrink-0"
            variant={filter === value ? 'default' : 'ghost'}
            onClick={() => {
              setFilter(value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
          >
            {label}
          </Button>
        ))}
      </nav>

      {error && (
        <ErrorState title="Không thể tải kho sản phẩm" description={error} onRetry={loadProducts} />
      )}

      {loading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-[410px] rounded-2xl" />
          ))}
        </section>
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Chưa có sản phẩm phù hợp"
          description={
            filter === 'all'
              ? 'Đăng sản phẩm đầu tiên để bắt đầu bán trên ReMarket.'
              : 'Không có sản phẩm nào ở trạng thái này.'
          }
          action={
            filter === 'all' ? (
              <Button render={<Link to="/products/new" />}>Đăng sản phẩm đầu tiên</Button>
            ) : null
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const image = productImage(product);
              const category =
                typeof product.category === 'string' ? product.category : product.category?.name;
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
                >
                  <Link to={`/products/${product.id}`} className="block aspect-[4/3] bg-muted">
                    {image ? (
                      <img src={image} alt={product.title} className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-sm text-muted-foreground">
                        Chưa có ảnh
                      </span>
                    )}
                  </Link>
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/products/${product.id}`} className="min-w-0">
                        <h2 className="line-clamp-2 font-semibold leading-6 hover:text-primary">
                          {product.title}
                        </h2>
                      </Link>
                      <StatusBadge status={product.status} className="shrink-0" />
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">{category || 'Chưa phân loại'}</p>
                    <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                      {product.status !== 'banned' && (
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link to={`/products/${product.id}/edit`} />}
                        >
                          <Edit3 className="size-4" />
                          Chỉnh sửa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link to={`/products/${product.id}`} />}
                      >
                        <Eye className="size-4" />
                        Xem tin
                      </Button>
                      {product.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === product.id}
                          onClick={() => void changeStatus(product.id, 'hidden')}
                        >
                          <EyeOff className="size-4" />
                          Tạm ẩn
                        </Button>
                      )}
                      {product.status === 'hidden' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === product.id}
                          onClick={() => void changeStatus(product.id, 'active')}
                        >
                          <Eye className="size-4" />
                          Hiển thị
                        </Button>
                      )}
                      {product.status !== 'banned' && product.status !== 'hidden' && (
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="ghost" disabled={busyId === product.id}>
                              <Trash2 className="size-4" />
                              Ẩn nhanh
                            </Button>
                          }
                          title="Ẩn sản phẩm?"
                          description={`“${product.title}” sẽ không còn hiển thị công khai.`}
                          confirmLabel="Ẩn sản phẩm"
                          destructive
                          onConfirm={() => hideProduct(product.id)}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="text-sm text-muted-foreground">{pagination.total} sản phẩm</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
              >
                Trước
              </Button>
              <span className="px-2 text-sm font-medium">
                {pagination.page}/{pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
              >
                Sau
              </Button>
            </div>
          </footer>
        </>
      )}
    </MarketplaceLayout>
  );
}

export default MyProductsPage;
