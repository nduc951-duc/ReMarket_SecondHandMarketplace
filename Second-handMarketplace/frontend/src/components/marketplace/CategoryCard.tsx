import { ArrowUpRight, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Category } from '@/types/domain';

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/search?category=${encodeURIComponent(category.name)}`}
      className="group relative min-h-40 overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/35 hover:shadow-md motion-reduce:transition-none"
    >
      {category.image_url ? (
        <img
          src={category.image_url}
          alt=""
          loading="lazy"
          width="640"
          height="400"
          className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
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
        <span className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition-colors group-hover:bg-white group-hover:text-black">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export default CategoryCard;
