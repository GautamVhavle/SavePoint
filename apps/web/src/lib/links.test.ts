import { describe, expect, it } from 'vitest';
import { hostOf, isHttpUrl, linksFromRecord, recordFromLinks } from './links';

describe('public links', () => {
  it('drops javascript: and empty rows', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(recordFromLinks([
      { label: 'Ok', url: 'https://twitch.tv/nova' },
      { label: 'Bad', url: 'javascript:alert(1)' },
      { label: '', url: 'https://example.com' },
    ])).toEqual({ Ok: 'https://twitch.tv/nova' });
  });

  it('round-trips a record and surfaces the host', () => {
    const record = { YouTube: 'https://www.youtube.com/@nova' };
    expect(linksFromRecord(record)).toEqual([{ label: 'YouTube', url: 'https://www.youtube.com/@nova' }]);
    expect(hostOf('https://www.youtube.com/@nova')).toBe('youtube.com');
  });
});
