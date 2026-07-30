import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Message } from '@/types/domain';

interface ProductCardData {
  id?: string;
  title?: string;
  price?: number;
  image_url?: string;
  url?: string;
}

function ChatProductCard({ message }: { message: Message }) {
  const metadata = (message.metadata || {}) as { label?: string; product?: ProductCardData };
  const product = metadata.product || {};
  const price = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(product.price || 0);

  return (
    <article className="w-full max-w-sm rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {metadata.label || 'Sản phẩm đang trao đổi'}
      </p>
      <Link
        to={product.url || `/products/${product.id}`}
        className="flex gap-3 rounded-xl transition hover:bg-primary/5"
      >
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="size-full object-cover" />
          ) : (
            <Package className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold">{product.title || 'Sản phẩm'}</p>
          <p className="mt-1 text-sm font-bold text-primary">{price}</p>
        </div>
      </Link>
    </article>
  );
}

export { ChatProductCard };
