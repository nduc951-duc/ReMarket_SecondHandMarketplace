import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Home,
  Laptop,
  MoreHorizontal,
  Shirt,
  Smartphone,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const iconMap = {
  'Điện thoại & Máy tính bảng': Smartphone,
  'Máy tính & Laptop': Laptop,
  'Thời trang & Phụ kiện': Shirt,
  'Sách & Tài liệu học tập': BookOpen,
  'Phương tiện di chuyển': Bike,
  'Thể thao & Dã ngoại': Dumbbell,
  'Điện tử': Laptop,
  'Thời trang': Shirt,
  'Đồ gia dụng': Home,
  'Sách vở': BookOpen,
  'Thể thao': Dumbbell,
  'Ô tô - Xe máy': Bike,
  'Bất động sản': Building2,
  Khác: MoreHorizontal,
};

function SidebarCategory({ activeCategory = '', categories = [] }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-24 h-[calc(100vh-7rem)] w-16 shrink-0 overflow-hidden rounded-[24px] border border-cyan-300/10 bg-slate-950/75 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl transition-all duration-300 sm:w-20 lg:rounded-[28px]',
        collapsed ? 'lg:w-20' : 'lg:w-64',
      )}
    >
      <div className="flex h-full flex-col p-3">
        <div className="mb-3 flex items-center justify-center px-0 py-2 lg:justify-between lg:px-2">
          {!collapsed && (
            <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 lg:inline">
              Danh mục
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-200 lg:grid"
            aria-label={collapsed ? 'Mở rộng danh mục' : 'Thu gọn danh mục'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="space-y-2">
          {categories.map((category) => {
            const Icon = iconMap[category.name] || MoreHorizontal;
            const active = activeCategory === category.name;
            return (
              <Link
                key={category.name}
                to={`/search?category=${encodeURIComponent(category.name)}`}
                className={cn(
                  'group flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                    : 'border-transparent text-slate-400 hover:border-cyan-300/30 hover:bg-white/[0.06] hover:text-white',
                  'justify-center px-0 lg:justify-start lg:px-3',
                  collapsed && 'lg:justify-center lg:px-0',
                )}
                title={category.name}
              >
                <Icon size={20} className="shrink-0 transition group-hover:scale-110" />
                {!collapsed && <span className="hidden truncate lg:inline">{category.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default SidebarCategory;
