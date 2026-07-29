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
      <Navbar />
      {beforeContent}
      <main
        className={cn(
          'pb-24 pt-6 md:pb-12',
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
