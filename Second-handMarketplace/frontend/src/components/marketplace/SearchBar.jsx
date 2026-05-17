import { useState } from 'react';
import { Search } from 'lucide-react';

function SearchBar({ initialValue = '', onSearch }) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="group relative overflow-hidden rounded-[26px] border border-cyan-300/20 bg-white/[0.06] p-2 shadow-lg shadow-slate-950/25 backdrop-blur-2xl transition focus-within:border-cyan-300/60"
    >
      <div className="relative flex flex-col gap-3 sm:flex-row">
        <label className="relative flex min-h-16 flex-1 items-center">
          <Search className="absolute left-5 text-cyan-200" size={24} />
          <input
            id="home-search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Tìm iPhone, xe máy, sách, bàn ghế..."
            className="h-16 w-full rounded-[24px] border border-white/10 bg-slate-950/65 pl-14 pr-4 text-base font-semibold text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/30 sm:text-lg"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-16 items-center justify-center gap-2 rounded-[22px] bg-cyan-300 px-7 text-base font-black text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-200"
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
