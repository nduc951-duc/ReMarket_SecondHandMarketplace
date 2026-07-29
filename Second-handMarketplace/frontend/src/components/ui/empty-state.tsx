import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className,
}: EmptyStateProps) {
  return (
    <section
      data-slot="empty-state"
      className={cn(
        'flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}

export { EmptyState, type EmptyStateProps };
