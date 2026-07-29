import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex rounded-xl bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      className={cn('mt-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/30', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
