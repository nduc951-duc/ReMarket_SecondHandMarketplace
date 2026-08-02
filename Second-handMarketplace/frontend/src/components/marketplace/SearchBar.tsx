import { Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  compact?: boolean;
  className?: string;
}

function SearchBar({ initialValue = '', onSearch, compact = false, className }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm',
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tìm iPhone, xe máy, sách, bàn ghế…"
          aria-label="Từ khóa tìm kiếm"
          className={cn(
            'border-0 bg-transparent pl-11 shadow-none focus-visible:ring-0',
            compact ? 'h-10' : 'h-12 text-base',
          )}
        />
      </div>
      <Button type="submit" size={compact ? 'default' : 'lg'} className="rounded-xl">
        <Search className="sm:hidden" />
        <span className="hidden sm:inline">Tìm kiếm</span>
      </Button>
    </form>
  );
}

export default SearchBar;
