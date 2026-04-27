import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProducts, updateProduct, deleteProduct } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const statusLabels = {
  active: { label: 'Đang bán', color: 'bg-green-100 text-green-800' },
  sold: { label: 'Đã bán', color: 'bg-blue-100 text-blue-800' },
  hidden: { label: 'Đang ẩn', color: 'bg-yellow-100 text-yellow-800' },
  banned: { label: 'Bị khóa', color: 'bg-red-100 text-red-800' },
};

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
    try {
      setLoading(true);
      const result = await getMyProducts({
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: pagination.page,
        limit: 12,
      });
      setProducts(result.products);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, pagination.page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleStatusChange = async (productId, newStatus) => {
    try {
      await updateProduct(productId, { status: newStatus });
      await loadProducts(); // Reload products
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(productToDelete.id);
      await loadProducts(); // Reload products
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (!user) {
    return (
      <main className="page-shell">
        <section className="auth-required-card">
          <h2>
            Bạn cần đăng nhập
          </h2>
          <p>
            Vui lòng đăng nhập để xem sản phẩm của bạn.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide my-products-page">
        <header className="my-products-header">
          <div className="my-products-title-block">
            <Link to="/app" className="back-link">← Quay lại</Link>
            <div>
              <h1>Sản phẩm của tôi</h1>
              <p>Quản lý danh sách đăng bán, trạng thái hiển thị và lịch đăng.</p>
            </div>
          </div>
          <Link to="/products/new" className="btn-primary my-products-create-btn">
            + Đăng sản phẩm mới
          </Link>
        </header>

        <section className="my-products-filter-wrap">
          <div className="my-products-filter-title">Bộ lọc trạng thái</div>
          <div className="my-products-filter-row">
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
                className={`my-products-chip ${filterStatus === status.value ? 'active' : ''}`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="form-feedback error">{error}</p>
        )}

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Đang tải danh sách sản phẩm...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <h3>Chưa có sản phẩm nào</h3>
            <p>
              {filterStatus === 'all'
                ? 'Bạn chưa đăng bán sản phẩm nào.'
                : `Không có sản phẩm nào ở trạng thái "${filterStatus}".`}
            </p>
            <Link to="/products/new" className="btn-primary my-products-empty-btn">
              Đăng sản phẩm đầu tiên
            </Link>
          </div>
        ) : (
          <>
            <section className="my-products-grid">
              {products.map((product) => (
                <article key={product.id} className="my-product-card">
                  <div className="my-product-image-wrap">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="my-product-image"
                      />
                    ) : (
                      <div className="my-product-placeholder">📦</div>
                    )}
                  </div>

                  <div className="my-product-content">
                    <h3 className="my-product-title">
                      {product.title}
                    </h3>

                    <p className="my-product-price">
                      {formatCurrency(product.price)}
                    </p>

                    <div className="my-product-meta">
                      <span className={`my-product-status my-product-status-${product.status || 'active'}`}>
                        {statusLabels[product.status]?.label || product.status}
                      </span>
                      <span>
                        {formatDate(product.created_at)}
                      </span>
                    </div>

                    <div className="my-product-actions">
                      {product.status !== 'banned' && (
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="my-action-btn ok"
                          style={{ textDecoration: 'none', textAlign: 'center' }}
                        >
                          Sửa
                        </Link>
                      )}
                      
                      {product.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(product.id, 'hidden')}
                          className="my-action-btn warn"
                        >
                          Ẩn
                        </button>
                      )}

                      {product.status === 'hidden' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(product.id, 'active')}
                          className="my-action-btn ok"
                        >
                          Hiển thị lại
                        </button>
                      )}

                      {product.status !== 'banned' && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(product)}
                          className="my-action-btn danger"
                        >
                          Ẩn nhanh
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="page-btn"
                >
                  ‹ Trước
                </button>

                <span className="page-info">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="page-btn"
                >
                  Sau ›
                </button>
              </div>
            )}

            <p className="tx-total-info">
              Tổng: {pagination.total} sản phẩm
            </p>
          </>
        )}

        {showDeleteModal && productToDelete && (
          <div className="dialog-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="dialog-panel" onClick={(event) => event.stopPropagation()}>
              <div className="dialog-header">
                <h3>
                  Xác nhận ẩn sản phẩm
                </h3>
                <button
                  type="button"
                  className="dialog-close"
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="dialog-body">
                <p className="dialog-description">
                  Bạn có chắc chắn muốn ẩn sản phẩm <strong>{productToDelete.title}</strong>?
                  Sản phẩm sẽ không còn hiển thị công khai.
                </p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="btn-outline"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    className="btn-primary"
                  >
                    Ẩn sản phẩm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default MyProductsPage;