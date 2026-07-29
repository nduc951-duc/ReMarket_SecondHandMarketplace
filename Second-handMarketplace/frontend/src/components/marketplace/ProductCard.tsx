import { Eye, Heart, ImageOff, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  formatCompactCount,
  formatCurrency,
  formatTimeAgo,
  getCategoryName,
  getConditionLabel,
} from '@/data/marketplaceConfig';
import { cn } from '@/lib/utils';
import { toggleWishlist } from '@/services/wishlistService';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/domain';

interface ProductCardProps {
  product: Product;
  hot?: boolean;
  initialWishlisted?: boolean;
  onWishlistChange?: (productId: string, wishlisted: boolean) => void;
}

function getProductImage(product: Product) {
  return product.image_url || product.thumbnail_url || product.images?.[0] || '';
}

function ProductCard({
  product,
  hot = false,
  initialWishlisted = false,
  onWishlistChange,
}: ProductCardProps) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const productImage = getProductImage(product);

  const handleWishlist = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      setIsUpdatingWishlist(true);
      const result = await toggleWishlist(product.id);
      const nextWishlisted = Boolean(result?.wishlisted);
      setWishlisted(nextWishlisted);
      onWishlistChange?.(product.id, nextWishlisted);
    } catch (error) {
      toast({
        title: 'Không thể cập nhật tin đã lưu',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        tone: 'error',
      });
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link to={`/products/${product.id}`} className="block size-full">
          {productImage && !imageFailed ? (
            <img
              src={productImage}
              alt={product.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-8" />
              <span className="text-xs font-medium">Chưa có ảnh</span>
            </div>
          )}
        </Link>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-2">
            {(hot || product.isHot) && (
              <Badge variant="danger" className="shadow-sm">
                Phổ biến
              </Badge>
            )}
            <Badge className="border-white/20 bg-black/55 text-white backdrop-blur">
              {getConditionLabel(product.condition)}
            </Badge>
          </div>
          <button
            type="button"
            onClick={handleWishlist}
            disabled={isUpdatingWishlist}
            className={cn(
              'grid size-10 place-items-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur transition hover:scale-105 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/50 disabled:opacity-60',
              wishlisted && 'border-rose-300/50 bg-rose-500 text-white hover:bg-rose-500',
            )}
            aria-label={wishlisted ? 'Bỏ khỏi danh sách đã lưu' : 'Lưu sản phẩm'}
            aria-pressed={wishlisted}
          >
            <Heart className="size-4" fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <Link to={`/products/${product.id}`}>
            <h3 className="line-clamp-2 min-h-12 font-semibold leading-6 text-card-foreground transition group-hover:text-primary">
              {product.title}
            </h3>
          </Link>
          <p className="mt-1 text-xl font-bold tracking-tight text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0" />
            {product.location || 'Toàn quốc'}
          </span>
          <span className="shrink-0">{formatTimeAgo(product.created_at)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="size-3.5" />
            {formatCompactCount(product.view_count)} lượt xem
          </span>
          <span className="max-w-[45%] truncate">{getCategoryName(product.category)}</span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
