import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { getProducts } from '../../services/productService';
import { getWishlist, toggleWishlist } from '../../services/wishlistService';

const CATEGORIES = [
  'Điện tử', 'Thời trang', 'Đồ gia dụng', 'Sách vở',
  'Thể thao', 'Ô tô - Xe máy', 'Bất động sản', 'Khác',
];

const CONDITIONS = [
  { value: 'new', label: 'Mới 100%' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'good', label: 'Đã qua sử dụng — Còn tốt' },
  { value: 'fair', label: 'Đã qua sử dụng — Trung bình' },
  { value: 'poor', label: 'Đã qua sử dụng — Cũ' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: '🆕 Mới nhất' },
  { value: 'oldest', label: '🕰️ Cũ nhất' },
  { value: 'price_asc', label: '💰 Giá tăng dần' },
  { value: 'price_desc', label: '💰 Giá giảm dần' },
  { value: 'view_desc', label: '🔥 Xem nhiều nhất' },
  { value: 'comment_desc', label: '💬 Bình luận nhiều nhất' },
  { value: 'rating_desc', label: '⭐ Đánh giá cao nhất' },
  { value: 'today', label: '📦 Mới đăng hôm nay' },
];

const PRICE_PRESETS = [
  { label: 'Dưới 100k', min: 0, max: 100000 },
  { label: '100k–500k', min: 100000, max: 500000 },
  { label: '500k–2M', min: 500000, max: 2000000 },
  { label: 'Trên 2M', min: 2000000, max: '' },
];

const CITY_OPTIONS = [
  {
    value: 'TP.HCM',
    districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Thủ Đức', 'Bình Thạnh'],
  },
  {
    value: 'Hà Nội',
    districts: ['Ba Đình', 'Hoàn Kiếm', 'Cầu Giấy', 'Đống Đa', 'Nam Từ Liêm'],
  },
  {
    value: 'Đà Nẵng',
    districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn'],
  },
];

const DEFAULT_FILTERS = {
  page: 1,
  limit: 24,
  search: '',
  categories: [],
  conditions: [],
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  city: '',
  district: '',
  postedWithin: '',
  hasImages: false,
  verifiedSeller: false,
  inStock: true,
  negotiable: false,
};

const LIMIT_OPTIONS = [12, 24, 48];

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCompactCount(value) {
  const amount = Number(value || 0);
  if (amount < 1000) return String(amount);
  return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
}

function formatTimeAgo(value) {
  if (!value) return '';
  const now = new Date();
  const created = new Date(value);
  const diffMs = Math.max(0, now - created);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} tuần trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const requestIdRef = useRef(0);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const nextFilters = {
      ...DEFAULT_FILTERS,
      page: Number(searchParams.get('page') || DEFAULT_FILTERS.page),
      limit: Number(searchParams.get('limit') || DEFAULT_FILTERS.limit),
      search: searchParams.get('search') || DEFAULT_FILTERS.search,
      categories: parseCsv(searchParams.get('category')),
      conditions: parseCsv(searchParams.get('condition')),
      minPrice: searchParams.get('min_price') || DEFAULT_FILTERS.minPrice,
      maxPrice: searchParams.get('max_price') || DEFAULT_FILTERS.maxPrice,
      sort: searchParams.get('sort') || DEFAULT_FILTERS.sort,
      city: searchParams.get('city') || DEFAULT_FILTERS.city,
      district: searchParams.get('district') || DEFAULT_FILTERS.district,
      postedWithin: searchParams.get('posted_within') || DEFAULT_FILTERS.postedWithin,
      hasImages: searchParams.get('has_images') === 'true',
      verifiedSeller: searchParams.get('verified_seller') === 'true',
      inStock: searchParams.get('in_stock') !== 'false',
      negotiable: searchParams.get('negotiable') === 'true',
    };

    setFilters(nextFilters);
    setSearchInput(nextFilters.search);
  }, [searchParams]);

  const updateSearchParams = useCallback((nextFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.page && nextFilters.page !== 1) params.set('page', String(nextFilters.page));
    if (nextFilters.limit && nextFilters.limit !== DEFAULT_FILTERS.limit) params.set('limit', String(nextFilters.limit));
    if (nextFilters.search) params.set('search', nextFilters.search);
    if (nextFilters.categories.length > 0) params.set('category', nextFilters.categories.join(','));
    if (nextFilters.conditions.length > 0) params.set('condition', nextFilters.conditions.join(','));
    if (nextFilters.minPrice) params.set('min_price', nextFilters.minPrice);
    if (nextFilters.maxPrice) params.set('max_price', nextFilters.maxPrice);
    if (nextFilters.sort && nextFilters.sort !== DEFAULT_FILTERS.sort) params.set('sort', nextFilters.sort);
    if (nextFilters.city) params.set('city', nextFilters.city);
    if (nextFilters.district) params.set('district', nextFilters.district);
    if (nextFilters.postedWithin) params.set('posted_within', nextFilters.postedWithin);
    if (nextFilters.hasImages) params.set('has_images', 'true');
    if (nextFilters.verifiedSeller) params.set('verified_seller', 'true');
    if (!nextFilters.inStock) params.set('in_stock', 'false');
    if (nextFilters.negotiable) params.set('negotiable', 'true');

    setSearchParams(params);
  }, [setSearchParams]);

  const loadProducts = useCallback(async () => {
    let requestId = 0;
    try {
      setIsLoading(true);
      setError('');

      requestIdRef.current += 1;
      requestId = requestIdRef.current;

      const params = {
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
      };

      if (filters.search) params.search = filters.search;
      if (filters.categories.length > 0) params.category = filters.categories.join(',');
      if (filters.conditions.length > 0) params.condition = filters.conditions.join(',');
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      if (filters.city) params.city = filters.city;
      if (filters.district) params.district = filters.district;
      if (filters.postedWithin) params.posted_within = filters.postedWithin;
      if (filters.hasImages) params.has_images = true;
      if (filters.verifiedSeller) params.verified_seller = true;
      if (!filters.inStock) params.in_stock = false;
      if (filters.negotiable) params.negotiable = true;

      const result = await getProducts(params);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setProducts(result.products || []);
      setPagination(result.pagination || { page: 1, totalPages: 0, total: 0 });
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const loadWishlistIds = async () => {
      try {
        const wishlist = await getWishlist({ limit: 200 });
        const ids = new Set((wishlist.items || []).map((item) => item.product_id));
        setWishlistIds(ids);
      } catch (loadError) {
        if (loadError?.message) {
          // Ignore if user is not signed in.
        }
      }
    };

    loadWishlistIds();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextFilters = {
      ...filters,
      search: searchInput.trim(),
      page: 1,
    };
    setFilters(nextFilters);
    updateSearchParams(nextFilters);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters(DEFAULT_FILTERS);
    updateSearchParams(DEFAULT_FILTERS);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const nextFilters = {
        ...filters,
        page: newPage,
      };
      setFilters(nextFilters);
      updateSearchParams(nextFilters);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLimitChange = (value) => {
    const nextFilters = {
      ...filters,
      limit: value,
      page: 1,
    };
    setFilters(nextFilters);
    updateSearchParams(nextFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleListValue = (list, value) => {
    if (list.includes(value)) {
      return list.filter((item) => item !== value);
    }
    return [...list, value];
  };

  const applyFilters = (patch, options = {}) => {
    const nextFilters = {
      ...filters,
      ...patch,
    };

    if (options.resetPage) {
      nextFilters.page = 1;
    }

    setFilters(nextFilters);
    updateSearchParams(nextFilters);
  };

  const handleToggleWishlist = async (productId) => {
    try {
      const result = await toggleWishlist(productId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (result.wishlisted) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
    } catch (toggleError) {
      setError(toggleError.message || 'Khong the cap nhat wishlist.');
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const hasActiveFilters = Boolean(
    filters.search
    || filters.categories.length
    || filters.conditions.length
    || filters.minPrice
    || filters.maxPrice
    || filters.city
    || filters.district
    || filters.postedWithin
    || filters.hasImages
    || filters.verifiedSeller
    || !filters.inStock
    || filters.negotiable,
  );

  const availableDistricts = useMemo(() => {
    const selected = CITY_OPTIONS.find((option) => option.value === filters.city);
    return selected?.districts || [];
  }, [filters.city]);

  const paginationItems = useMemo(() => {
    const totalPages = pagination.totalPages;
    const current = pagination.page;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const items = [1];
    const start = Math.max(2, current - 2);
    const end = Math.min(totalPages - 1, current + 2);

    if (start > 2) items.push('ellipsis-start');
    for (let i = start; i <= end; i += 1) items.push(i);
    if (end < totalPages - 1) items.push('ellipsis-end');
    items.push(totalPages);
    return items;
  }, [pagination.page, pagination.totalPages]);

  const activeFilterTags = useMemo(() => {
    const tags = [];

    if (filters.search) {
      tags.push({ label: `Tu khoa: ${filters.search}`, key: 'search' });
    }

    filters.categories.forEach((cat) => {
      tags.push({ label: `Danh muc: ${cat}`, key: `cat-${cat}` });
    });

    filters.conditions.forEach((cond) => {
      const label = CONDITIONS.find((item) => item.value === cond)?.label || cond;
      tags.push({ label: `Tinh trang: ${label}`, key: `cond-${cond}` });
    });

    if (filters.minPrice || filters.maxPrice) {
      tags.push({
        label: `Gia: ${filters.minPrice || 0} - ${filters.maxPrice || '...'} VND`,
        key: 'price',
      });
    }

    if (filters.city) {
      tags.push({ label: `Khu vuc: ${filters.city}`, key: 'city' });
    }

    if (filters.district) {
      tags.push({ label: `Quan/Huyen: ${filters.district}`, key: 'district' });
    }

    if (filters.postedWithin) {
      const labelMap = {
        today: 'Hom nay',
        '3': '3 ngay',
        '7': '7 ngay',
        '30': '30 ngay',
      };
      tags.push({ label: `Thoi gian: ${labelMap[filters.postedWithin] || filters.postedWithin}`, key: 'posted' });
    }

    if (filters.hasImages) {
      tags.push({ label: 'Co anh that', key: 'images' });
    }

    if (filters.verifiedSeller) {
      tags.push({ label: 'Nguoi ban da xac minh', key: 'verified' });
    }

    if (!filters.inStock) {
      tags.push({ label: 'Hien ca san pham da ban', key: 'stock' });
    }

    if (filters.negotiable) {
      tags.push({ label: 'Co the thuong luong', key: 'negotiable' });
    }

    return tags;
  }, [filters]);

  const shownCount = useMemo(() => {
    if (!pagination.total || pagination.total < 1) return 0;
    const start = (pagination.page - 1) * filters.limit + 1;
    const end = Math.min(pagination.page * filters.limit, pagination.total);
    return Math.max(0, end - start + 1);
  }, [filters.limit, pagination.page, pagination.total]);

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
                value={filters.sort}
                onChange={(e) => applyFilters({ sort: e.target.value }, { resetPage: true })}
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
                <div className="filter-checkbox-list">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat)}
                        onChange={() => applyFilters({
                          categories: toggleListValue(filters.categories, cat),
                        }, { resetPage: true })}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Tình trạng</label>
                <div className="filter-checkbox-list">
                  {CONDITIONS.map((c) => (
                    <label key={c.value} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.conditions.includes(c.value)}
                        onChange={() => applyFilters({
                          conditions: toggleListValue(filters.conditions, c.value),
                        }, { resetPage: true })}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Khoảng giá</label>
                <div className="filter-price-range">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => applyFilters({ minPrice: e.target.value }, { resetPage: true })}
                    placeholder="0"
                    className="filter-input"
                  />
                  <span>—</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => applyFilters({ maxPrice: e.target.value }, { resetPage: true })}
                    placeholder="10.000.000"
                    className="filter-input"
                  />
                  <button
                    type="button"
                    className="filter-apply-btn"
                    onClick={() => applyFilters({
                      minPrice: filters.minPrice,
                      maxPrice: filters.maxPrice,
                    }, { resetPage: true })}
                  >
                    Áp dụng
                  </button>
                </div>
                <div className="filter-quick-tags">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="filter-tag-btn"
                      onClick={() => applyFilters({
                        minPrice: preset.min,
                        maxPrice: preset.max,
                      }, { resetPage: true })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Khu vực</label>
                <div className="filter-location">
                  <select
                    value={filters.city}
                    onChange={(e) => applyFilters({ city: e.target.value, district: '' }, { resetPage: true })}
                    className="filter-select"
                  >
                    <option value="">Chon tinh/thanh</option>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city.value} value={city.value}>{city.value}</option>
                    ))}
                  </select>
                  <select
                    value={filters.district}
                    onChange={(e) => applyFilters({ district: e.target.value }, { resetPage: true })}
                    className="filter-select"
                    disabled={!filters.city}
                  >
                    <option value="">Chon quan/huyen</option>
                    {availableDistricts.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Khoang thoi gian</label>
                <select
                  value={filters.postedWithin}
                  onChange={(e) => applyFilters({ postedWithin: e.target.value }, { resetPage: true })}
                  className="filter-select"
                >
                  <option value="">Tat ca</option>
                  <option value="today">Hom nay</option>
                  <option value="3">3 ngay</option>
                  <option value="7">7 ngay</option>
                  <option value="30">30 ngay</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">De xuat them</label>
                <div className="filter-checkbox-list">
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.hasImages}
                      onChange={() => applyFilters({ hasImages: !filters.hasImages }, { resetPage: true })}
                    />
                    <span>Co anh that</span>
                  </label>
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.verifiedSeller}
                      onChange={() => applyFilters({ verifiedSeller: !filters.verifiedSeller }, { resetPage: true })}
                    />
                    <span>Nguoi ban da xac minh</span>
                  </label>
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={() => applyFilters({ inStock: !filters.inStock }, { resetPage: true })}
                    />
                    <span>Con hang</span>
                  </label>
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.negotiable}
                      onChange={() => applyFilters({ negotiable: !filters.negotiable }, { resetPage: true })}
                    />
                    <span>Co the thuong luong</span>
                  </label>
                </div>
              </div>

              {hasActiveFilters && (
                <button type="button" className="filter-clear-btn" onClick={handleClearFilters}>
                  ✕ Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </section>

        {activeFilterTags.length > 0 && (
          <section className="active-filters">
            <span>Dang loc:</span>
            <div className="active-filter-tags">
              {activeFilterTags.map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  className="active-filter-tag"
                  onClick={() => {
                    if (tag.key === 'search') {
                      setSearchInput('');
                      applyFilters({ search: '' }, { resetPage: true });
                      return;
                    }

                    if (tag.key.startsWith('cat-')) {
                      const value = tag.key.replace('cat-', '');
                      applyFilters({
                        categories: filters.categories.filter((cat) => cat !== value),
                      }, { resetPage: true });
                      return;
                    }

                    if (tag.key.startsWith('cond-')) {
                      const value = tag.key.replace('cond-', '');
                      applyFilters({
                        conditions: filters.conditions.filter((cond) => cond !== value),
                      }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'price') {
                      applyFilters({ minPrice: '', maxPrice: '' }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'city') {
                      applyFilters({ city: '', district: '' }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'district') {
                      applyFilters({ district: '' }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'posted') {
                      applyFilters({ postedWithin: '' }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'images') {
                      applyFilters({ hasImages: false }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'verified') {
                      applyFilters({ verifiedSeller: false }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'stock') {
                      applyFilters({ inStock: true }, { resetPage: true });
                      return;
                    }

                    if (tag.key === 'negotiable') {
                      applyFilters({ negotiable: false }, { resetPage: true });
                    }
                  }}
                >
                  {tag.label} ✕
                </button>
              ))}
              <button type="button" className="active-filter-clear" onClick={handleClearFilters}>
                Xoa tat ca
              </button>
            </div>
          </section>
        )}

        {/* Results Info */}
        {!isLoading && (
          <div className="results-info">
            <span>Tìm thấy {pagination.total} sản phẩm</span>
            {filters.search && <span className="results-query">cho &quot;{filters.search}&quot;</span>}
          </div>
        )}

        {!isLoading && pagination.total > 0 && (
          <div className="results-toolbar">
            <span>Hiển thị {shownCount} / {pagination.total} sản phẩm</span>
            <div className="results-limit">
              <span>Mỗi trang:</span>
              <select
                value={filters.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className="form-feedback error">{error}</p>}

        {/* Product Grid */}
        {isLoading ? (
          <div className="product-grid">
            {Array.from({ length: Math.min(filters.limit, 12) }).map((_, i) => (
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
              {products.map((product) => {
                const isWishlisted = wishlistIds.has(product.id);
                const ratingValue = Number(product.avg_rating || 0).toFixed(1);
                const ratingCount = Number(product.rating_count || 0);
                const timeAgo = formatTimeAgo(product.created_at);
                return (
                  <article
                    key={product.id}
                    className={`product-card ${product.status === 'sold' ? 'is-sold' : ''}`}
                  >
                    <div className="product-card-image-wrap">
                      <Link to={`/products/${product.id}`} className="product-card-image-link">
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
                      </Link>
                      {product.status === 'sold' && (
                        <span className="product-sold-badge">Đã bán</span>
                      )}
                      {product.is_negotiable && (
                        <span className="product-negotiable-badge">Có thể thương lượng</span>
                      )}
                      {product.condition && (
                        <span className={`product-condition-badge condition-${product.condition}`}>
                          {CONDITIONS.find((c) => c.value === product.condition)?.label || product.condition}
                        </span>
                      )}
                      <div className="product-card-overlay">
                        <Link
                          to={`/chat?receiver=${product.seller_id}&product=${product.id}`}
                          className="product-overlay-btn"
                        >
                          Nhắn tin ngay
                        </Link>
                        <button
                          type="button"
                          className={`product-overlay-btn outline ${isWishlisted ? 'active' : ''}`}
                          onClick={(event) => {
                            event.preventDefault();
                            handleToggleWishlist(product.id);
                          }}
                        >
                          {isWishlisted ? '❤️ Đã lưu' : '🤍 Lưu'}
                        </button>
                      </div>
                    </div>
                    <div className="product-card-body">
                      <Link to={`/products/${product.id}`} className="product-card-title-link">
                        <h3 className="product-card-title">{product.title}</h3>
                      </Link>
                      <p className="product-card-price">{formatCurrency(product.price)}</p>
                      <div className="product-card-stats">
                        <span>👁 {formatCompactCount(product.view_count)}</span>
                        <span>💬 {formatCompactCount(product.comment_count)}</span>
                        <span>⭐ {ratingValue} ({ratingCount})</span>
                      </div>
                      <div className="product-card-meta">
                        <span className="product-card-seller">
                          {product.profiles?.full_name || 'Nguoi ban'}
                          {product.profiles?.verified && (
                            <span className="verified-badge">Đã xác minh</span>
                          )}
                        </span>
                        <span className="product-card-location">
                          {product.location || 'Toan quoc'}
                          {timeAgo ? ` · ${timeAgo}` : ''}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  type="button"
                  className="page-arrow"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  ← Trang trước
                </button>
                <div className="pagination-pages">
                  {paginationItems.map((item) => {
                    if (typeof item === 'string') {
                      return (
                        <span key={item} className="page-ellipsis">...</span>
                      );
                    }

                    return (
                      <button
                        key={item}
                        type="button"
                        className={`page-number ${pagination.page === item ? 'active' : ''}`}
                        onClick={() => handlePageChange(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="page-arrow"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </>
        )}

        <section className="home-footer">
          <div className="home-footer-grid">
            <div className="home-footer-col">
              <h3>Ho tro khach hang</h3>
              <ul>
                <li><a href="#">Trung tam tro giup</a></li>
                <li><a href="#">An toan mua ban</a></li>
                <li><a href="#">Lien he ho tro</a></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h3>Ve ReMarket</h3>
              <ul>
                <li><a href="#">Gioi thieu</a></li>
                <li><a href="#">Quy che hoat dong san</a></li>
                <li><a href="#">Chinh sach bao mat</a></li>
                <li><a href="#">Giai quyet tranh chap</a></li>
                <li><a href="#">Tuyen dung</a></li>
                <li><a href="#">Truyen thong</a></li>
                <li><a href="#">Blog</a></li>
              </ul>
            </div>

            <div className="home-footer-col">
              <h3>Lien ket</h3>
              <div className="home-footer-social">
                <a href="#" aria-label="LinkedIn">in</a>
                <a href="#" aria-label="YouTube">yt</a>
                <a href="#" aria-label="Facebook">f</a>
              </div>
              <div className="home-footer-contact">
                <p>Email: contact@remarket.vn</p>
                <p>CSKH: 19000000 (1.000d/phut)</p>
                <p>Dia chi: Tang 18, toa nha UOA, so 6 duong Tan Trao, TP. Ho Chi Minh</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ClientHomePage;
