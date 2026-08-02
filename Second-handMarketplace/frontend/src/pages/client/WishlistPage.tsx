import { Heart, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import ProductCard from '@/components/marketplace/ProductCard';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getWishlist } from '@/services/wishlistService';
import type { WishlistItem } from '@/types/domain';

function WishlistSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border p-3">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-7 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWishlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getWishlist({ limit: 50 });
      setItems((data.items || []).filter((item) => item.product));
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách đã lưu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  const handleWishlistChange = (productId: string, wishlisted: boolean) => {
    if (!wishlisted) {
      setItems((current) => current.filter((item) => item.product_id !== productId));
    }
  };

  return (
    <MarketplaceLayout className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Bộ sưu tập của bạn</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Tin đã lưu</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Giữ lại những món đáng cân nhắc để so sánh hoặc liên hệ người bán sau.
          </p>
        </div>
        <span className="w-fit rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          {items.length} sản phẩm
        </span>
      </header>

      {error ? (
        <ErrorState
          title="Không thể tải tin đã lưu"
          description={error}
          retryLabel="Thử lại"
          onRetry={() => void loadWishlist()}
        />
      ) : isLoading ? (
        <WishlistSkeleton />
      ) : items.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 p-8 text-center">
          <span className="relative grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="size-8" />
            <Search className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background p-1" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">Bạn chưa lưu sản phẩm nào</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Khi thấy một món phù hợp, chọn biểu tượng trái tim để quay lại xem nhanh tại đây.
          </p>
          <Button render={<Link to="/search" />} className="mt-6">
            Khám phá sản phẩm
          </Button>
        </div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(
            (item) =>
              item.product && (
                <ProductCard
                  key={item.product_id}
                  product={item.product}
                  initialWishlisted
                  onWishlistChange={handleWishlistChange}
                />
              ),
          )}
        </section>
      )}
    </MarketplaceLayout>
  );
}

export default WishlistPage;
