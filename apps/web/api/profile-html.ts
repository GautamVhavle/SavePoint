import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface ProfilePayload {
  profile: { handle: string; display_name: string; bio: string | null };
  rig: { hero_photo_url: string | null } | null;
  games: Array<{ game: { cover_url: string | null }; featured: boolean; featured_order: number | null }>;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Crawler-only route: social scrapers (Discord/X/LinkedIn/Facebook) never execute
 * React, so /u/:handle is rewritten here for bot user-agents and served the SPA
 * for everyone else (see vercel.json). Returns the real app shell injected with
 * per-profile Open Graph metadata fetched server-side from FastAPI.
 */
export default async function handler(
  req: { query: Record<string, string | string[]> },
  res: {
    setHeader: (key: string, value: string) => void;
    status: (code: number) => { send: (body: string) => void };
  },
) {
  const rawHandle = Array.isArray(req.query.handle) ? req.query.handle[0] : req.query.handle;
  const handle = (rawHandle ?? "").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  let html = await readFile(path.join(process.cwd(), "dist", "index.html"), "utf8");

  if (handle) {
    const apiUrl = process.env.SAVEPOINT_API_URL?.replace(/\/$/, "");
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/profiles/${encodeURIComponent(handle)}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        });
        if (response.ok) {
          const data = (await response.json()) as ProfilePayload;
          const siteUrl = process.env.SITE_URL ?? "https://savepointarchive.vercel.app";
          const url = `${siteUrl}/u/${data.profile.handle}`;
          const displayName = data.profile.display_name;
          const title = escapeHtml(`${displayName} (@${data.profile.handle}), SavePoint`);
          const description = escapeHtml(
            data.profile.bio?.slice(0, 200) || "A gaming portfolio on SavePoint.",
          );
          const featured =
            data.games.find(game => game.featured)?.game.cover_url ??
            data.games[0]?.game.cover_url ??
            null;
          const image = escapeHtml(data.rig?.hero_photo_url ?? featured ?? "");
          const imageTags = image
            ? `<meta property="og:image" content="${image}"/><meta property="og:image:alt" content="${escapeHtml(displayName)}'s SavePoint portfolio"/><meta name="twitter:image" content="${image}"/>`
            : "";
          const tags =
            `<link rel="canonical" href="${escapeHtml(url)}"/>` +
            `<meta property="og:type" content="profile"/><meta property="og:url" content="${escapeHtml(url)}"/>` +
            `<meta property="og:title" content="${title}"/><meta property="og:description" content="${description}"/>` +
            `<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>` +
            imageTags +
            `<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${title}"/>` +
            `<meta name="twitter:description" content="${description}"/>`;
          html = html.replace("</head>", `${tags}</head>`);
        }
      } catch {
        // Fall back to the untouched shell rather than failing the scrape.
      }
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
}
