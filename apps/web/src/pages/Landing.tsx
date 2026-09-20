import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Layers3, Medal, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverImage, Panel } from '../components/ui';
import { demoProfile } from '../data/demo';

const features = [
  { Icon: Layers3, title: 'A portfolio, not a feed', body: 'Curate a permanent body of play — not another infinite scroll.' },
  { Icon: Medal, title: 'Give meaning to favorites', body: 'Create personal awards and preserve the field notes behind each game.' },
  { Icon: Bot, title: 'An AI that knows your taste', body: 'Your Guide is scoped to your own archive, ratings, and reviews.' },
];

const steps: Array<[string, string, string]> = [
  ['01', 'Claim your handle', 'Reserve the name your whole archive lives at.'],
  ['02', 'Curate the collection', 'Rig, hall of fame, field notes — arranged your way.'],
  ['03', 'Share one link', 'A portfolio that never asks anyone to scroll a feed.'],
];

const faqs: Array<[string, string]> = [
  ['Is this another backlog app?', 'No. SavePoint is the page you put in a Discord bio. Statuses exist so the chronicle is honest, not so a dashboard can nag you.'],
  ['Do visitors need an account?', 'No. Public archives are readable without signing in. Auth0 only gates the studio.'],
  ['Where do covers and titles come from?', 'IGDB, snapshotted when you add a game. Your rating, review, and awards are yours. The public page never calls IGDB live.'],
  ['What does the Guide actually know?', 'Only the profile it is sitting on: rig, games, ratings, reviews, awards. It will refuse general-assistant questions.'],
  ['Can I keep a draft private?', 'Yes. Unpublish from Studio → Identity. The public URL returns 404 until you switch it back. Deletion is in the same editor.'],
];

const shelf = [...demoProfile.games].filter(game => game.featured).sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99)).slice(0, 5);

const site = typeof window === 'undefined' ? 'https://savepointarchive.vercel.app' : window.location.origin;

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>SavePoint · Your gaming legacy, archived</title>
        <meta name="description" content="Build an exquisite public archive for your games, hardware, awards, and the stories behind every save." />
        <link rel="canonical" href={`${site}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SavePoint · Your gaming legacy, archived" />
        <meta property="og:description" content="A collectible gaming portfolio. Not a feed." />
        <meta property="og:url" content={`${site}/`} />
        <meta property="og:image" content={`${site}/og-card.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <section className="container-shell relative grid min-h-[calc(100vh-72px)] place-items-center py-20 text-center">
        <div className="absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-[100px]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-5xl">
          <div className="eyebrow justify-center">The premium player archive</div>
          <h1 className="mt-7 text-[clamp(3.7rem,10vw,8.5rem)] font-bold leading-[.83] tracking-[-.075em]">
            Don’t just finish it.<br /><span className="text-gradient">Remember it.</span>
          </h1>
          <p className="muted mx-auto mt-8 max-w-2xl text-lg leading-8">
            SavePoint transforms your gaming history into a collectible portfolio — your rig, hall of fame, reviews, and milestones in one art-directed home.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary px-6" to="/onboarding">Build your archive <ArrowRight size={18} /></Link>
            <Link className="btn px-6" to="/u/nova">Explore the live demo</Link>
          </div>
        </motion.div>
      </section>

      <section className="container-shell pb-6" aria-label="Showcase shelf">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Inside an archive</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A hall of fame, not a grid of chores.</h2>
          </div>
          <Link className="btn hidden sm:inline-flex" to="/u/nova">Open Nova’s page <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {shelf.map((game, index) => (
            <Link
              key={game.id}
              to={`/u/nova?game=${game.slug}`}
              className={`group relative overflow-hidden rounded-[20px] border border-white/10 ${index === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <CoverImage src={game.cover} alt={`${game.title} cover`} className="aspect-[3/4] transition duration-700 group-hover:scale-[1.04]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-sm font-semibold text-white">{game.title}</span>
            </Link>
          ))}
        </div>
        <Link className="btn mt-5 sm:hidden" to="/u/nova">Open Nova’s page <ArrowRight size={16} /></Link>
      </section>

      <section className="container-shell pb-6">
        <div className="grid gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 md:grid-cols-3">
          {steps.map(([n, t, b]) => (
            <div key={n} className="bg-canvas p-6 transition-transform duration-200 hover:-translate-y-0.5">
              <span className="font-mono text-[10px] tracking-[.3em] text-cyan-300">{n}</span>
              <h2 className="mt-3 text-lg font-semibold">{t}</h2>
              <p className="muted mt-1.5 text-sm leading-6">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-10">
        <motion.div
          className="grid gap-4 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ show: { transition: { staggerChildren: .12 } } }}
        >
          {features.map(({ Icon, title, body }) => (
            <motion.div key={title} variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: .55, ease: [.22, .61, .36, 1] } } }}>
              <Panel className="h-full p-7">
                <Icon className="text-cyan-300" />
                <h2 className="mt-10 text-2xl font-semibold">{title}</h2>
                <p className="muted mt-3 leading-7">{body}</p>
              </Panel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="container-shell pb-10">
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <div className="eyebrow">Not a tracker</div>
            <h2 className="mt-4 text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[.95] tracking-[-.04em]">Built like a museum wall. Used like a link in your bio.</h2>
          </div>
          <p className="muted leading-8">Steam shows what you own. Backloggd shows what you owe yourself. SavePoint shows what you would defend in a conversation — hardware, taste, and the sentences you actually wrote.</p>
        </div>
        <div className="mt-8 overflow-hidden rounded-[22px] border border-white/10">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">How SavePoint differs from a library tracker</caption>
            <thead className="bg-white/[.04] font-mono text-[10px] uppercase tracking-[.2em] text-cyan-200">
              <tr>
                <th className="px-5 py-3 font-medium">Surface</th>
                <th className="px-5 py-3 font-medium">Library tracker</th>
                <th className="px-5 py-3 font-medium">SavePoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[
                ['Job', 'Log everything you touch', 'Exhibit the games that stayed'],
                ['Social', 'Follows, likes, activity', 'None. One public URL.'],
                ['Hardware', 'Usually absent', 'First-class rig + peripherals'],
                ['Voice', 'Star ratings, maybe tags', 'Long reviews, invented awards'],
                ['Visitor AI', 'None', 'Guide locked to that profile'],
              ].map(([surface, other, us]) => (
                <tr key={surface}>
                  <th className="px-5 py-4 font-semibold">{surface}</th>
                  <td className="muted px-5 py-4">{other}</td>
                  <td className="px-5 py-4 text-cyan-100">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-shell pb-28">
        <div className="eyebrow">Questions</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Before you claim a handle.</h2>
        <div className="faq mt-8">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p className="muted">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-center gap-3 py-6 font-mono text-[10px] uppercase tracking-widest text-ink/50">
          <ShieldCheck size={14} />Private drafts · public by choice <Sparkles size={14} />
        </div>
      </section>
    </>
  );
}
