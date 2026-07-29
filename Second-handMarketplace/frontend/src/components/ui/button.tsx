import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding text-sm font-semibold transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        outline:
          'border-border bg-background text-foreground shadow-sm hover:bg-muted aria-expanded:bg-muted dark:border-input dark:bg-input/30',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary',
        ghost: 'text-foreground hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/25',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: 'h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*=size-])]:size-3',
        sm: 'h-8 gap-1.5 px-3 text-xs [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-11 gap-2 px-5 text-base',
        icon: 'size-10',
        'icon-xs': 'size-7 rounded-md [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-8 rounded-md [&_svg:not([class*=size-])]:size-3.5',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', render, nativeButton, ...props }, ref) => (
    <ButtonPrimitive
      ref={ref}
      render={render}
      nativeButton={nativeButton ?? !render}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

export { Button, buttonVariants, type ButtonProps };
