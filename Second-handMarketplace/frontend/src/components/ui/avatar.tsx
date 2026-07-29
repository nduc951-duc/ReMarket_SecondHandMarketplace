import { UserRound } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

interface AvatarProps extends Omit<ComponentProps<'div'>, 'children'> {
  src?: string | null;
  alt: string;
  fallback?: string;
  imageClassName?: string;
}

function Avatar({ src, alt, fallback, className, imageClassName, ...props }: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground',
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className={cn('size-full object-cover', imageClassName)} />
      ) : fallback ? (
        <span aria-label={alt}>{fallback.slice(0, 2).toUpperCase()}</span>
      ) : (
        <UserRound aria-label={alt} className="size-5" />
      )}
    </div>
  );
}

export { Avatar };
