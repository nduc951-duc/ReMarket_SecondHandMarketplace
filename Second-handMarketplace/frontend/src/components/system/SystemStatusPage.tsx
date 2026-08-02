import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui';

interface SystemStatusPageProps {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  secondaryPath?: string;
  secondaryLabel?: string;
}

function SystemStatusPage({
  code,
  eyebrow,
  title,
  description,
  icon: Icon,
  secondaryPath,
  secondaryLabel,
}: SystemStatusPageProps) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 text-foreground">
      <div className="absolute -left-24 top-1/3 size-72 rounded-full bg-primary/10 blur-3xl" />
      <section className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-lg sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <p className="mt-2 text-7xl font-bold tracking-tighter text-muted">{code}</p>
        <h1 className="-mt-3 text-3xl font-bold">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/app" className={buttonVariants()}>
            <Home className="size-4" />
            Về trang chủ
          </Link>
          {secondaryPath && secondaryLabel && (
            <Link to={secondaryPath} className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft className="size-4" />
              {secondaryLabel}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

export { SystemStatusPage };
