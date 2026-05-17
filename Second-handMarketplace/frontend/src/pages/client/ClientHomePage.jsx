import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import CategoryCard from '../../components/marketplace/CategoryCard';
import ProductSection from '../../components/marketplace/ProductSection';
import SearchBar from '../../components/marketplace/SearchBar';
import SidebarCategory from '../../components/marketplace/SidebarCategory';
import { getCategories } from '../../services/categoryService';
import { getProducts } from '../../services/productService';

const emptySections = {
  hot: [],
  newest: [],
  fresh: [],
  all: [],
};
const HOME_CACHE_KEY = 'remarket_home_data_v1';
const HOME_CACHE_TTL = 5 * 60 * 1000;

function readHomeCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(HOME_CACHE_KEY) || 'null');
    if (!cached || Date.now() - cached.savedAt > HOME_CACHE_TTL) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeHomeCache(payload) {
  try {
    sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
      ...payload,
      savedAt: Date.now(),
    }));
  } catch {
    // Cache is only a UX enhancement.
  }
}

function buildSections(products) {
  const list = products || [];
  return {
    hot: [...list].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)).slice(0, 6),
    newest: [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
    fresh: list.filter((product) => ['new', 'like_new'].includes(product.condition)).slice(0, 6),
    all: list,
  };
}

function ProductSectionSkeleton() {
  return (
    <section className="space-y-5">
      <div className="h-8 w-64 animate-pulse rounded-full bg-white/10" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
            <div className="aspect-[4/3] animate-pulse bg-white/10" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
              <div className="h-6 w-1/2 animate-pulse rounded-full bg-cyan-300/15" />
              <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientHomePage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(emptySections);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const cached = readHomeCache();

    if (cached) {
      setCategories(cached.categories || []);
      setSections(cached.sections || emptySections);
      setIsLoading(false);
    }

    async function loadHomeProducts() {
      try {
        if (!cached) setIsLoading(true);
        setError('');

        const [categoryList, productResult] = await Promise.all([
          getCategories(),
          getProducts({ page: 1, limit: 50, sort: 'newest' }),
        ]);

        if (!isMounted) return;

        const nextSections = buildSections(productResult.products || []);
        setCategories(categoryList);
        setSections(nextSections);
        writeHomeCache({ categories: categoryList, sections: nextSections });
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError.message || 'Không thể tải sản phẩm từ database.');
        if (!cached) setSections(emptySections);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHomeProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (query) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />

      <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 pb-14 pt-6 sm:px-6">
        <SidebarCategory categories={categories} />

        <div className="min-w-0 flex-1 space-y-12">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 px-5 py-10 shadow-xl shadow-slate-950/30 backdrop-blur md:px-10 md:py-14">
            <div className="relative mx-auto max-w-4xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
                ReMarket
              </p>
              <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
                Mua bán đồ cũ quanh bạn
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400 md:text-lg">
                Tìm món còn dùng tốt, xem người bán rõ ràng và lưu lại những tin đáng cân nhắc.
              </p>

              <div className="mx-auto mt-8 max-w-3xl">
                <SearchBar onSearch={handleSearch} />
              </div>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/products/new"
                  className="w-full rounded-full bg-cyan-300 px-7 py-3 text-center font-black text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-200 sm:w-auto"
                >
                  Đăng tin ngay
                </Link>
                <Link
                  to="/search"
                  className="w-full rounded-full border border-white/10 bg-white/[0.05] px-7 py-3 text-center font-bold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08] sm:w-auto"
                >
                  Khám phá sản phẩm
                </Link>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-[24px] border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
              {error}
            </div>
          )}

          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-white md:text-3xl">Danh mục nổi bật</h2>
              <p className="mt-1 text-sm text-slate-400">Các nhóm hàng đang có tin rao trên hệ thống.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.name} category={category} />
              ))}
            </div>
          </section>

          {isLoading ? (
            <ProductSectionSkeleton />
          ) : (
            <>
              <ProductSection
                title="Sản phẩm đang hot"
                subtitle="Dựa trên số lượt xem nhiều nhất."
                products={sections.hot}
                hot
                query="sort=view_desc"
              />

              <ProductSection
                title="Sản phẩm mới nhất"
                subtitle="Các tin vừa được đăng gần đây."
                products={sections.newest}
                query="sort=newest"
              />

              <ProductSection
                title="Sản phẩm còn mới"
                subtitle="Tình trạng mới hoặc như mới."
                products={sections.fresh}
                query="condition=new,like_new"
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default ClientHomePage;
