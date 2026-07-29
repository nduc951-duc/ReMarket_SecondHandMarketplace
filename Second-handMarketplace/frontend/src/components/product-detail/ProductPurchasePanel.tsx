import {
  CheckCircle2,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getCategoryName, getConditionLabel } from '@/data/marketplaceConfig';
import type { Product } from '@/types/domain';

interface ProductPurchasePanelProps {
  product: Product;
  owner: boolean;
  wishlisted: boolean;
  wishlistLoading?: boolean;
  onBuy: () => void;
  onWishlist: () => void;
  onReport: () => void;
}

function ProductPurchasePanel({
  product,
  owner,
  wishlisted,
  wishlistLoading = false,
  onBuy,
  onWishlist,
  onReport,
}: ProductPurchasePanelProps) {
  const sold = product.status === 'sold';

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
      <Badge variant="primary">{getCategoryName(product.category)}</Badge>
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight">{product.title}</h1>
      <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
        {formatCurrency(product.price)}
      </p>

      <div className="mt-6 grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-3">
        {[
          { icon: CheckCircle2, label: 'Tin đã kiểm duyệt' },
          { icon: ShieldCheck, label: 'Giao dịch bảo vệ' },
          { icon: Truck, label: 'Hỗ trợ COD' },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4 shrink-0 text-primary" />
            {label}
          </span>
        ))}
      </div>

      <dl className="mt-5 space-y-3 rounded-xl bg-muted/55 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Tình trạng</dt>
          <dd className="font-semibold">{getConditionLabel(product.condition)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Khu vực</dt>
          <dd className="flex items-center gap-1.5 font-semibold">
            <MapPin className="size-4 text-primary" />
            {product.location || 'Toàn quốc'}
          </dd>
        </div>
        {sold && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="text-muted-foreground">Trạng thái</dt>
            <dd>
              <Badge variant="danger">Đã bán</Badge>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 space-y-3">
        {owner ? (
          <div className="rounded-xl bg-info/10 p-4 text-center text-sm font-medium text-info">
            Đây là sản phẩm của bạn.
          </div>
        ) : sold ? (
          <Button type="button" disabled className="w-full">
            Sản phẩm đã bán
          </Button>
        ) : (
          <>
            <Button type="button" size="lg" className="w-full" onClick={onBuy}>
              <ShoppingCart />
              Đặt mua ngay
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                render={<Link to={`/chat?receiver=${product.seller_id}&product=${product.id}`} />}
                variant="outline"
              >
                <MessageCircle />
                Nhắn người bán
              </Button>
              <Button
                type="button"
                variant={wishlisted ? 'secondary' : 'outline'}
                onClick={onWishlist}
                disabled={wishlistLoading}
                aria-pressed={wishlisted}
              >
                <Heart fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'Đã lưu' : 'Lưu tin'}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={onReport}
            >
              <Flag />
              Báo cáo sản phẩm
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export { ProductPurchasePanel };
