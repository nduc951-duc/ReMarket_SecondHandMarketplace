import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import ProductCard from '@/components/marketplace/ProductCard';
import SearchBar from '@/components/marketplace/SearchBar';
import SearchFilterSidebar, {
  type MarketplaceFilters,
} from '@/components/marketplace/SearchFilterSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/services/categoryService';
import { getProducts } from '@/services/productService';
import type { Category, Product } from '@/types/domain';

const initialFilters: MarketplaceFilters = {
  minPrice: '',
  maxPrice: '',
  category: '',
  conditions: [],
  location: '',
  sort: 'newest',
};

function parseConditions(value: string | null) {
  return value ? value.split(',').filter(Boolean) : [];
}

function readFilters(params: URLSearchParams): MarketplaceFilters {
  return {
    minPrice: params.get('min_price') || '',
    maxPrice: params.get('max_price') || '',
    category: params.get('category') || '',
    conditions: parseConditions(params.get('condition')),
    location: params.get('city') || '',
    sort: params.get('sort') || 'newest',
  };
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border p-3">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>(() => readFilters(searchParams));
  const query = searchParams.get('q') || '';

  useEffect(() => {
    setFilters(readFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const loadProducts = useCallback(async () => {
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
      setProducts(result.products || []);
      setTotal(result.pagination?.total || result.products?.length || 0);
    } catch (loadError) {
      setProducts([]);
      setTotal(0);
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải sản phẩm.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, query]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const syncParams = (nextFilters: MarketplaceFilters, nextQuery = query) => {
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

  const updateFilters = (patch: Partial<MarketplaceFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    syncParams(next);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    syncParams(initialFilters);
  };

  const activeFilters = useMemo(
    () =>
      [
        filters.category && { key: 'category', label: filters.category },
        filters.location && { key: 'location', label: filters.location },
        filters.conditions.length > 0 && {
          key: 'conditions',
          label: `${filters.conditions.length} tình trạng`,
        },
        (filters.minPrice || filters.maxPrice) && { key: 'price', label: 'Khoảng giá' },
      ].filter(Boolean) as Array<{ key: string; label: string }>,
    [filters],
  );

  const removeFilter = (key: string) => {
    if (key === 'category') updateFilters({ category: '' });
    if (key === 'location') updateFilters({ location: '' });
    if (key === 'conditions') updateFilters({ conditions: [] });
    if (key === 'price') updateFilters({ minPrice: '', maxPrice: '' });
  };

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-semibold text-primary">Marketplace</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {query ? `Kết quả cho “${query}”` : 'Tất cả sản phẩm'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLoading ? 'Đang tìm sản phẩm phù hợp…' : `${total} sản phẩm phù hợp`}
            </p>
          </div>
          <Drawer>
            <DrawerTrigger
              render={
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal />
                  Bộ lọc
                  {activeFilters.length > 0 && (
                    <Badge variant="neutral">{activeFilters.length}</Badge>
                  )}
                </Button>
              }
            />
            <DrawerContent side="bottom" className="p-4 pt-12">
              <SearchFilterSidebar
                filters={filters}
                onChange={updateFilters}
                onClear={clearFilters}
                categories={categories}
                className="border-0 p-0"
              />
            </DrawerContent>
          </Drawer>
        </div>
        <SearchBar
          initialValue={query}
          onSearch={(nextQuery) => syncParams(filters, nextQuery)}
          compact
          className="mt-6 bg-muted/35"
        />
      </header>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Đang lọc:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => removeFilter(filter.key)}
              className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              {filter.label}
              <X className="size-3" />
            </button>
          ))}
          <Button variant="ghost" size="xs" onClick={clearFilters}>
            Xóa tất cả
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SearchFilterSidebar
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          categories={categories}
          className="sticky top-24 hidden h-fit lg:block"
        />

        <section aria-live="polite">
          {error ? (
            <ErrorState
              title="Không thể tải kết quả"
              description={error}
              retryLabel="Thử lại"
              onRetry={() => void loadProducts()}
            />
          ) : isLoading ? (
            <ResultsSkeleton />
          ) : products.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 p-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <SearchX className="size-7" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">Chưa tìm thấy sản phẩm phù hợp</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Hãy thử từ khóa rộng hơn hoặc xóa bớt điều kiện lọc.
              </p>
              <Button variant="outline" className="mt-5" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  hot={Number(product.view_count || 0) >= 1000}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </MarketplaceLayout>
  );
}

export default SearchResultsPage;
