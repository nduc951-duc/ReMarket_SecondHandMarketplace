import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import ProductCard from '../../components/marketplace/ProductCard';
import SearchBar from '../../components/marketplace/SearchBar';
import SearchFilterSidebar from '../../components/marketplace/SearchFilterSidebar';
import SidebarCategory from '../../components/marketplace/SidebarCategory';
import { getCategories } from '../../services/categoryService';
import { getProducts } from '../../services/productService';

const initialFilters = {
  minPrice: '',
  maxPrice: '',
  category: '',
  conditions: [],
  location: '',
  sort: 'newest',
};

function parseConditions(value) {
  return value ? value.split(',').filter(Boolean) : [];
}

function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    ...initialFilters,
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    category: searchParams.get('category') || '',
    conditions: parseConditions(searchParams.get('condition')),
    location: searchParams.get('city') || '',
    sort: searchParams.get('sort') || 'newest',
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const categoryList = await getCategories();
        if (isMounted) setCategories(categoryList);
      } catch {
        if (isMounted) setCategories([]);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const nextFilters = {
      ...initialFilters,
      minPrice: searchParams.get('min_price') || '',
      maxPrice: searchParams.get('max_price') || '',
      category: searchParams.get('category') || '',
      conditions: parseConditions(searchParams.get('condition')),
      location: searchParams.get('city') || '',
      sort: searchParams.get('sort') || 'newest',
    };
    setFilters(nextFilters);
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadSearchProducts() {
      try {
        setIsLoading(true);
        setError('');

        const result = await getProducts({
          page: 1,
          limit: 24,
          search: query,
          category: filters.category,
          condition: filters.conditions.join(','),
          min_price: filters.minPrice,
          max_price: filters.maxPrice,
          city: filters.location,
          sort: filters.sort,
        });

        if (!isMounted) return;
        setProducts(result.products || []);
        setPagination(result.pagination || { total: 0 });
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError.message || 'Không thể tải sản phẩm từ database.');
        setProducts([]);
        setPagination({ total: 0 });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSearchProducts();

    return () => {
      isMounted = false;
    };
  }, [filters, query]);

  const syncParams = (nextFilters, nextQuery = query) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextFilters.category) params.set('category', nextFilters.category);
    if (nextFilters.conditions.length) params.set('condition', nextFilters.conditions.join(','));
    if (nextFilters.minPrice) params.set('min_price', nextFilters.minPrice);
    if (nextFilters.maxPrice) params.set('max_price', nextFilters.maxPrice);
    if (nextFilters.location) params.set('city', nextFilters.location);
    if (nextFilters.sort !== 'newest') params.set('sort', nextFilters.sort);
    setSearchParams(params);
  };

  const updateFilters = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    syncParams(next);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    syncParams(initialFilters);
  };

  const handleSearch = (nextQuery) => {
    syncParams(filters, nextQuery);
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />

      <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 pb-14 pt-6 sm:px-6">
        <SidebarCategory activeCategory={filters.category} categories={categories} />

        <div className="min-w-0 flex-1 space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/35 backdrop-blur-xl md:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Search Result</p>
                <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">
                  {query ? `Kết quả cho "${query}"` : 'Tất cả sản phẩm'}
                </h1>
                <p className="mt-1 text-sm text-slate-400">{pagination.total || products.length} sản phẩm phù hợp</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 lg:hidden"
              >
                <SlidersHorizontal size={17} />
                Bộ lọc
              </button>
            </div>
            <SearchBar initialValue={query} onSearch={handleSearch} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <SearchFilterSidebar
              filters={filters}
              onChange={updateFilters}
              onClear={clearFilters}
              categories={categories}
              className="sticky top-24 hidden h-fit lg:block"
            />

            <section>
              {error && (
                <div className="mb-5 rounded-[24px] border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-10 text-center text-slate-400">
                  Đang tải sản phẩm từ database...
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-10 text-center shadow-xl shadow-slate-950/30">
                  <h2 className="text-2xl font-black text-white">Không tìm thấy sản phẩm</h2>
                  <p className="mt-2 text-slate-400">Database chưa có sản phẩm phù hợp với bộ lọc này.</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} hot={Number(product.view_count || 0) >= 1000} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Đóng bộ lọc"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[34px] border border-white/10 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-black text-white">Bộ lọc tìm kiếm</span>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <SearchFilterSidebar filters={filters} onChange={updateFilters} onClear={clearFilters} categories={categories} />
          </div>
        </div>
      )}
    </main>
  );
}

export default SearchResultsPage;
