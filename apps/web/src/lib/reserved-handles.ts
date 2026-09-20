/**
 * Handles that would collide with first-party routes or look official.
 * Keep in sync with api/_lib/validation.ts RESERVED_HANDLES.
 */
export const RESERVED_HANDLES = [
  'about', 'admin', 'api', 'auth', 'contact', 'dashboard', 'explore', 'faq',
  'help', 'index', 'legal', 'login', 'logout', 'official', 'onboarding',
  'privacy', 'root', 'savepoint', 'security', 'settings', 'signup', 'staff',
  'static', 'status', 'studio', 'support', 'system', 'terms', 'www',
] as const;

export const reservedHandleMessage = 'That handle is reserved for SavePoint.';

export function isReservedHandle(handle: string): boolean {
  return (RESERVED_HANDLES as readonly string[]).includes(handle.trim().toLowerCase());
}
