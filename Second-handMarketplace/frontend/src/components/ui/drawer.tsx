import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const Drawer = DrawerPrimitive.Root;
const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerClose = DrawerPrimitive.Close;

function DrawerContent({
  className,
  children,
  side = 'right',
  ...props
}: ComponentProps<typeof DrawerPrimitive.Popup> & { side?: 'left' | 'right' | 'bottom' }) {
  const sideClass = {
    left: 'inset-y-0 left-0 h-full w-[min(90vw,24rem)] rounded-r-2xl',
    right: 'inset-y-0 right-0 h-full w-[min(90vw,24rem)] rounded-l-2xl',
    bottom: 'inset-x-0 bottom-0 max-h-[88vh] w-full rounded-t-2xl',
  }[side];

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/65" />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 pointer-events-none">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            'pointer-events-auto fixed overflow-y-auto border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none transition-transform',
            sideClass,
            className,
          )}
          {...props}
        >
          {children}
          <DrawerPrimitive.Close
            aria-label="Đóng bảng điều khiển"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <X className="size-4" />
          </DrawerPrimitive.Close>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export { Drawer, DrawerClose, DrawerContent, DrawerTrigger };
