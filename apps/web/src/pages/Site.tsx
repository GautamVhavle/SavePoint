import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { PageFade } from '../components/ui';

type Page = 'about' | 'privacy' | 'terms';

const META: Record<Page, { title: string; description: string; kicker: string; heading: string }> = {
  about: {
    title: 'About · SavePoint',
    description: 'SavePoint is a collectible gaming portfolio: your rig, Hall of Fame, reviews, and a profile-scoped Guide. Not a feed.',
    kicker: 'The archive',
    heading: 'A museum for the games that stayed.',
  },
  privacy: {
    title: 'Privacy · SavePoint',
    description: 'How SavePoint stores identity, public archive content, uploads, hashed rate-limit keys, and Guide questions.',
    kicker: 'Privacy',
    heading: 'What we keep, and what we never collect.',
  },
  terms: {
    title: 'Terms · SavePoint',
    description: 'Terms of use for SavePoint: public archives, acceptable content, IGDB metadata, and the AI Guide.',
    kicker: 'Terms',
    heading: 'The house rules for the archive.',
  },
};

function About() {
  return (
    <>
      <p className="muted text-lg leading-8">
        SavePoint is a public portfolio for players. One link holds the machine you play on, the games you finished or could not drop, the awards you invent for yourself, and a Guide that answers questions using only that archive.
      </p>
      <p className="muted mt-5 leading-8">
        There are no likes, follows, comments, or timelines. The product succeeds when a stranger opens <code className="font-mono text-sm text-cyan-200">/u/your-handle</code> and can tell, in a few seconds, what you play and why it mattered.
      </p>
      <h2>What lives on a page</h2>
      <ul>
        <li><b>The Rig</b> — structured specs and peripherals, rendered as a spec sheet, not a shopping list.</li>
        <li><b>The Hall of Fame</b> — a manually ordered shelf. Not an algorithm.</li>
        <li><b>The Chronicle</b> — every logged game, with status, rating, hours, and a review of any length.</li>
        <li><b>Awards</b> — titles you write, attached to games you actually played.</li>
        <li><b>The Guide</b> — Gemini, constrained to that one profile. It will refuse trivia from outside the archive.</li>
      </ul>
      <h2>Where the data comes from</h2>
      <p className="muted leading-8">
        Game titles, covers, genres, and platforms are snapshotted from IGDB when you add a game. Your rating, review, hours, and awards are yours. Public pages never call IGDB live, so a delisted game still renders.
      </p>
      <h2>What this is not</h2>
      <p className="muted leading-8">
        Not Steam. Not a backlog tracker that nags you. Not a social network. Imports from other platforms and a public directory of archives are on the roadmap; they are not in this version.
      </p>
      <p className="mt-10">
        <Link className="btn btn-primary" to="/onboarding">Claim your handle</Link>
        <Link className="btn ml-3" to="/u/nova">See the showcase</Link>
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p className="muted text-sm">Last updated 20 September 2026. This describes the production SavePoint deployment, not the in-browser demo.</p>
      <h2>Who we are</h2>
      <p className="muted leading-8">
        SavePoint is operated by the project maintainer of the <a className="text-cyan-300 underline-offset-4 hover:underline" href="https://github.com/GautamVhavle/SavePoint">SavePoint repository</a>. Contact for privacy and security: GitHub Security Advisories on that repo.
      </p>
      <h2>What we store</h2>
      <ul>
        <li><b>Account identity.</b> Auth0 holds your login (email and/or social subject). We store Auth0’s stable <code className="font-mono text-sm">sub</code>, never your password.</li>
        <li><b>Your archive.</b> Handle, display name, bio, location, theme preference, visibility, rig specs, peripherals, game entries (status, rating, review, hours, dates), awards, and featured order live in Neon Postgres.</li>
        <li><b>Uploads.</b> Avatars and photos you choose to upload go to a public Vercel Blob store under a path derived from your profile id. Do not upload images you do not want on the public internet.</li>
        <li><b>IGDB snapshots.</b> When you add a game, we copy IGDB’s title, cover, summary, genres, platforms, and identifiers so the page still renders if IGDB is down.</li>
        <li><b>Rate-limit keys.</b> Guide, search, and upload limits store an HMAC of the visitor address keyed by a server secret. Raw IP addresses are not stored.</li>
      </ul>
      <h2>What is public</h2>
      <p className="muted leading-8">
        A public archive is reachable at <code className="font-mono text-sm">/u/your-handle</code> without an account: identity, bio, location, rig, games, reviews, awards, and uploaded images. You can unpublish from Studio → Identity; the public URL then returns 404. Unpublished content remains in the database until you delete the archive.
      </p>
      <h2>The Guide</h2>
      <p className="muted leading-8">
        Asking the Guide sends the question and that profile’s public JSON to Google’s Gemini API. We do not send private studio drafts. On Google’s unpaid AI Studio tier, prompts may be used to improve Google’s services. A paid Google AI / Vertex key with data-use disabled is the production setting when that matters to you.
      </p>
      <h2>What we do not collect</h2>
      <p className="muted leading-8">
        No advertising pixels, no third-party analytics in this version, no sale of profile data, no follow graph. Theme preference is stored in your browser (<code className="font-mono text-sm">localStorage</code>) unless you set it on the profile.
      </p>
      <h2>Retention and deletion</h2>
      <p className="muted leading-8">
        Delete the archive from Studio → Identity. That removes the Postgres row and cascaded games, awards, rig, peripherals, and rate-limit events, and best-effort deletes Blob objects under your prefix. Auth0’s login record is separate; delete that from Auth0 or by asking us. Demo mode stores a copy in this browser only and is not an account.
      </p>
      <h2>Cookies and local storage</h2>
      <p className="muted leading-8">
        Auth0 sets cookies / refresh-token storage required to keep you signed in. SavePoint itself uses <code className="font-mono text-sm">localStorage</code> for theme and, in demo mode, the showcase workspace.
      </p>
      <h2>Processors</h2>
      <ul>
        <li>Vercel — hosting, logs, Blob storage</li>
        <li>Neon — Postgres</li>
        <li>Auth0 — authentication</li>
        <li>Twitch / IGDB — game metadata search (queries you type)</li>
        <li>Google Gemini — Guide answers</li>
      </ul>
      <h2>Requests</h2>
      <p className="muted leading-8">
        Export is the public JSON of your archive plus anything you copy from Studio. Deletion is in Studio. Security reports: see <a className="text-cyan-300 underline-offset-4 hover:underline" href="https://github.com/GautamVhavle/SavePoint/security/advisories/new">GitHub advisories</a>, not public issues.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <p className="muted text-sm">Last updated 20 September 2026.</p>
      <h2>The service</h2>
      <p className="muted leading-8">
        SavePoint lets you publish a gaming portfolio and edit it while signed in. It is provided as-is, without uptime or data-longevity guarantees, on the Hobby infrastructure described in the repository.
      </p>
      <h2>Your content</h2>
      <p className="muted leading-8">
        You keep ownership of reviews, awards, photos, and other text you submit. You grant SavePoint a licence to host, cache, and display that content as part of the product (public pages, share cards, and the Guide’s profile context). Do not upload material you do not have the right to publish. Game artwork and titles come from IGDB and remain subject to IGDB / rights-holder terms; we snapshot them for display on your page.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>No malware, scraping that bypasses rate limits, or attempts to access another curator’s studio.</li>
        <li>No impersonation of other people or of SavePoint itself (reserved handles are blocked).</li>
        <li>No illegal content. We may unpublish or delete an archive that violates this.</li>
        <li>The Guide is not a general assistant. Do not use it to generate harmful content; it is instructed to stay inside the viewed profile.</li>
      </ul>
      <h2>Accounts</h2>
      <p className="muted leading-8">
        One Auth0 login maps to one SavePoint profile. Handles are unique. You may unpublish or delete the archive at any time. We may refuse or reclaim a handle that impersonates the service.
      </p>
      <h2>Liability</h2>
      <p className="muted leading-8">
        SavePoint is a portfolio page, not a backup service. Keep copies of reviews you care about. We are not liable for lost data, IGDB or Gemini outages, or how a third party interprets a public page you chose to share.
      </p>
      <h2>Changes</h2>
      <p className="muted leading-8">
        Material changes to these terms or the privacy notice will be dated at the top of this page. Continued use after that date is acceptance.
      </p>
    </>
  );
}

export default function Site() {
  const path = useLocation().pathname.replace(/^\//, '') as Page;
  const page: Page = path in META ? path : 'about';
  const meta = META[page];
  return (
    <PageFade className="container-shell py-16 sm:py-24">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={`${typeof window === 'undefined' ? '' : window.location.origin}/${page}`} />
      </Helmet>
      <article className="prose-legal mx-auto max-w-3xl">
        <div className="eyebrow">{meta.kicker}</div>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[.95] tracking-[-.05em]">{meta.heading}</h1>
        <div className="mt-10">
          {page === 'about' && <About />}
          {page === 'privacy' && <Privacy />}
          {page === 'terms' && <Terms />}
        </div>
        <nav aria-label="Legal" className="mt-16 flex flex-wrap gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[.18em] text-ink/60">
          <Link className="hover:text-cyan-300" to="/about">About</Link>
          <Link className="hover:text-cyan-300" to="/privacy">Privacy</Link>
          <Link className="hover:text-cyan-300" to="/terms">Terms</Link>
        </nav>
      </article>
    </PageFade>
  );
}
