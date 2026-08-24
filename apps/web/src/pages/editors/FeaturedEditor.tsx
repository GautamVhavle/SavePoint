import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { Button, CoverImage } from '../../components/ui';
import { api } from '../../lib/api';
import type { ApiProfileGame } from '../../types';
import { EditorShell, useArchiveAction, useMe } from './shared';

export function FeaturedEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const [drafts, setDrafts] = useState<Record<string, { featured: boolean; order: number | null; note: string }>>({});
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const entries = useMemo(() => [...(data?.games ?? [])]
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.featured_order ?? 99) - (b.featured_order ?? 99) || a.game.name.localeCompare(b.game.name)), [data]);
  const draftOf = (entry: ApiProfileGame) => drafts[entry.id] ?? { featured: entry.featured, order: entry.featured_order, note: entry.featured_note ?? '' };
  const update = (id: string, patch: Partial<{ featured: boolean; order: number | null; note: string }>) =>
    setDrafts(current => ({ ...current, [id]: { ...draftOf(entries.find(entry => entry.id === id)!), ...patch } }));
  const move = (index: number, delta: number) => {
    const featuredRows = entries.filter(entry => draftOf(entry).featured);
    const target = featuredRows[index];
    const swapWith = featuredRows[index + delta];
    if (!target || !swapWith) return;
    update(target.id, { order: draftOf(swapWith).order ?? index + delta });
    update(swapWith.id, { order: draftOf(target).order ?? index });
    const direction = delta < 0 ? 'up' : 'down';
    setMoveAnnouncement(`${target.game.name} moved ${direction} to position ${index + delta + 1}.`);
  };
  const publish = async () => {
    const ok = await run(async () => {
      for (const entry of entries) {
        const draft = drafts[entry.id];
        if (!draft) continue;
        await api.patchGame(entry.id, {
          featured: draft.featured,
          featured_order: draft.featured ? draft.order : null,
          featured_note: draft.featured ? draft.note || null : null,
        });
      }
    }, 'Hall of Fame arrangement published.');
    // Reset so Publish disables again until the next real edit.
    if (ok) setDrafts({});
  };
  return <EditorShell title="Arrange the front shelf." eyebrow="Hall of Fame curator">
    <p aria-live="polite" className="sr-only" role="status">{moveAnnouncement}</p>
    <p className="muted mb-6">Toggle entries, assign an explicit order, and add a curator’s note. The rail renders top-down.</p>
    <ol className="space-y-3">
      {entries.map((entry, index) => {
        const draft = draftOf(entry);
        return <li key={entry.id} className="rounded-2xl border border-white/10 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-cyan-400" aria-label={`Feature ${entry.game.name}`} checked={draft.featured} onChange={event => update(entry.id, { featured: event.target.checked })}/>
            <CoverImage src={entry.game.cover_url ?? ''} alt="" className="h-16 w-12 rounded-lg"/>
            <b className="min-w-32 flex-1">{entry.game.name}</b>
            <Button className="icon-btn" aria-label={`Move ${entry.game.name} up`} disabled={!draft.featured || index === 0} onClick={() => move(entries.filter(row => draftOf(row).featured).indexOf(entry), -1)}><ArrowUp size={16}/></Button>
            <Button className="icon-btn" aria-label={`Move ${entry.game.name} down`} disabled={!draft.featured} onClick={() => move(entries.filter(row => draftOf(row).featured).indexOf(entry), 1)}><ArrowDown size={16}/></Button>
          </div>
          {draft.featured && <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-[120px_1fr]">
            <label><span className="label">ORDER</span>
              <input className="field" type="number" inputMode="numeric" min="0" max="10000" value={draft.order ?? ''} onChange={event => update(entry.id, { order: event.target.value === '' ? null : Number(event.target.value) })}/>
            </label>
            <label><span className="label">CURATOR NOTE</span>
              <input className="field" value={draft.note} onChange={event => update(entry.id, { note: event.target.value })} placeholder="Why this leads the shelf"/>
            </label>
          </div>}
        </li>;
      })}
      {!entries.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">Add games first, then curate the rail here.</li>}
    </ol>
    <div className="mt-6 flex justify-end">
      <Button className="btn-primary" disabled={!Object.keys(drafts).length} onClick={() => void publish()}><Save size={16}/> Publish arrangement</Button>
    </div>
  </EditorShell>;
}
