import { ArrowUpRight } from 'lucide-react';
import { hostOf, type SocialLink } from '../../lib/links';
import { MotionSection } from './exhibits';
import { SectionHead } from '../../components/ui';

export function LinksSection({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;
  return (
    <MotionSection id="links" className="section cv-auto container-shell min-w-0 overflow-x-hidden" watermark="THE DOOR">
      <SectionHead
        kicker="00 · Doorway"
        title={<>The rest of the <span className="text-gradient">map</span>.</>}
        body="One plate per destination. This is the bio link: Twitch, VODs, Steam, whatever else you keep."
      />
      <ol className="grid gap-2">
        {links.map((link, index) => (
          <li key={`${link.label}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group glass flex min-h-16 min-w-0 max-w-full items-center gap-4 overflow-hidden rounded-[18px] px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 sm:px-5"
            >
              <span className="w-8 shrink-0 font-mono text-[10px] tracking-[.22em] text-cyan-300">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-tight">{link.label}</span>
                <span className="muted mt-0.5 block truncate font-mono text-[11px]">{hostOf(link.url)}</span>
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-cyan-200 opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ol>
    </MotionSection>
  );
}

export function LinkChips({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;
  return (
    <ul className="mt-4 flex max-w-full flex-wrap gap-2">
      {links.map(link => (
        <li key={`${link.label}-${link.url}`}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/5 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-white/85 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
