import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { getProducts } from '../../services/productService';

const CATEGORIES = [
  'Điện tử', 'Thời trang', 'Đồ gia dụng', 'Sách vở',
  'Thể thao', 'Ô tô - Xe máy', 'Bất động sản', 'Khác',
];

const CONDITIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'good', label: 'Tốt' },
  { value: 'fair', label: 'Khá' },
  { value: 'poor', label: 'Cũ' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
];

function SkeletonCard() {
  return (
    <div className="product-card skeleton-card">
      <div className="product-card-image skeleton-pulse" />
      <div className="product-card-body">
        <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: 16 }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: '50%', height: 20, marginTop: 8 }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: 14, marginTop: 8 }} />
      </div>
    </div>
  );
}

function ClientHomePage() {
  const zaloUrl = String(import.meta.env.VITE_ZALO_LINK || 'https://zalo.me').trim();
  const messengerUrl = String(import.meta.env.VITE_MESSENGER_LINK || 'https://m.me').trim();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const loadProducts = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setError('');

      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const result = await getProducts(params);

      let sorted = result.products || [];
      if (sort === 'price_asc') {
        sorted = [...sorted].sort((a, b) => a.price - b.price);
      } else if (sort === 'price_desc') {
        sorted = [...sorted].sort((a, b) => b.price - a.price);
      }

      setProducts(sorted);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, category, condition, minPrice, maxPrice, sort]);

  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setCategory('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadProducts(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const hasActiveFilters = search || category || condition || minPrice || maxPrice;

  return (
    <main className="page-shell">
      <Navbar />
      <div className="page-container page-container-wide">
        {/* Hero Search */}
        <section className="home-hero">
          <h1>Khám phá sản phẩm</h1>
          <p>Tìm kiếm đồ cũ chất lượng với giá tốt nhất</p>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">🔍 Tìm</button>
          </form>
        </section>

        {/* Filter Bar */}
        <section className="filter-bar">
          <div className="filter-bar-top">
            <button
              type="button"
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔧 Bộ lọc {hasActiveFilters && <span className="filter-badge">●</span>}
            </button>
            <div className="sort-wrap">
              <label htmlFor="sort-select">Sắp xếp:</label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <div className="filter-group">
                <label className="filter-label">Danh mục</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Tình trạng</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Giá từ (VNĐ)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Giá đến (VNĐ)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="10.000.000"
                  className="filter-input"
                />
              </div>

              {hasActiveFilters && (
                <button type="button" className="filter-clear-btn" onClick={handleClearFilters}>
                  ✕ Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </section>

        {/* Results Info */}
        {!isLoading && (
          <div className="results-info">
            <span>{pagination.total} sản phẩm</span>
            {search && <span className="results-query">cho &quot;{search}&quot;</span>}
          </div>
        )}

        {/* Error */}
        {error && <p className="form-feedback error">{error}</p>}

        {/* Product Grid */}
        {isLoading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>
              {hasActiveFilters
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Chưa có sản phẩm nào được đăng bán.'}
            </p>
            {hasActiveFilters && (
              <button type="button" className="btn-outline" onClick={handleClearFilters} style={{ marginTop: 12 }}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="product-card"
                >
                  <div className="product-card-image-wrap">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="product-card-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-card-placeholder">📷</div>
                    )}
                    {product.condition && (
                      <span className={`product-condition-badge condition-${product.condition}`}>
                        {CONDITIONS.find((c) => c.value === product.condition)?.label || product.condition}
                      </span>
                    )}
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-title">{product.title}</h3>
                    <p className="product-card-price">{formatCurrency(product.price)}</p>
                    <div className="product-card-meta">
                      {product.profiles?.full_name && (
                        <span className="product-card-seller">
                          {product.profiles.full_name}
                        </span>
                      )}
                      {product.location && (
                        <span className="product-card-location">📍 {product.location}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  ‹ Trước
                </button>
                <span className="page-info">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Sau ›
                </button>
              </div>
            )}
          </>
        )}

        {/* Contact FAB */}
        <div className="fab-contact" aria-label="Lien lac ho tro">
          <a
            className="fab-btn fab-btn-zalo"
            href={zaloUrl}
            target="_blank"
            rel="noreferrer"
            title="Lien lac Zalo"
          >
            Z
          </a>
          <a
            className="fab-btn fab-btn-messenger"
            href={messengerUrl}
            target="_blank"
            rel="noreferrer"
            title="Lien lac Messenger"
          >
            M
          </a>
        </div>
      </div>
    </main>
  );
}

export default ClientHomePage;
