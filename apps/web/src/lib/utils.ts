import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : ' - ';
export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
