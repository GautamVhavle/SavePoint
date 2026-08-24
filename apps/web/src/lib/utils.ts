import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatDate = (value?: string | null) => {
  if (!value) return '';
  // Accept bare dates ("2023-05-01") and full ISO timestamps alike.
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
};
export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
