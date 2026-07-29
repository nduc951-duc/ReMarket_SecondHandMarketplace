import { ArrowRight, PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

import ProductCard from '@/components/marketplace/ProductCard';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/domain';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  hot?: boolean;
  query?: string;
}

function ProductSection({
  title,
  subtitle,
  products,
  hot = false,
  query = '',
}: ProductSectionProps) {
  const to = query ? `/search?${query}` : '/search';

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button
          render={<Link to={to} />}
          variant="ghost"
          className="hidden shrink-0 text-primary sm:inline-flex"
        >
          Xem tất cả
          <ArrowRight />
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 p-8 text-center">
          <PackageSearch className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Chưa có sản phẩm trong mục này</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} hot={hot} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;
