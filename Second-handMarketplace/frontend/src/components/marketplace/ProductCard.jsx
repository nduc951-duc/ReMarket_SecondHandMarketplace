import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, MapPin, Timer } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  formatCompactCount,
  formatCurrency,
  formatTimeAgo,
  getConditionLabel,
} from '../../data/marketplaceConfig';

function getProductImage(product) {
  return product.image_url || product.thumbnail_url || product.images?.[0] || '';
}

function ProductCard({ product, hot = false }) {
  const [liked, setLiked] = useState(false);
  const productImage = getProductImage(product);

  return (
    <article className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-xl shadow-slate-950/30 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-cyan-950/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <Link to={`/products/${product.id}`} className="block h-full w-full">
          {productImage ? (
            <img
              src={productImage}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,#0f172a,#020617)]">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-400">
                Chưa có ảnh
              </span>
            </div>
          )}
        </Link>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col gap-2">
            {(hot || product.isHot) && (
              <span className="rounded-full border border-rose-300/30 bg-rose-500/90 px-3 py-1 text-xs font-black text-white shadow-lg shadow-rose-950/40">
                HOT
              </span>
            )}
            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {getConditionLabel(product.condition)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLiked((value) => !value)}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full border backdrop-blur transition hover:scale-110',
              liked
                ? 'border-rose-300/50 bg-rose-500/20 text-rose-300'
                : 'border-white/15 bg-black/35 text-white hover:bg-white/15',
            )}
            aria-label="Yêu thích"
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-slate-100 transition group-hover:text-cyan-200">
            {product.title}
          </h3>
        </Link>
        <p className="text-xl font-black text-cyan-300">{formatCurrency(product.price)}</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={14} className="shrink-0 text-purple-300" />
            {product.location}
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <Timer size={14} className="text-cyan-300" />
            {formatTimeAgo(product.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={14} className="text-slate-300" />
            {formatCompactCount(product.view_count)} lượt xem
          </span>
          <span className="truncate text-right text-slate-500">{product.category}</span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
