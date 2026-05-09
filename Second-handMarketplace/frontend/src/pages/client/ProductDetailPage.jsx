import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProductById, getProducts } from '../../services/productService';
import { getReviewsByUser } from '../../services/reviewService';
import { createTransaction } from '../../services/transactionService';
import { getWishlistStatus, toggleWishlist } from '../../services/wishlistService';
import { useAuthStore } from '../../store/authStore';

const CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Cũ',
};

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
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
  const [orderNote, setOrderNote] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState({ type: '', message: '' });

  const loadProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const viewKey = `viewed_product_${id}`;
      const alreadyViewed = sessionStorage.getItem(viewKey) === '1';
      if (!alreadyViewed) {
        sessionStorage.setItem(viewKey, '1');
      }

      viewKeyRef.current = viewKey;
      const data = await getProductById(id, { skipView: alreadyViewed });
      setProduct(data);
      setSelectedImage(0);

      if (user) {
        try {
          const status = await getWishlistStatus(id);
          setWishlisted(status);
        } catch {
          setWishlisted(false);
        }
      } else {
        setWishlisted(false);
      }

      if (data.seller_id) {
        setIsLoadingReviews(true);
        try {
          const reviewData = await getReviewsByUser(data.seller_id, { limit: 6 });
          setSellerReviews(reviewData.reviews || []);
          setReviewMeta({ total: reviewData.total || 0 });
        } catch {
          setSellerReviews([]);
          setReviewMeta({ total: 0 });
        } finally {
          setIsLoadingReviews(false);
        }
      } else {
        setSellerReviews([]);
        setReviewMeta({ total: 0 });
      }

      // Load related products (same category)
      if (data.category) {
        try {
          const related = await getProducts({
            category: data.category,
            limit: 4,
          });
          setRelatedProducts(
            (related.products || []).filter((p) => p.id !== id).slice(0, 4)
          );
        } catch {
          // Silently fail for related products
        }
      }
    } catch (err) {
      setError(err.message);
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

      await createTransaction({
        product_id: id,
        payment_method: paymentMethod,
        note: orderNote,
      });

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
  const pageTitle = product ? `${product.title} | ReMarket` : 'Chi tiet san pham | ReMarket';
  const pageDescription = product?.description
    ? product.description.slice(0, 160)
    : 'Xem chi tiet san pham do cu tren ReMarket.';
  const canonicalUrl = `${window.location.origin}/products/${id}`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50/80">
        <Helmet>
          <title>Dang tai san pham | ReMarket</title>
        </Helmet>
        <div className="page-loading">
          <div className="loading-spinner" />
          <p>Đang tải sản phẩm...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-50/80">
        <Helmet>
          <title>Khong tim thay san pham | ReMarket</title>
          <meta name="description" content="San pham khong ton tai hoac da bi an." />
        </Helmet>
        <div className="mx-auto w-full max-w-5xl px-4 py-12">
          <div className="empty-state rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm">
            <span className="empty-icon">😔</span>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>{error || 'Sản phẩm không tồn tại hoặc đã bị ẩn.'}</p>
            <Link to="/app" className="btn-primary" style={{ marginTop: 16, display: 'inline-block', textDecoration: 'none' }}>
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/80">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        {product.images?.[0] && <meta property="og:image" content={product.images[0]} />}
      </Helmet>
      <div className="mx-auto w-full max-w-6xl px-4 pb-12">
        {/* Back */}
        <div className="page-header mb-6">
          <div className="page-header-left">
            <Link to="/app" className="back-link inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:text-slate-900">
              ← Quay lại
            </Link>
          </div>
        </div>

        {/* Product Detail */}
        <div className="detail-layout">
          {/* Image Gallery */}
          <div className="detail-gallery">
            <div className="detail-main-image-wrap rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="detail-main-image"
                />
              ) : (
                <div className="detail-no-image">📷 Không có ảnh</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="detail-thumbnails">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`detail-thumb ${idx === selectedImage ? 'active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img} alt={`Ảnh ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="detail-info">
            <div className="detail-info-card">
              {product.category && (
                <span className="detail-category">{product.category}</span>
              )}
              <h1 className="detail-title">{product.title}</h1>
              <p className="detail-price">{formatCurrency(product.price)}</p>

              <div className="detail-badges">
                {product.condition && (
                  <span className={`detail-badge condition-${product.condition}`}>
                    {CONDITION_LABELS[product.condition] || product.condition}
                  </span>
                )}
                {product.location && (
                  <span className="detail-badge detail-badge-location">
                    📍 {product.location}
                  </span>
                )}
                {product.status === 'sold' && (
                  <span className="detail-badge detail-badge-sold">Đã bán</span>
                )}
              </div>

              {product.description && (
                <div className="detail-desc">
                  <h3>Mô tả</h3>
                  <p>{product.description}</p>
                </div>
              )}

              <div className="detail-meta">
                <span>Đăng ngày {formatDate(product.created_at)}</span>
              </div>

              {/* Action Buttons */}
              <div className="detail-actions">
                {isOwner ? (
                  <p className="detail-owner-notice">
                    Đây là sản phẩm của bạn.
                  </p>
                ) : product.status === 'sold' ? (
                  <button className="btn-primary" disabled>
                    Sản phẩm đã bán
                  </button>
                ) : (
                  <div className="detail-actions-row">
                    <button
                      className="btn-primary detail-buy-btn"
                      onClick={() => setShowOrderModal(true)}
                    >
                      🛒 Đặt mua ngay
                    </button>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      <Link
                        to={`/chat?receiver=${product.seller_id}&product=${product.id}`}
                        className="btn-outline"
                        style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                      >
                        💬 Nhắn người bán
                      </Link>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ flex: 1 }}
                        onClick={handleWishlistToggle}
                        disabled={isWishlistLoading}
                      >
                        {isWishlistLoading
                          ? 'Đang xử lý...'
                          : wishlisted
                            ? '💖 Đã yêu thích'
                            : '♡ Yêu thích'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Info */}
            {product.profiles && (
              <div className="detail-seller-card">
                <h3>Người bán</h3>
                <div className="detail-seller-info">
                  {product.profiles.avatar_url ? (
                    <img
                      src={product.profiles.avatar_url}
                      alt=""
                      className="detail-seller-avatar"
                    />
                  ) : (
                    <div className="detail-seller-avatar-placeholder">
                      {(product.profiles.full_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong>{product.profiles.full_name || 'Người bán'}</strong>
                    {product.profiles.phone && (
                      <p className="detail-seller-phone">📱 {product.profiles.phone}</p>
                    )}
                  </div>
                </div>
                <div className="review-summary">
                  {renderStars(product.profiles.rating_avg || 0)}
                  <span>
                    {(Number(product.profiles.rating_avg) || 0).toFixed(1)}
                    {' '}
                    ({product.profiles.rating_count || 0} đánh giá)
                  </span>
                </div>
              </div>
            )}

            <div className="detail-seller-card">
              <h3>Đánh giá gần đây</h3>
              {isLoadingReviews ? (
                <p className="tx-note">Đang tải đánh giá...</p>
              ) : sellerReviews.length === 0 ? (
                <p className="tx-note">Người bán chưa có đánh giá nào.</p>
              ) : (
                <div className="review-list">
                  {sellerReviews.map((review) => (
                    <article key={review.id} className="review-item">
                      <div className="review-summary">
                        {renderStars(review.rating)}
                        <strong>{review.reviewer_profile?.full_name || 'Người mua'}</strong>
                      </div>
                      {review.comment && <p>{review.comment}</p>}
                      <small>
                        {new Date(review.created_at).toLocaleDateString('vi-VN')}
                      </small>
                    </article>
                  ))}
                  {reviewMeta.total > sellerReviews.length && (
                    <small className="tx-note">và còn {reviewMeta.total - sellerReviews.length} đánh giá khác.</small>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="related-section">
            <h2 className="text-xl font-display tracking-tight text-slate-900">Sản phẩm liên quan</h2>
            <div className="product-grid product-grid-4">
              {relatedProducts.map((rp) => (
                <Link to={`/products/${rp.id}`} key={rp.id} className="product-card">
                  <div className="product-card-image-wrap">
                    {rp.images && rp.images.length > 0 ? (
                      <img src={rp.images[0]} alt={rp.title} className="product-card-image" loading="lazy" />
                    ) : (
                      <div className="product-card-placeholder">📷</div>
                    )}
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">{rp.title}</h3>
                    <p className="product-card-price">{formatCurrency(rp.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => !isOrdering && setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận đặt hàng</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !isOrdering && setShowOrderModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Order Summary */}
              <div className="order-summary">
                <div className="order-summary-product">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt="" className="order-summary-img" />
                  )}
                  <div>
                    <strong>{product.title}</strong>
                    <p className="order-summary-price">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="form-field" style={{ marginTop: 16 }}>
                <label htmlFor="payment-method">Phương thức thanh toán</label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Tiền mặt">Tiền mặt khi nhận hàng</option>
                  <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                  <option value="Ví điện tử">Ví điện tử</option>
                </select>
              </div>

              {/* Note */}
              <div className="form-field" style={{ marginTop: 12 }}>
                <label htmlFor="order-note">Ghi chú (tùy chọn)</label>
                <textarea
                  id="order-note"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ghi chú cho người bán..."
                  rows={3}
                />
              </div>

              {/* Feedback */}
              {orderFeedback.message && (
                <p className={`form-feedback ${orderFeedback.type}`} style={{ marginTop: 12 }}>
                  {orderFeedback.message}
                </p>
              )}

              {/* Actions */}
              <div className="dialog-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowOrderModal(false)}
                  disabled={isOrdering}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleOrder}
                  disabled={isOrdering}
                >
                  {isOrdering ? 'Đang xử lý...' : '✅ Xác nhận đặt hàng'}
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
