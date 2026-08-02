import { CalendarDays, Eye, Images, Tag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatTimeAgo, getCategoryName, getConditionLabel } from '@/data/marketplaceConfig';
import type { Product } from '@/types/domain';

const statusLabels: Record<string, { label: string; variant: 'primary' | 'danger' | 'neutral' }> = {
  active: { label: 'Đang bán', variant: 'primary' },
  sold: { label: 'Đã bán', variant: 'danger' },
  hidden: { label: 'Đã ẩn', variant: 'neutral' },
  inactive: { label: 'Tạm ngưng', variant: 'neutral' },
};

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function ProductInformation({ product, imageCount }: { product: Product; imageCount: number }) {
  const status = statusLabels[product.status] || {
    label: product.status || 'Chưa xác định',
    variant: 'neutral' as const,
  };
  const listingCode = product.id.slice(0, 8).toUpperCase();

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Thông tin tin đăng
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold">Thông tin sản phẩm</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatTimeAgo(product.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Eye className="size-3.5" aria-hidden="true" />
            {Number(product.view_count || 0).toLocaleString('vi-VN')} lượt xem
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Tag className="size-3.5" aria-hidden="true" />
            Mã tin {listingCode}
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <article className="min-w-0 px-5 py-6 sm:px-6 sm:py-7">
          <h3 className="text-base font-semibold">Mô tả từ người bán</h3>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">
            {product.description || 'Người bán chưa bổ sung mô tả cho sản phẩm này.'}
          </p>
        </article>

        <aside className="border-t border-border bg-muted/20 px-5 py-6 lg:border-l lg:border-t-0 sm:px-6">
          <h3 className="text-base font-semibold">Chi tiết tin đăng</h3>
          <dl className="mt-3 divide-y divide-border text-sm">
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <dt className="text-muted-foreground">Danh mục</dt>
              <dd className="text-right font-medium">{getCategoryName(product.category)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Tình trạng</dt>
              <dd className="text-right font-medium">{getConditionLabel(product.condition)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Khu vực</dt>
              <dd className="max-w-[60%] text-right font-medium">
                {product.location || 'Toàn quốc'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Giá bán</dt>
              <dd className="text-right font-medium">
                {product.is_negotiable ? 'Có thể thương lượng' : 'Giá niêm yết'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Images className="size-3.5" aria-hidden="true" />
                Hình ảnh
              </dt>
              <dd className="text-right font-medium tabular-nums">{imageCount} ảnh</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Trạng thái</dt>
              <dd>
                <Badge variant={status.variant}>{status.label}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 pt-3">
              <dt className="text-muted-foreground">Cập nhật</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatDate(product.updated_at || product.created_at)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

export { ProductInformation };
