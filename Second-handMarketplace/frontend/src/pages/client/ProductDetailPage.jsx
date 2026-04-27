import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProductById, getProducts } from '../../services/productService';
import { createTransaction } from '../../services/transactionService';
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
      const data = await getProductById(id);
      setProduct(data);
      setSelectedImage(0);

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
  }, [id]);

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const isOwner = user && product && product.seller_id === user.id;

  if (isLoading) {
    return (
      <main className="page-shell">
        <div className="page-loading">
          <div className="loading-spinner" />
          <p>Đang tải sản phẩm...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="empty-state">
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
    <main className="page-shell">
      <div className="page-container page-container-wide">
        {/* Back */}
        <div className="page-header">
          <div className="page-header-left">
            <Link to="/app" className="back-link">← Quay lại</Link>
          </div>
        </div>

        {/* Product Detail */}
        <div className="detail-layout">
          {/* Image Gallery */}
          <div className="detail-gallery">
            <div className="detail-main-image-wrap">
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
                  <button
                    className="btn-primary detail-buy-btn"
                    onClick={() => setShowOrderModal(true)}
                  >
                    🛒 Đặt mua ngay
                  </button>
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
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="related-section">
            <h2>Sản phẩm liên quan</h2>
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
