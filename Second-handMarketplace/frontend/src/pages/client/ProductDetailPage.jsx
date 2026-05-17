import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProductById, getProducts } from '../../services/productService';
import { createPayment } from '../../services/paymentService';
import { getReviewsByUser } from '../../services/reviewService';
import { createTransaction } from '../../services/transactionService';
import { getWishlistStatus, toggleWishlist } from '../../services/wishlistService';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { Heart, MessageSquare, ShoppingCart, ShieldCheck, CheckCircle, Truck, MapPin, X, ArrowLeft, Star } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Tiền mặt khi nhận hàng (COD)' },
  { value: 'momo', label: 'Ví MoMo' },
  { value: 'vnpay', label: 'VNPAY' },
];

const CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Cũ',
};
const PRODUCT_CACHE_TTL = 5 * 60 * 1000;

function getProductImages(product) {
  return [
    product?.image_url,
    ...(Array.isArray(product?.images) ? product.images : []),
  ].filter(Boolean);
}

function readProductCache(productId) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(`remarket_product_${productId}`) || 'null');
    if (!cached || Date.now() - cached.savedAt > PRODUCT_CACHE_TTL) {
      return null;
    }
    return cached.product || null;
  } catch {
    return null;
  }
}

function writeProductCache(productId, product) {
  try {
    sessionStorage.setItem(`remarket_product_${productId}`, JSON.stringify({
      product,
      savedAt: Date.now(),
    }));
  } catch {
    // Cache is only a UX enhancement.
  }
}

function ProductDetailSkeleton() {
  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Helmet><title>Đang tải sản phẩm | ReMarket</title></Helmet>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        <div className="mb-6 h-10 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full lg:w-[55%]">
            <div className="aspect-[4/3] animate-pulse rounded-3xl border border-white/5 bg-white/10 sm:aspect-square" />
          </div>
          <div className="w-full space-y-5 lg:w-[45%]">
            <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 md:p-8">
              <div className="mb-5 h-7 w-28 animate-pulse rounded-full bg-cyan-300/15" />
              <div className="mb-4 h-9 w-4/5 animate-pulse rounded-full bg-white/10" />
              <div className="mb-8 h-10 w-1/2 animate-pulse rounded-full bg-cyan-300/15" />
              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
                <div className="h-14 animate-pulse rounded-2xl bg-cyan-300/15" />
              </div>
            </div>
            <div className="h-28 animate-pulse rounded-3xl border border-white/5 bg-white/10" />
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0 });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const viewKeyRef = useRef('');

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderNote, setOrderNote] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState({ type: '', message: '' });

  const loadProduct = useCallback(async () => {
    const cachedProduct = readProductCache(id);
    if (cachedProduct) {
      setProduct(cachedProduct);
      setSelectedImage(0);
      setIsLoading(false);
    }

    try {
      if (!cachedProduct) setIsLoading(true);
      setError('');
      const viewKey = `viewed_product_${id}`;
      const alreadyViewed = sessionStorage.getItem(viewKey) === '1';
      if (!alreadyViewed) {
        sessionStorage.setItem(viewKey, '1');
      }

      viewKeyRef.current = viewKey;
      const data = await getProductById(id, { skipView: alreadyViewed });
      setProduct(data);
      writeProductCache(id, data);
      setSelectedImage(0);
      setIsLoading(false);

      const sideLoads = [];

      if (user) {
        sideLoads.push(
          getWishlistStatus(id)
            .then((status) => setWishlisted(status))
            .catch(() => setWishlisted(false)),
        );
      } else {
        setWishlisted(false);
      }

      if (data.seller_id) {
        setIsLoadingReviews(true);
        sideLoads.push(
          getReviewsByUser(data.seller_id, { limit: 6 })
            .then((reviewData) => {
              setSellerReviews(reviewData.reviews || []);
              setReviewMeta({ total: reviewData.total || 0 });
            })
            .catch(() => {
              setSellerReviews([]);
              setReviewMeta({ total: 0 });
            })
            .finally(() => setIsLoadingReviews(false)),
        );
      } else {
        setSellerReviews([]);
        setReviewMeta({ total: 0 });
      }

      // Load related products (same category)
      if (data.category) {
        sideLoads.push(
          getProducts({
            category: data.category,
            limit: 4,
          })
            .then((related) => {
              setRelatedProducts(
                (related.products || []).filter((p) => p.id !== id).slice(0, 4),
              );
            })
            .catch(() => {
              // Silently fail for related products.
            }),
        );
      }

      await Promise.allSettled(sideLoads);
    } catch (err) {
      if (!cachedProduct) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleOrder = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      setIsOrdering(true);
      setOrderFeedback({ type: '', message: '' });

      const transaction = await createTransaction({
        product_id: id,
        payment_method: paymentMethod,
        note: orderNote,
      });

      if (['momo', 'vnpay'].includes(paymentMethod)) {
        const payment = await createPayment({
          orderId: transaction.id,
          amount: transaction.amount || product.price,
          orderInfo: `Thanh toán đơn hàng ${transaction.id}`,
          returnUrl: `${window.location.origin}/transactions`,
          paymentMethod,
        });

        if (!payment.paymentUrl) {
          throw new Error('Cổng thanh toán chưa trả về đường dẫn thanh toán.');
        }

        window.location.href = payment.paymentUrl;
        return;
      }

      setOrderFeedback({
        type: 'success',
        message: 'Đặt hàng thành công! Người bán sẽ xác nhận đơn hàng của bạn.',
      });

      setTimeout(() => {
        setShowOrderModal(false);
        navigate('/transactions');
      }, 2000);
    } catch (err) {
      setOrderFeedback({ type: 'error', message: err.message });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      setIsWishlistLoading(true);
      const result = await toggleWishlist(id);
      setWishlisted(Boolean(result.wishlisted));
    } catch (wishlistError) {
      setError(wishlistError.message);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const renderStars = (rating) => {
    const normalized = Math.max(0, Math.min(5, Number(rating) || 0));
    const rounded = Math.round(normalized);

    return (
      <span className="star-rating" aria-label={`${normalized.toFixed(1)} sao`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={`star-btn ${index < rounded ? 'active' : ''}`}>
            ★
          </span>
        ))}
      </span>
    );
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const isOwner = user && product && product.seller_id === user.id;
  const productImages = getProductImages(product);
  const pageTitle = product ? `${product.title} | ReMarket` : 'Chi tiet san pham | ReMarket';
  const pageDescription = product?.description
    ? product.description.slice(0, 160)
    : 'Xem chi tiet san pham do cu tren ReMarket.';
  const canonicalUrl = `${window.location.origin}/products/${id}`;

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-transparent text-slate-200">
        <Helmet>
          <title>Không tìm thấy sản phẩm | ReMarket</title>
          <meta name="description" content="Sản phẩm không tồn tại hoặc đã bị ẩn." />
        </Helmet>
        <div className="mx-auto w-full max-w-5xl px-4 py-12 flex justify-center">
          <div className="flex flex-col items-center text-center p-12 bg-[#111827] rounded-3xl border border-white/5 shadow-2xl max-w-lg">
            <span className="text-6xl mb-6">😔</span>
            <h3 className="text-2xl font-bold text-white mb-3">Không tìm thấy sản phẩm</h3>
            <p className="text-slate-400 mb-8">{error || 'Sản phẩm không tồn tại hoặc đã bị ẩn.'}</p>
            <Link to="/app" className="bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 font-bold px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(0,212,180,0.4)] transition-all">
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        {productImages[0] && <meta property="og:image" content={productImages[0]} />}
      </Helmet>
      
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        {/* Back */}
        <div className="mb-6">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors font-medium">
            <ArrowLeft size={18} />
            Quay lại
          </Link>
        </div>

        {/* Product Detail Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT: Image Gallery */}
          <div className="w-full lg:w-[55%] flex flex-col gap-4">
            <div className="aspect-[4/3] sm:aspect-square rounded-3xl bg-[#0d1117] border border-white/5 overflow-hidden relative flex items-center justify-center shadow-lg">
              {productImages.length > 0 ? (
                <img src={productImages[selectedImage] || productImages[0]} alt={product.title} className="w-full h-full object-contain" />
              ) : (
                <div className="text-6xl opacity-50">📷</div>
              )}
            </div>
            {productImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-center",
                      idx === selectedImage ? "border-teal-400 opacity-100 shadow-[0_0_15px_rgba(0,212,180,0.3)]" : "border-transparent opacity-50 hover:opacity-100 bg-[#0d1117]"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Info */}
          <div className="w-full lg:w-[45%] flex flex-col gap-6">
            <div className="bg-[#111827] rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none" />
              
              {product.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-400/10 px-3 py-1.5 rounded-full border border-teal-400/20 mb-4 inline-block">
                  {product.category}
                </span>
              )}
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-snug mb-3">
                {product.title}
              </h1>
              <p className="text-3xl md:text-4xl font-bold text-teal-400 mb-6 drop-shadow-[0_0_15px_rgba(0,212,180,0.2)]">
                {formatCurrency(product.price)}
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 mb-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
                  <CheckCircle size={16} className="text-teal-400" />
                  Đã kiểm duyệt
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
                  <ShieldCheck size={16} className="text-teal-400" />
                  Giao dịch an toàn
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium">
                  <Truck size={16} className="text-teal-400" />
                  Hỗ trợ ship COD
                </div>
              </div>

              {/* Specs */}
              <div className="flex flex-col gap-3 mb-8 bg-[#0d1117]/80 p-4.5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Tình trạng</span>
                  <span className="font-semibold text-slate-200">
                    {CONDITION_LABELS[product.condition] || product.condition}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Khu vực</span>
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <MapPin size={14} className="text-rose-400" /> {product.location || 'Toàn quốc'}
                  </span>
                </div>
                {product.status === 'sold' && (
                  <div className="flex items-center justify-between text-sm pt-3 mt-1 border-t border-white/5">
                    <span className="text-slate-400">Trạng thái</span>
                    <span className="font-bold text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full uppercase tracking-wider text-[10px]">Đã bán</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isOwner ? (
                  <p className="text-center p-4 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                    Đây là sản phẩm của bạn.
                  </p>
                ) : product.status === 'sold' ? (
                  <button className="w-full py-4 rounded-xl font-bold bg-slate-800 text-slate-500 cursor-not-allowed">
                    Sản phẩm đã bán
                  </button>
                ) : (
                  <>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(0,212,180,0.2)] hover:shadow-[0_0_30px_rgba(0,212,180,0.4)] transition-all transform hover:-translate-y-0.5 text-lg"
                      onClick={() => setShowOrderModal(true)}
                    >
                      <ShoppingCart size={20} /> Đặt mua ngay
                    </button>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/chat?receiver=${product.seller_id}&product=${product.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <MessageSquare size={18} /> Nhắn tin
                      </Link>
                      <button
                        type="button"
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold border transition-all",
                          isWishlistLoading ? "opacity-50 cursor-not-allowed" : "",
                          wishlisted 
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20" 
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        )}
                        onClick={handleWishlistToggle}
                        disabled={isWishlistLoading}
                      >
                        <Heart size={18} className={wishlisted ? "fill-current animate-pulse" : ""} /> 
                        {wishlisted ? 'Đã lưu' : 'Lưu lại'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Seller Info */}
            {product.profiles && (
              <div className="bg-[#111827] rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden group hover:border-teal-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex-shrink-0 relative">
                  {product.profiles.avatar_url ? (
                    <img src={product.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400 bg-[#0d1117]">
                      {(product.profiles.full_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  {product.profiles.verified && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-teal-500 rounded-full border-2 border-[#111827] flex items-center justify-center">
                      <CheckCircle size={10} className="text-[#111827]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left z-10">
                  <h3 className="font-bold text-lg text-slate-200">{product.profiles.full_name || 'Người bán'}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <div className="flex items-center text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <span className="ml-1 text-sm font-bold">{(Number(product.profiles.rating_avg) || 0).toFixed(1)}</span>
                    </div>
                    <span className="text-slate-500 text-sm">({product.profiles.rating_count || 0} đánh giá)</span>
                  </div>
                </div>
                <Link to={`/chat?receiver=${product.seller_id}`} className="px-5 py-2.5 rounded-full bg-white/5 text-teal-400 font-bold text-sm hover:bg-white/10 transition-colors border border-white/5 z-10">
                  Xem hồ sơ
                </Link>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="bg-[#111827] rounded-3xl p-6 md:p-8 border border-white/5 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  Chi tiết sản phẩm
                </h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px]">
                  {product.description}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-sm text-slate-500 font-medium">
                  Đăng ngày {formatDate(product.created_at)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-display font-bold text-white mb-8 border-b border-white/5 pb-4">
              Sản phẩm tương tự
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((rp) => (
                <Link to={`/products/${rp.id}`} key={rp.id} className="group flex flex-col rounded-2xl bg-[#111827] border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-[0_10px_30px_rgba(0,212,180,0.1)]">
                  <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative">
                    {getProductImages(rp)[0] ? (
                      <img src={getProductImages(rp)[0]} alt={rp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-800">📷</div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1.5 flex-1">
                    <h3 className="font-semibold text-slate-200 line-clamp-2 leading-snug group-hover:text-teal-400 transition-colors">{rp.title}</h3>
                    <p className="font-bold text-teal-400 mt-auto pt-2">{formatCurrency(rp.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isOrdering && setShowOrderModal(false)}>
          <div className="bg-[#111827] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0a0f1e]/50">
              <h3 className="font-bold text-lg text-white">Xác nhận đặt mua</h3>
              <button onClick={() => !isOrdering && setShowOrderModal(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0d1117] border border-white/5 mb-6">
                {productImages[0] ? (
                  <img src={productImages[0]} alt="" className="w-16 h-16 rounded-xl object-cover bg-slate-900" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center">📷</div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-200 truncate">{product.title}</h4>
                  <p className="font-bold text-teal-400 mt-1">{formatCurrency(product.price)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phương thức thanh toán</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lời nhắn (Tùy chọn)</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="VD: Gọi cho tôi vào buổi chiều..."
                    rows={3}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>

              {orderFeedback.message && (
                <div className={cn(
                  "p-3.5 rounded-xl mt-5 text-sm font-medium border flex items-center gap-2", 
                  orderFeedback.type === 'success' ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  {orderFeedback.type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
                  {orderFeedback.message}
                </div>
              )}

              <div className="flex items-center gap-3 mt-8">
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-white border border-white/5 hover:bg-white/10 transition-colors"
                  onClick={() => setShowOrderModal(false)}
                  disabled={isOrdering}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(0,212,180,0.2)] hover:shadow-[0_0_20px_rgba(0,212,180,0.4)] transition-all"
                  onClick={handleOrder}
                  disabled={isOrdering}
                >
                  {isOrdering ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProductDetailPage;
