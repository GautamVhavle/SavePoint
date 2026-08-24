import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { Check, LoaderCircle, Pencil, Save, Search, Trash2, X } from 'lucide-react';
import { CoverImage, Panel } from '../../components/ui';
import { api } from '../../lib/api';
import { gameSchema, type GameForm } from '../../lib/schemas';
import { STATUS_LABELS, STATUS_ORDER, type ApiIGDBResult, type ApiProfileGame } from '../../types';
import { Button } from '../../components/ui';
import { EditorShell, Field, SelectField, useArchiveAction, useMe } from './shared';

// Half-star scale from 1.0 to 5.0; '' renders the "Unrated" option.
const RATING_OPTIONS: Array<[string, string]> = [['', 'Unrated'], ...Array.from({ length: 9 }, (_, i) => {
  const value = (i + 2) / 2; return [String(value), `${value.toFixed(1)} ★`] as [string, string];
})];

export function GameEditor() {
  const { data, isLoading: libraryLoading } = useMe();
  const run = useArchiveAction();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<ApiIGDBResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const results = useQuery({
    queryKey: ['igdb-search', debounced],
    queryFn: ({ signal }) => api.searchIgdb(debounced, signal),
    enabled: debounced.length >= 2,
  });
  const form = useForm<GameForm>({
    resolver: zodResolver(gameSchema) as unknown as Resolver<GameForm>,
    defaultValues: { igdbId: 0, status: 'playing', rating: undefined, hours: undefined, platform: '', startedOn: '', completedOn: '', review: '', featured: false, featuredOrder: undefined, featuredNote: '' },
  });
  const entries = useMemo(() => [...(data?.games ?? [])].sort((a, b) => a.game.name.localeCompare(b.game.name)), [data]);
  const beginEdit = (entry: ApiProfileGame) => {
    setEditingId(entry.id);
    setSelected(entry.game as unknown as ApiIGDBResult);
    form.reset({
      igdbId: entry.game.igdb_id, status: entry.status,
      rating: entry.rating ?? undefined, hours: entry.hours_played ?? undefined,
      platform: entry.platform ?? '', startedOn: entry.started_on ?? '', completedOn: entry.completed_on ?? '',
      review: entry.review ?? '', featured: entry.featured, featuredOrder: entry.featured_order ?? undefined,
      featuredNote: entry.featured_note ?? '',
    });
    document.getElementById('game-editor-form')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    // Move focus with the scroll so screen readers land in the editing form.
    document.getElementById('field-status')?.focus({ preventScroll: true });
  };
  const cancelEdit = () => { setEditingId(null); setSelected(null); setQuery(''); setDebounced(''); form.reset({ igdbId: 0, status: 'playing', rating: undefined, hours: undefined, platform: '', startedOn: '', completedOn: '', review: '', featured: false, featuredOrder: undefined, featuredNote: '' }); };
  const submit = async (v: GameForm) => {
    const igdbId = editingId ? v.igdbId : selected?.igdb_id ?? v.igdbId;
    if (!igdbId) return;
    const payload = {
      status: v.status, rating: v.rating ?? null, hours_played: v.hours ?? null, platform: v.platform || null,
      started_on: v.startedOn || null, completed_on: v.completedOn || null, review: v.review || null,
      featured: v.featured, featured_order: v.featured ? v.featuredOrder ?? null : null,
      featured_note: v.featured ? v.featuredNote || null : null,
    };
    const ok = await run(
      () => (editingId ? api.patchGame(editingId, payload) : api.addGame({ igdb_id: igdbId, ...payload })),
      editingId ? 'Entry updated.' : 'Game added to the chronicle.',
    );
    if (ok && !editingId) cancelEdit();
  };
  const year = (iso: string | null) => (iso ? iso.slice(0, 4) : '');
  return <EditorShell title="Add a world." eyebrow="Chronicle archive" aside={<Panel className="p-5">
    <span className="label">SNAPSHOT POLICY</span>
    <p className="muted mt-2 text-sm leading-6">Metadata is copied from IGDB when you add a game. Your page keeps rendering even if IGDB goes dark later.</p>
    {selected && <hr className="my-5 border-white/10"/>}
    {selected && <div>
      <span className="label">SELECTED FROM IGDB</span>
      <div className="mt-2 flex items-center gap-3">
        <CoverImage src={selected.cover_url ?? ''} alt="" className="h-14 w-11 rounded-lg"/>
        <div><b>{selected.name}</b><small className="muted block">{year(selected.release_date)} · {selected.platforms.slice(0, 3).join(', ')}</small></div>
      </div>
    </div>}
  </Panel>}>
    <section id="game-editor-form">
      <label className="label" htmlFor="igdb-search">SEARCH IGDB</label>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-ink/40" size={17}/>
        <input
          id="igdb-search" className="field pl-10" placeholder="Start typing a title…" value={query} autoComplete="off"
          onChange={event => { setQuery(event.target.value); if (!editingId) setSelected(null); }}
        />
      </div>
      {debounced.length >= 2 && <div className="mt-2 grid gap-2" role="group" aria-label="IGDB search results">
        <p className="sr-only" role="status">{results.isFetching ? 'Searching IGDB…' : results.isSuccess ? `${results.data.length} ${results.data.length === 1 ? 'result' : 'results'} found` : ''}</p>
        {results.isFetching && <p className="muted px-2 text-sm" aria-hidden="true">Searching the archive…</p>}
        {results.data?.map(meta => <button
          key={meta.igdb_id} type="button" aria-pressed={selected?.igdb_id === meta.igdb_id}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected?.igdb_id === meta.igdb_id ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-white/10 bg-white/[.02] hover:border-cyan-300/30'}`}
          onClick={() => { setSelected(meta); if (!editingId) form.setValue('igdbId', meta.igdb_id); }}
        >
          <CoverImage src={meta.cover_url ?? ''} alt="" className="h-14 w-11 shrink-0 rounded-lg"/>
          <span className="min-w-0"><b>{meta.name}</b><small className="muted block truncate">{year(meta.release_date)} · {meta.genres.join(', ') || 'Game'}</small></span>
          {selected?.igdb_id === meta.igdb_id && <Check size={17} className="ml-auto text-cyan-300"/>}
        </button>)}
        {results.isSuccess && !results.data.length && <p className="muted px-2 text-sm">No IGDB match. Try a shorter phrase.</p>}
      </div>}
      {!editingId && !selected && debounced.length >= 2 && results.isSuccess && !!results.data.length && <p className="muted mt-2 text-xs">Pick a result above to unlock the entry form.</p>}
    </section>
    {(selected || editingId) && <form className="mt-8 grid gap-5 border-t border-white/10 pt-8 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      {editingId && <input type="hidden" {...form.register('igdbId')}/>}
      <SelectField label="STATUS" name="status" form={form} options={STATUS_ORDER.map(value => [value, STATUS_LABELS[value]] as [string, string])}/>
      <SelectField label="RATING" name="rating" form={form} options={RATING_OPTIONS}/>
      <Field label="HOURS PLAYED" name="hours" form={form} type="number" step="0.1" min="0" max="1000000"/>
      <Field label="PLATFORM PLAYED" name="platform" form={form} placeholder="PC, PS5, Switch…" list="platform-options"/>
      <datalist id="platform-options">{(selected?.platforms ?? []).map(platform => <option key={platform} value={platform}/>)}</datalist>
      <Field label="STARTED ON" name="startedOn" form={form} type="date"/>
      <Field label="FINISHED ON" name="completedOn" form={form} type="date"/>
      <div className="sm:col-span-2"><Field label="REVIEW" name="review" form={form} multiline maxLength={10000} placeholder="What did it mean to you? Any length."/> </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" className="h-5 w-5 accent-cyan-400" {...form.register('featured')}/>
        <span className="text-sm font-medium">Feature on the Hall of Fame rail</span>
      </label>
      {form.watch('featured') && <>
        <Field label="FEATURED ORDER" name="featuredOrder" form={form} type="number" min="0" max="10000"/>
        <Field label="CURATOR NOTE" name="featuredNote" form={form} placeholder="Why this belongs up front"/>
      </>}
      <div className="flex gap-2 sm:col-span-2">
        <Button className="btn-primary" type="submit" disabled={form.formState.isSubmitting || (!editingId && !selected)}>
          {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}
          {editingId ? 'Save entry' : 'Add to chronicle'}
        </Button>
        <Button type="button" onClick={cancelEdit}><X size={16}/> Reset</Button>
      </div>
    </form>}
    <section className="mt-10 border-t border-white/10 pt-8">
      <h2 className="text-xl font-semibold">Your library ({entries.length})</h2>
      <ul className="mt-5 grid gap-3">
        {entries.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-3">
          <CoverImage src={entry.game.cover_url ?? ''} alt="" className="h-16 w-12 shrink-0 rounded-lg"/>
          <div className="min-w-40 flex-1"><b>{entry.game.name}</b>
            <p className="muted font-mono text-[10px] uppercase tracking-wider">{STATUS_LABELS[entry.status]}{entry.rating ? ` · ${entry.rating.toFixed(1)}★` : ''}{entry.featured ? ' · featured' : ''}</p>
          </div>
          <Button className="icon-btn" aria-label={`Edit ${entry.game.name}`} onClick={() => beginEdit(entry)}><Pencil size={16}/></Button>
          <Button className="icon-btn" aria-label={`Delete ${entry.game.name}`} onClick={() => {
            if (confirm(`Remove ${entry.game.name} and its awards from your archive?`)) void run(() => api.deleteGame(entry.id), 'Entry deleted.');
          }}><Trash2 size={16}/></Button>
        </li>)}
        {libraryLoading && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm" role="status">Loading your library…</li>}
        {!entries.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">Library is empty, search IGDB above to add your first world.</li>}
      </ul>
    </section>
  </EditorShell>;
}
