"use client";

import * as SliderPrimitive from '@radix-ui/react-slider';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/cn';

export const Slider = forwardRef<
  ElementRef<typeof SliderPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex h-5 w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[hsl(var(--border))]">
      <SliderPrimitive.Range className="absolute h-full bg-[hsl(var(--accent))]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg))] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" />
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg))] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" />
  </SliderPrimitive.Root>
));

Slider.displayName = 'Slider';
