import { Link } from 'react-router-dom';

function CategoryCard({ category }) {
  return (
    <Link
      to={`/search?category=${encodeURIComponent(category.name)}`}
      className="group relative min-h-[210px] overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 shadow-lg shadow-slate-950/30 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-cyan-300/40 hover:shadow-cyan-950/40"
    >
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.18),transparent_32%),linear-gradient(135deg,#0f172a,#020617)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-cyan-950/10" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-xl font-bold text-white">{category.name}</h3>
        <p className="mt-1 text-sm font-medium text-cyan-100/85">{category.count || 0} sản phẩm</p>
      </div>
    </Link>
  );
}

export default CategoryCard;
