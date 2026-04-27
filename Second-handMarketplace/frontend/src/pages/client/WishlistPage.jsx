import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWishlist, toggleWishlist } from '../../services/wishlistService';

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
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
    <main className="page-shell">
      <div className="page-container page-container-wide">
        <header className="wishlist-header">
          <div>
            <Link to="/app" className="back-link">← Quay lai</Link>
            <h1>Wishlist cua ban</h1>
            <p>Luu nhung san pham ban quan tam de xem lai nhanh hon.</p>
          </div>
          <span className="wishlist-count">{items.length} san pham</span>
        </header>

        {error && <p className="form-feedback error">{error}</p>}

        {isLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Dang tai wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">♡</span>
            <h3>Wishlist dang trong</h3>
            <p>Ban chua luu san pham nao. Thu kham pha them o trang chu.</p>
            <Link to="/app" className="btn-primary" style={{ display: 'inline-block', marginTop: 14, textDecoration: 'none' }}>
              Kham pha ngay
            </Link>
          </div>
        ) : (
          <section className="wishlist-grid">
            {items.map((item) => (
              <article key={item.product_id} className="wishlist-card">
                <Link to={`/products/${item.product.id}`} className="wishlist-image-wrap">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.title} className="wishlist-image" />
                  ) : (
                    <div className="wishlist-placeholder">📦</div>
                  )}
                </Link>

                <div className="wishlist-content">
                  <Link to={`/products/${item.product.id}`} className="wishlist-title-link">
                    <h3>{item.product.title}</h3>
                  </Link>
                  <p className="wishlist-price">{formatCurrency(item.product.price)}</p>
                  {item.product.profiles?.full_name && (
                    <p className="wishlist-seller">Nguoi ban: {item.product.profiles.full_name}</p>
                  )}

                  <div className="wishlist-actions">
                    <Link to={`/products/${item.product.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
                      Xem chi tiet
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleRemove(item.product_id)}
                      disabled={isRemovingId === item.product_id}
                    >
                      {isRemovingId === item.product_id ? 'Dang xu ly...' : 'Bo yeu thich'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default WishlistPage;