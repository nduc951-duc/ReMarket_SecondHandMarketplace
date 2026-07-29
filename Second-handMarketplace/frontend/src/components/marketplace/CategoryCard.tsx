import { ArrowUpRight, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Category } from '@/types/domain';

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/search?category=${encodeURIComponent(category.name)}`}
      className="group relative min-h-44 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg"
    >
      {category.image_url ? (
        <img
          src={category.image_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary to-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      {!category.image_url && (
        <PackageOpen className="absolute right-5 top-5 size-9 text-primary/45" aria-hidden="true" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
        <div>
          <h3 className="font-semibold">{category.name}</h3>
          <p className="mt-1 text-xs text-white/70">{category.count || 0} sản phẩm</p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-black">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export default CategoryCard;
