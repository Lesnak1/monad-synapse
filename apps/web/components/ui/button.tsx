import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-white dark:ring-offset-black',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow dark:bg-brand-600 dark:hover:bg-brand-500',
        ghost: 'bg-black/5 hover:bg-black/10 text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white',
        outline: 'border border-black/20 hover:bg-black/5 text-slate-900 dark:border-white/20 dark:hover:bg-white/5 dark:text-white',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}


