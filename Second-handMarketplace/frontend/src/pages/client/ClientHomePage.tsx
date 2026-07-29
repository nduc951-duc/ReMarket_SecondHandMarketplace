import { ArrowRight, Recycle, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import CategoryCard from '@/components/marketplace/CategoryCard';
import ProductSection from '@/components/marketplace/ProductSection';
import SearchBar from '@/components/marketplace/SearchBar';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/services/categoryService';
import { getProducts } from '@/services/productService';
import type { Category, Product } from '@/types/domain';

interface HomeSections {
  hot: Product[];
  newest: Product[];
  fresh: Product[];
}

interface HomeCache {
  categories: Category[];
  sections: HomeSections;
  savedAt: number;
}

const emptySections: HomeSections = { hot: [], newest: [], fresh: [] };
const HOME_CACHE_KEY = 'remarket_home_data_v2';
const HOME_CACHE_TTL = 5 * 60 * 1000;

function readHomeCache(): HomeCache | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(HOME_CACHE_KEY) || 'null') as HomeCache | null;
    return cached && Date.now() - cached.savedAt <= HOME_CACHE_TTL ? cached : null;
  } catch {
    return null;
  }
}

function writeHomeCache(categories: Category[], sections: HomeSections) {
  try {
    sessionStorage.setItem(
      HOME_CACHE_KEY,
      JSON.stringify({ categories, sections, savedAt: Date.now() }),
    );
  } catch {
    // Session cache is optional.
  }
}

function buildSections(products: Product[]): HomeSections {
  return {
    hot: [...products]
      .sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))
      .slice(0, 8),
    newest: [...products]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 8),
    fresh: products
      .filter((product) => ['new', 'like_new'].includes(product.condition || ''))
      .slice(0, 8),
  };
}

function MarketplaceSkeleton() {
  return (
    <div className="space-y-12" aria-label="Đang tải sản phẩm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section} className="space-y-5">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-border p-3">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ClientHomePage() {
  const navigate = useNavigate();
  const [cached] = useState<HomeCache | null>(readHomeCache);
  const [sections, setSections] = useState<HomeSections>(cached?.sections || emptySections);
  const [categories, setCategories] = useState<Category[]>(cached?.categories || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState('');

  const loadHome = useCallback(async () => {
    try {
      if (!cached) setIsLoading(true);
      setError('');
      const [categoryList, productResult] = await Promise.all([
        getCategories(),
        getProducts({ page: 1, limit: 50, sort: 'newest' }),
      ]);
      const nextSections = buildSections(productResult.products || []);
      setCategories(categoryList);
      setSections(nextSections);
      writeHomeCache(categoryList, nextSections);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu marketplace.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [cached]);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const handleSearch = (query: string) => {
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <MarketplaceLayout className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/12 via-card to-secondary p-6 shadow-sm sm:p-10 lg:p-14">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="size-3.5" />
            Marketplace đồ cũ đáng tin cậy
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Món đồ bạn cần có thể đang ở rất gần.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Khám phá sản phẩm còn tốt, trao đổi trực tiếp với người bán và theo dõi giao dịch minh
            bạch trên ReMarket.
          </p>
          <SearchBar onSearch={handleSearch} className="mt-8 max-w-2xl bg-background/90" />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button render={<Link to="/products/new" />} size="lg" className="rounded-full">
              Đăng tin miễn phí
              <ArrowRight />
            </Button>
            <Button
              render={<Link to="/search" />}
              variant="outline"
              size="lg"
              className="rounded-full bg-background/70"
            >
              Xem tất cả sản phẩm
            </Button>
          </div>
        </div>

        <div className="relative mt-10 grid gap-3 border-t border-border/70 pt-6 sm:grid-cols-3 lg:max-w-3xl">
          {[
            { icon: ShieldCheck, title: 'Giao dịch rõ ràng', text: 'Trạng thái đơn minh bạch' },
            { icon: Recycle, title: 'Tiêu dùng bền vững', text: 'Kéo dài vòng đời sản phẩm' },
            { icon: Sparkles, title: 'Đăng tin đơn giản', text: 'Tiếp cận người mua nhanh' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && sections.newest.length === 0 ? (
        <ErrorState
          title="Chưa thể tải marketplace"
          description={error}
          retryLabel="Thử lại"
          onRetry={() => void loadHome()}
        />
      ) : (
        <>
          {error && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              Dữ liệu mới chưa tải được. ReMarket đang hiển thị dữ liệu gần nhất.
            </div>
          )}

          <section className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-primary">Khám phá nhanh</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Danh mục nổi bật
              </h2>
            </div>
            {isLoading ? (
              <MarketplaceSkeleton />
            ) : categories.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categories.slice(0, 8).map((category) => (
                  <CategoryCard key={category.id || category.name} category={category} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Chưa có danh mục để hiển thị.
              </p>
            )}
          </section>

          {!isLoading && (
            <>
              <ProductSection
                title="Được quan tâm nhiều"
                subtitle="Những sản phẩm đang có nhiều lượt xem nhất."
                products={sections.hot}
                hot
                query="sort=view_desc"
              />
              <ProductSection
                title="Vừa được đăng"
                subtitle="Xem sớm để không bỏ lỡ món phù hợp."
                products={sections.newest}
                query="sort=newest"
              />
              <ProductSection
                title="Tình trạng còn mới"
                subtitle="Các sản phẩm mới hoặc gần như mới."
                products={sections.fresh}
                query="condition=new,like_new"
              />
            </>
          )}
        </>
      )}
    </MarketplaceLayout>
  );
}

export default ClientHomePage;
