"use client";

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/cn';

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'flex h-5 w-5 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg))] transition-colors',
      'data-[state=checked]:border-transparent data-[state=checked]:bg-[hsl(var(--accent))]',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="text-[hsl(var(--accent-fg))]">
      <CheckIcon className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
    {children}
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = 'Checkbox';
