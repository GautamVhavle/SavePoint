import { describe, expect, it } from 'vitest';
import { formatDate, uid } from './utils';

describe('formatDate', () => {
  it('formats bare YYYY-MM-DD dates', () => {
    expect(formatDate('2023-05-01')).toBe('May 2023');
  });

  it('accepts full ISO timestamps without throwing', () => {
    expect(formatDate('2023-05-01T12:30:00Z')).toBe('May 2023');
  });

  it('returns empty strings for missing or invalid values instead of "Invalid Date"', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('uid', () => {
  it('generates unique identifiers', () => {
    const seen = new Set(Array.from({ length: 50 }, () => uid()));
    expect(seen.size).toBe(50);
  });
});
