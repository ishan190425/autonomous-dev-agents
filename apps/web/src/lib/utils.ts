import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind classes with proper override handling
 * Standard pattern for shadcn/ui compatibility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
