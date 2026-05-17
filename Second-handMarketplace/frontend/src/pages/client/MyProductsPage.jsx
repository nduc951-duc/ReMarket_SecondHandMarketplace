import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, EyeOff, PackageOpen, Plus, Trash2 } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { getMyProducts, updateProduct, deleteProduct } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const statusLabels = {
  active: { label: 'Đang bán', className: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200' },
  sold: { label: 'Đã bán', className: 'border-sky-300/25 bg-sky-400/10 text-sky-200' },
  hidden: { label: 'Đang ẩn', className: 'border-amber-300/25 bg-amber-400/10 text-amber-200' },
  banned: { label: 'Bị khóa', className: 'border-rose-300/25 bg-rose-400/10 text-rose-200' },
};
const MY_PRODUCTS_CACHE_TTL = 5 * 60 * 1000;

function getProductImage(product) {
  return product.image_url || product.images?.[0] || '';
}

function getCacheKey(userId, status, page) {
  return `remarket_my_products_${userId || 'guest'}_${status}_${page}`;
}

function readCache(key) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!cached || Date.now() - cached.savedAt > MY_PRODUCTS_CACHE_TTL) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeCache(key, payload) {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      ...payload,
      savedAt: Date.now(),
    }));
  } catch {
    // Cache is only a UX enhancement.
  }
}

function clearMyProductsCache(userId) {
  try {
    const prefix = `remarket_my_products_${userId || 'guest'}_`;
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore cache cleanup failures.
  }
}

function MyProductSkeletonGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <div className="aspect-[4/3] animate-pulse bg-white/10" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-1/2 animate-pulse rounded-full bg-cyan-300/15" />
            <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          </div>
        </article>
      ))}
    </section>
  );
}

function MyProductsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const loadProducts = useCallback(async () => {
    const cacheKey = getCacheKey(user?.id, filterStatus, pagination.page);
    const cached = readCache(cacheKey);
    if (cached) {
      setProducts(cached.products || []);
      setPagination(cached.pagination || { page: 1, totalPages: 0, total: 0 });
      setLoading(false);
    }

    try {
      if (!cached) setLoading(true);
      setError('');
      const result = await getMyProducts({
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: pagination.page,
        limit: 12,
      });
      const nextProducts = result.products || [];
      const nextPagination = result.pagination || { page: 1, totalPages: 0, total: 0 };
      setProducts(nextProducts);
      setPagination(nextPagination);
      writeCache(cacheKey, { products: nextProducts, pagination: nextPagination });
    } catch (err) {
      if (!cached) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, pagination.page, user?.id]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [loadProducts, user]);

  const handleStatusChange = async (productId, newStatus) => {
    try {
      await updateProduct(productId, { status: newStatus });
      clearMyProductsCache(user?.id);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(productToDelete.id);
      clearMyProductsCache(user?.id);
      await loadProducts();
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);

  if (!user) {
    return (
      <main className="min-h-screen bg-transparent text-slate-200">
        <Navbar />
        <section className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center">
          <h2 className="text-2xl font-black text-white">Bạn cần đăng nhập</h2>
          <p className="mt-2 text-slate-400">Vui lòng đăng nhập để xem sản phẩm của bạn.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/app" className="text-sm font-semibold text-slate-400 transition hover:text-cyan-200">
              Quay lại trang chủ
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white">Sản phẩm của tôi</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Theo dõi tin đang bán, chỉnh sửa thông tin và ẩn sản phẩm khi không còn phù hợp.
            </p>
          </div>
          <Link
            to="/products/new"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            <Plus size={18} />
            Đăng sản phẩm
          </Link>
        </header>

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Đang bán' },
              { value: 'sold', label: 'Đã bán' },
              { value: 'hidden', label: 'Đang ẩn' },
              { value: 'banned', label: 'Bị khóa' },
            ].map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => {
                  setFilterStatus(status.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={[
                  'rounded-full px-4 py-2 text-sm font-bold transition',
                  filterStatus === status.value
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]',
                ].join(' ')}
              >
                {status.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <MyProductSkeletonGrid />
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-10 text-center shadow-xl shadow-slate-950/30">
            <PackageOpen className="mx-auto text-slate-500" size={42} />
            <h3 className="mt-4 text-2xl font-black text-white">Chưa có sản phẩm</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {filterStatus === 'all'
                ? 'Bạn chưa đăng sản phẩm nào.'
                : 'Không có sản phẩm nào trong trạng thái này.'}
            </p>
            <Link
              to="/products/new"
              className="mt-6 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              Đăng sản phẩm đầu tiên
            </Link>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const image = getProductImage(product);
                const status = statusLabels[product.status] || statusLabels.active;

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-lg shadow-slate-950/25 transition hover:-translate-y-1 hover:border-cyan-300/35"
                  >
                    <Link to={`/products/${product.id}`} className="block aspect-[4/3] overflow-hidden bg-slate-900">
                      {image ? (
                        <img src={image} alt={product.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                          Chưa có ảnh
                        </div>
                      )}
                    </Link>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/products/${product.id}`} className="block min-w-0">
                          <h3 className="line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-white hover:text-cyan-200">
                            {product.title}
                          </h3>
                        </Link>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="text-xl font-black text-cyan-300">{formatCurrency(product.price)}</p>
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>{product.category || 'Chưa phân loại'}</span>
                        <span>{formatDate(product.created_at)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {product.status !== 'banned' && (
                          <Link
                            to={`/products/${product.id}/edit`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
                          >
                            <Edit3 size={15} />
                            Sửa
                          </Link>
                        )}

                        <Link
                          to={`/products/${product.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          <Eye size={15} />
                          Xem
                        </Link>

                        {product.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(product.id, 'hidden')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20"
                          >
                            <EyeOff size={15} />
                            Ẩn
                          </button>
                        )}

                        {product.status === 'hidden' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(product.id, 'active')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                          >
                            <Eye size={15} />
                            Hiện
                          </button>
                        )}

                        {product.status !== 'banned' && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductToDelete(product);
                              setShowDeleteModal(true);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20"
                          >
                            <Trash2 size={15} />
                            Ẩn nhanh
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {pagination.totalPages > 1 && (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>

                <span className="text-sm font-semibold text-slate-400">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}

            <p className="mt-5 text-center text-sm text-slate-500">Tổng: {pagination.total} sản phẩm</p>
          </>
        )}

        {showDeleteModal && productToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-xl font-black text-white">Ẩn sản phẩm?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Sản phẩm <span className="font-bold text-slate-200">{productToDelete.title}</span> sẽ không còn hiển thị công khai.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white"
                >
                  Ẩn sản phẩm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default MyProductsPage;
