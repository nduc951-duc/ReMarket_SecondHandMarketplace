import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';

function ProductSection({ title, subtitle, products, hot = false, query = '' }) {
  const to = query ? `/search?${query}` : '/search';

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <Link
          to={to}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/20"
        >
          Xem thêm
          <ArrowRight size={16} />
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-center text-sm font-semibold text-slate-400">
          Chưa có sản phẩm trong mục này.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} hot={hot} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;
