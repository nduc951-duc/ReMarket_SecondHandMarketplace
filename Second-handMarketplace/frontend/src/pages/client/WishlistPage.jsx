import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartOff, MapPin } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { getWishlist, toggleWishlist } from '../../services/wishlistService';

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
}

function getProductImage(product) {
  return product?.image_url || product?.images?.[0] || '';
}

function WishlistSkeleton() {
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

function WishlistPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemovingId, setIsRemovingId] = useState('');
  const [error, setError] = useState('');

  const loadWishlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getWishlist({ limit: 50 });
      setItems((data.items || []).filter((item) => item.product));
    } catch (loadError) {
      setError(loadError.message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (productId) => {
    try {
      setIsRemovingId(productId);
      await toggleWishlist(productId);
      setItems((previous) => previous.filter((item) => item.product_id !== productId));
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setIsRemovingId('');
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/app" className="text-sm font-semibold text-slate-400 transition hover:text-cyan-200">
              Quay lại trang chủ
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white">Sản phẩm yêu thích</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Những tin bạn đã lưu để xem lại, so sánh giá hoặc nhắn người bán sau.
            </p>
          </div>
          <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
            {items.length} sản phẩm
          </span>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <WishlistSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-10 text-center shadow-xl shadow-slate-950/30">
            <HeartOff className="mx-auto text-slate-500" size={38} />
            <h3 className="mt-4 text-2xl font-black text-white">Chưa lưu sản phẩm nào</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Khi thấy một món đáng cân nhắc, bấm nút yêu thích để giữ lại ở đây.
            </p>
            <Link
              to="/app"
              className="mt-6 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              Xem sản phẩm
            </Link>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const product = item.product;
              const image = getProductImage(product);

              return (
                <article
                  key={item.product_id}
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
                    <Link to={`/products/${product.id}`} className="block">
                      <h3 className="line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-white hover:text-cyan-200">
                        {product.title}
                      </h3>
                    </Link>
                    <p className="text-xl font-black text-cyan-300">{formatCurrency(product.price)}</p>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <MapPin size={14} className="shrink-0 text-slate-500" />
                        {product.location || 'Chưa cập nhật'}
                      </span>
                      <span className="shrink-0">{product.category || 'Khác'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link
                        to={`/products/${product.id}`}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
                      >
                        Chi tiết
                      </Link>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                        onClick={() => handleRemove(item.product_id)}
                        disabled={isRemovingId === item.product_id}
                      >
                        {isRemovingId === item.product_id ? 'Đang bỏ...' : 'Bỏ lưu'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default WishlistPage;
