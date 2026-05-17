import { conditions, locations, sortOptions } from '../../data/marketplaceConfig';

function SearchFilterSidebar({ filters, onChange, onClear, categories = [], className = '' }) {
  const toggleCondition = (value) => {
    const exists = filters.conditions.includes(value);
    onChange({
      conditions: exists
        ? filters.conditions.filter((item) => item !== value)
        : [...filters.conditions, value],
    });
  };

  return (
    <div className={`space-y-6 rounded-[28px] border border-white/10 bg-slate-950/75 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">Bộ lọc</h2>
        <button type="button" onClick={onClear} className="text-sm font-bold text-cyan-300 hover:text-cyan-100">
          Xóa lọc
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-300">Khoảng giá</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(event) => onChange({ minPrice: event.target.value })}
            placeholder="Từ"
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/60"
          />
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(event) => onChange({ maxPrice: event.target.value })}
            placeholder="Đến"
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-cyan-300/60"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-300">Danh mục</label>
        <select
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
          className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.name} value={category.name}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-300">Tình trạng sản phẩm</label>
        <div className="space-y-2">
          {conditions.map((condition) => (
            <label key={condition.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
              <input
                type="checkbox"
                checked={filters.conditions.includes(condition.value)}
                onChange={() => toggleCondition(condition.value)}
                className="h-4 w-4 accent-cyan-300"
              />
              {condition.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-300">Khu vực</label>
        <select
          value={filters.location}
          onChange={(event) => onChange({ location: event.target.value })}
          className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
        >
          <option value="">Tất cả khu vực</option>
          {locations.map((location) => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-300">Sắp xếp theo</label>
        <select
          value={filters.sort}
          onChange={(event) => onChange({ sort: event.target.value })}
          className="h-11 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default SearchFilterSidebar;
