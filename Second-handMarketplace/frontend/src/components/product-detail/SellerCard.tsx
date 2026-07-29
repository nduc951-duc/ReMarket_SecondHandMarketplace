import { CheckCircle2, MessageCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/domain';

function SellerCard({ product }: { product: Product }) {
  const seller = product.profiles || product.seller;
  if (!seller) return null;
  const sellerName = seller.full_name || seller.display_name || 'Người bán ReMarket';
  const rating =
    'rating_avg' in seller ? Number(seller.rating_avg || 0) : Number(seller.rating || 0);
  const ratingCount = 'rating_count' in seller ? Number(seller.rating_count || 0) : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar
          src={seller.avatar_url}
          alt={sellerName}
          fallback={sellerName}
          className="size-14"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-semibold">{sellerName}</h2>
            {'verified' in seller && Boolean(seller.verified) && (
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Đã xác minh" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold text-warning-foreground dark:text-warning">
              <Star className="size-4 fill-current" />
              {rating.toFixed(1)}
            </span>
            <span>·</span>
            <span>{ratingCount} đánh giá</span>
          </div>
        </div>
        <Button
          render={<Link to={`/chat?receiver=${product.seller_id}&product=${product.id}`} />}
          variant="outline"
          size="sm"
        >
          <MessageCircle />
          Nhắn tin
        </Button>
      </div>
    </section>
  );
}

export { SellerCard };
