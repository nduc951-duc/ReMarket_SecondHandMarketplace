import type { PropsWithChildren, ReactNode } from 'react';

import Navbar from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

interface MarketplaceLayoutProps extends PropsWithChildren {
  className?: string;
  beforeContent?: ReactNode;
  container?: boolean;
}

function MarketplaceLayout({
  children,
  className,
  beforeContent,
  container = true,
}: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Bỏ qua điều hướng
      </a>
      <Navbar />
      {beforeContent}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'pb-28 pt-6 md:pb-12',
          container && 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

export { MarketplaceLayout };
