import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { conditions, locations, sortOptions } from '@/data/marketplaceConfig';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/domain';

export interface MarketplaceFilters {
  minPrice: string;
  maxPrice: string;
  category: string;
  conditions: string[];
  location: string;
  sort: string;
}

interface SearchFilterSidebarProps {
  filters: MarketplaceFilters;
  onChange: (patch: Partial<MarketplaceFilters>) => void;
  onClear: () => void;
  categories?: Category[];
  className?: string;
}

function SearchFilterSidebar({
  filters,
  onChange,
  onClear,
  categories = [],
  className,
}: SearchFilterSidebarProps) {
  const toggleCondition = (value: string) => {
    onChange({
      conditions: filters.conditions.includes(value)
        ? filters.conditions.filter((item) => item !== value)
        : [...filters.conditions, value],
    });
  };

  return (
    <aside className={cn('space-y-6 rounded-2xl border border-border bg-card p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Bộ lọc</h2>
          <p className="text-xs text-muted-foreground">Thu hẹp kết quả phù hợp với bạn</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <RotateCcw />
          Xóa
        </Button>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Khoảng giá</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => onChange({ minPrice: event.target.value })}
            placeholder="Từ"
            aria-label="Giá thấp nhất"
          />
          <Input
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => onChange({ maxPrice: event.target.value })}
            placeholder="Đến"
            aria-label="Giá cao nhất"
          />
        </div>
      </fieldset>

      <label className="block space-y-2 text-sm font-semibold">
        Danh mục
        <Select
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id || category.name} value={category.name}>
              {category.name}
            </option>
          ))}
        </Select>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Tình trạng</legend>
        <div className="space-y-1">
          {conditions.map((condition) => (
            <label
              key={condition.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Checkbox
                checked={filters.conditions.includes(condition.value)}
                onChange={() => toggleCondition(condition.value)}
              />
              {condition.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2 text-sm font-semibold">
        Khu vực
        <Select
          value={filters.location}
          onChange={(event) => onChange({ location: event.target.value })}
        >
          <option value="">Tất cả khu vực</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </Select>
      </label>

      <label className="block space-y-2 text-sm font-semibold">
        Sắp xếp
        <Select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value })}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
    </aside>
  );
}

export default SearchFilterSidebar;
