import type { SocialLink } from '../types';
export type { SocialLink };

/** Common destinations a curator puts in a bio. URLs are starting hints, not required. */
export const LINK_PRESETS = [
  'Twitch', 'YouTube', 'Steam', 'Discord', 'X', 'GitHub',
  'Instagram', 'TikTok', 'Bluesky', 'Spotify', 'Website',
] as const;

const HTTP = /^https?:\/\//i;

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function linksFromRecord(record: Record<string, string> | null | undefined): SocialLink[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, url]) => typeof url === 'string' && HTTP.test(url))
    .map(([label, url]) => ({ label, url }));
}

export function recordFromLinks(links: SocialLink[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const link of links) {
    const label = link.label.trim().slice(0, 40);
    const url = link.url.trim();
    if (!label || !isHttpUrl(url)) continue;
    let key = label;
    let n = 2;
    while (key in out) {
      key = `${label} (${n})`.slice(0, 40);
      n += 1;
    }
    out[key] = url;
  }
  return out;
}
