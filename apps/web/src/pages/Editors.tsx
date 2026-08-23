import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type Resolver, type UseFormReturn } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ArrowLeft, ArrowUp, BadgeCheck, Check, LoaderCircle, Pencil, Plus, Save,
  Search, Star, Trash2, UploadCloud, X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { preprocessImage } from '../lib/image';
import {
  awardSchema, gameSchema, peripheralSchema, profileSchema, rigSchema,
  type AwardForm, type GameForm, type PeripheralForm, type ProfileForm, type RigForm,
} from '../lib/schemas';
import { STATUS_LABELS, STATUS_ORDER, type ApiIGDBResult, type ApiPeripheral, type ApiProfileGame } from '../types';
import { Button, CoverImage, Panel, useToast } from '../components/ui';

/* ------------------------------- shared chrome ------------------------------- */

function EditorShell({ title, eyebrow, children, aside }: { title: string; eyebrow: string; children: ReactNode; aside?: ReactNode }) {
  return <div className="container-shell py-10">
    <Link to="/dashboard" className="btn mb-8"><ArrowLeft size={16}/> Studio</Link>
    <div className="mb-8"><div className="eyebrow">{eyebrow}</div><h1 className="mt-4 text-4xl font-bold tracking-[-.045em] sm:text-6xl">{title}</h1></div>
    <div className={aside ? 'grid items-start gap-5 lg:grid-cols-[1fr_320px]' : ''}>
      <Panel className="p-5 sm:p-8">{children}</Panel>
      {aside && <aside className="grid gap-4">{aside}</aside>}
    </div>
  </div>;
}

function Field({ label, name, form, type = 'text', multiline = false, placeholder, step, min, list }: { label: string; name: string; form: UseFormReturn<any>; type?: string; multiline?: boolean; placeholder?: string; step?: string; min?: string; list?: string }) {
  const error = form.formState.errors[name]?.message as string | undefined;
  const id = `field-${name}`;
  return <label className="block">
    <span className="label">{label}</span>
    {multiline
      ? <textarea id={id} className="field" placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)} />
      : <input id={id} type={type} placeholder={placeholder} className="field" min={min} step={step} list={list} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)} />}
    {error && <span id={`${id}-error`} className="field-error">{error}</span>}
  </label>;
}

function SelectField({ label, name, form, options }: { label: string; name: string; form: UseFormReturn<any>; options: Array<[string, string]> }) {
  const error = form.formState.errors[name]?.message as string | undefined;
  const id = `field-${name}`;
  return <label className="block">
    <span className="label">{label}</span>
    <select id={id} className="field" aria-invalid={!!error} {...form.register(name)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
    {error && <span className="field-error">{error}</span>}
  </label>;
}

function SaveBar<T extends FieldValues>({ form, onSave }: { form: UseFormReturn<T>; onSave: (v: T) => Promise<void> }) {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) event.preventDefault(); };
    addEventListener('beforeunload', handler);
    return () => removeEventListener('beforeunload', handler);
  }, [form.formState.isDirty]);
  return <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
    <span className="muted text-sm">{form.formState.isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
    <Button className="btn-primary" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(onSave)}>
      {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}
      {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
    </Button>
  </div>;
}

/* --------------------------------- data layer -------------------------------- */

const ME_KEY = ['me'] as const;

function useMe() { return useQuery({ queryKey: ME_KEY, queryFn: () => api.me() }); }

function useArchiveAction() {
  const toast = useToast();
  const client = useQueryClient();
  return async (action: () => Promise<void>, doneMessage?: string) => {
    try {
      await action();
      await client.invalidateQueries({ queryKey: ME_KEY });
      if (doneMessage) toast.show(doneMessage);
      return true;
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : 'Something went wrong.');
      return false;
    }
  };
}

/* ---------------------------------- uploads ---------------------------------- */

function UploadCard({ purpose, title, hint, current, onUploaded }: {
  purpose: 'avatar' | 'rig' | 'peripheral'; title: string; hint: string;
  current?: string | null; onUploaded: (url: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!preview) setPreview(current ?? null); }, [current, preview]);
  const load = async (file?: File) => {
    if (!file) return;
    try {
      setError(''); setBusy(true);
      const processed = await preprocessImage(file);
      const url = await api.uploadMedia(purpose, processed.file);
      setPreview(url); onUploaded(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally { setBusy(false); }
  };
  return <div>
    <span className="label">{title}</span>
    <label className={`flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[.025] text-center transition hover:border-cyan-300/40 ${busy ? 'opacity-60' : ''}`}>
      {preview
        ? <div className="flex items-center gap-4 p-4"><img className="h-24 w-24 rounded-xl object-cover" src={preview} alt="Uploaded media"/><div className="text-left"><b>{busy ? 'Archiving…' : 'Stored'}</b><p className="muted mt-1 text-sm">Choose another file to replace.</p></div></div>
        : <div className="p-4"><UploadCloud className="mx-auto text-cyan-300"/><b className="mt-3 block">Drop or choose an image</b><p className="muted mt-1 text-sm">{hint}</p></div>}
      <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => void load(event.target.files?.[0])}/>
    </label>
    {error && <p className="field-error">{error}</p>}
  </div>;
}

/* -------------------------------- identity tab ------------------------------- */

function ProfileEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const hydrated = useRef<string | null>(null);
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileForm>,
    defaultValues: { displayName: '', handle: '', bio: '', location: '', themePreference: 'system' },
  });
  useEffect(() => {
    if (!data || hydrated.current === data.profile.id) return;
    hydrated.current = data.profile.id;
    form.reset({
      displayName: data.profile.display_name, handle: data.profile.handle, bio: data.profile.bio ?? '',
      location: data.profile.location ?? '', themePreference: data.profile.theme_preference,
    });
    setAvatarUrl(data.profile.avatar_url);
  }, [data, form]);
  const save = async (v: ProfileForm) => {
    await run(() => api.patchMe({
      display_name: v.displayName, handle: v.handle, location: v.location || null, bio: v.bio || null,
      theme_preference: v.themePreference, ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    }), 'Identity archived successfully.');
    form.reset(v);
  };
  return <EditorShell title="Shape your identity." eyebrow="Profile editor" aside={<Panel className="p-5">
    <span className="label">PUBLIC URL</span>
    <p className="break-all font-mono text-sm">savepoint.app/u/{form.watch('handle') || '…'}</p>
    <hr className="my-5 border-white/10"/>
    <p className="muted text-sm leading-6">The first 160 characters of your statement become the public share description.</p>
  </Panel>}>
    {data && <div className="mb-7 flex items-center gap-4">
      <CoverImage src={data.profile.avatar_url ?? ''} alt="" className="h-16 w-16 rounded-2xl"/>
      <div><b>{data.profile.display_name}</b><p className="muted font-mono text-xs">@{data.profile.handle}</p></div>
    </div>}
    {!data && <p className="muted mb-6 text-sm">Loading your archive…</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="DISPLAY NAME" name="displayName" form={form}/>
      <Field label="HANDLE" name="handle" form={form}/>
      <SelectField label="THEME PREFERENCE" name="themePreference" form={form} options={[['system', 'Match system'], ['dark', 'Dark'], ['light', 'Light']]}/>
      <Field label="LOCATION" name="location" form={form} placeholder="Lisbon · UTC+1"/>
      <div className="sm:col-span-2"><Field label="ARCHIVIST STATEMENT" name="bio" form={form} multiline/></div>
      <div className="sm:col-span-2">
        <UploadCard purpose="avatar" title="AVATAR" hint="Square works best · WebP optimized on device" current={data?.profile.avatar_url} onUploaded={setAvatarUrl}/>
      </div>
    </div>
    <SaveBar form={form} onSave={save}/>
  </EditorShell>;
}

/* ----------------------------------- rig tab ---------------------------------- */

const RIG_FIELDS: Array<[keyof RigForm, string]> = [
  ['cpu', 'CPU'], ['gpu', 'GPU'], ['memory', 'Memory'], ['motherboard', 'Motherboard'],
  ['storage', 'Storage'], ['caseField', 'Case'], ['psu', 'Power'], ['cooling', 'Cooling'], ['os', 'OS'],
];

function RigEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const hydrated = useRef(false);
  const form = useForm<RigForm>({
    resolver: zodResolver(rigSchema) as unknown as Resolver<RigForm>,
    defaultValues: { name: 'Main Rig', cpu: '', gpu: '', memory: '', motherboard: '', storage: '', caseField: '', psu: '', cooling: '', os: '', notes: '' },
  });
  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    const rig = data.rig;
    form.reset({
      name: rig?.name ?? 'Main Rig', cpu: rig?.cpu ?? '', gpu: rig?.gpu ?? '', memory: rig?.memory ?? '',
      motherboard: rig?.motherboard ?? '', storage: rig?.storage ?? '', caseField: rig?.case ?? '',
      psu: rig?.psu ?? '', cooling: rig?.cooling ?? '', os: rig?.os ?? '', notes: rig?.notes ?? '',
    });
  }, [data, form]);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const save = async (v: RigForm) => {
    await run(() => api.putRig({
      name: v.name, cpu: v.cpu || null, gpu: v.gpu || null, memory: v.memory || null,
      motherboard: v.motherboard || null, storage: v.storage || null, case: v.caseField || null,
      psu: v.psu || null, cooling: v.cooling || null, os: v.os || null, notes: v.notes || null,
      monitors: data?.rig?.monitors ?? [], ...(heroUrl ? { hero_photo_url: heroUrl } : {}),
    }), 'Rig specification updated.');
    form.reset(v);
  };
  return <EditorShell title="Tune the loadout." eyebrow="Rig & peripherals">
    {data?.rig?.hero_photo_url && !heroUrl && <CoverImage src={data.rig.hero_photo_url} alt="" className="mb-6 h-44 rounded-2xl"/>}
    <UploadCard purpose="rig" title="BATTLESTATION HERO PHOTO" hint="Wide shots read best · max 12 MB before optimization" current={data?.rig?.hero_photo_url} onUploaded={setHeroUrl}/>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field label="BUILD NAME" name="name" form={form}/>
      <div/>
      {RIG_FIELDS.map(([name, label]) => <Field key={name} label={label.toUpperCase()} name={name as string} form={form}/>)}
      <div className="sm:col-span-2"><Field label="BUILD NOTES" name="notes" form={form} multiline placeholder="Why this setup works for you"/></div>
    </div>
    <SaveBar form={form} onSave={save}/>
    {data && <PeripheralManager peripherals={data.peripherals}/>}
  </EditorShell>;
}

function PeripheralManager({ peripherals }: { peripherals: ApiPeripheral[] }) {
  const run = useArchiveAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(peripherals.find(item => item.id === editingId)?.photo_url ?? null);
  const form = useForm<PeripheralForm>({ resolver: zodResolver(peripheralSchema) as unknown as Resolver<PeripheralForm>, defaultValues: { type: '', displayName: '', brandModel: '', notes: '' } });
  const openEditor = (item?: typeof peripherals[number]) => {
    setEditingId(item?.id ?? null);
    setPhotoUrl(item?.photo_url ?? null);
    form.reset({ type: item?.type ?? '', displayName: item?.display_name ?? '', brandModel: item?.brand_model ?? '', notes: item?.notes ?? '' });
  };
  const submit = async (v: PeripheralForm) => {
    const payload = { type: v.type, display_name: v.displayName, brand_model: v.brandModel || null, notes: v.notes || null, photo_url: photoUrl, sort_order: editingId ? (peripherals.find(item => item.id === editingId)?.sort_order ?? 0) : peripherals.length };
    const ok = await run(() => (editingId ? api.updatePeripheral(editingId, payload) : api.createPeripheral(payload)), editingId ? 'Peripheral updated.' : 'Peripheral added.');
    if (ok) openEditor(undefined);
  };
  const ordered = [...peripherals].sort((a, b) => a.sort_order - b.sort_order);
  return <section className="mt-10 border-t border-white/10 pt-8">
    <h2 className="text-xl font-semibold">Peripherals & extras</h2>
    <p className="muted mt-1 text-sm">Keyboard, mouse, headset, chair, mic — anything that shapes the setup.</p>
    <ul className="mt-5 grid gap-3">
      {ordered.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-3">
        <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-200">{item.type}</span>
        <b className="flex-1">{item.display_name}<small className="muted ml-2 font-normal">{item.brand_model}</small></b>
        {item.photo_url && <BadgeCheck size={17} className="text-emerald-300"/>}
        <Button className="icon-btn" aria-label={`Edit ${item.display_name}`} onClick={() => openEditor(item)}><Pencil size={16}/></Button>
        <Button className="icon-btn" aria-label={`Remove ${item.display_name}`} onClick={() => void run(() => api.deletePeripheral(item.id), 'Peripheral removed.')}><Trash2 size={16}/></Button>
      </li>)}
      {!ordered.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">Nothing documented yet — add your first piece below.</li>}
    </ul>
    <form className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.02] p-4 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <Field label="TYPE" name="type" form={form} placeholder="keyboard, mouse, headset…"/>
      <Field label="NAME" name="displayName" form={form} placeholder="Wooting 60HE+"/>
      <Field label="BRAND / MODEL" name="brandModel" form={form} placeholder="Optional detail"/>
      <Field label="NOTES" name="notes" form={form}/>
      <div className="sm:col-span-2">
        <UploadCard purpose="peripheral" title="PHOTO (OPTIONAL)" hint="One clear shot of the item" current={photoUrl} onUploaded={setPhotoUrl}/>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button className="btn-primary" type="submit" disabled={form.formState.isSubmitting}>
          {editingId ? <Save size={16}/> : <Plus size={16}/>}{editingId ? 'Save peripheral' : 'Add peripheral'}
        </Button>
        {editingId && <Button type="button" onClick={() => openEditor(undefined)}><X size={16}/> Cancel</Button>}
      </div>
    </form>
  </section>;
}

/* ---------------------------------- games tab --------------------------------- */

const RATING_OPTIONS: Array<[string, string]> = [['', 'Unrated'], ...Array.from({ length: 9 }, (_, i) => {
  const value = (i + 2) / 2; return [String(value), `${value.toFixed(1)} ★`] as [string, string];
})];

function GameEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
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
    document.getElementById('game-editor-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setSelected(null); form.reset({ igdbId: 0, status: 'playing', rating: undefined, hours: undefined, platform: '', startedOn: '', completedOn: '', review: '', featured: false, featuredOrder: undefined, featuredNote: '' }); };
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
      {debounced.length >= 2 && <div className="mt-2 grid gap-2" role="listbox" aria-label="IGDB search results">
        {results.isFetching && <p className="muted px-2 text-sm">Searching the archive…</p>}
        {results.data?.map(meta => <button
          key={meta.igdb_id} type="button" role="option" aria-selected={selected?.igdb_id === meta.igdb_id}
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
      <Field label="HOURS PLAYED" name="hours" form={form} type="number" step="0.1" min="0"/>
      <Field label="PLATFORM PLAYED" name="platform" form={form} placeholder="PC, PS5, Switch…" list="platform-options"/>
      <datalist id="platform-options">{(selected?.platforms ?? []).map(platform => <option key={platform} value={platform}/>)}</datalist>
      <Field label="STARTED ON" name="startedOn" form={form} type="date"/>
      <Field label="FINISHED ON" name="completedOn" form={form} type="date"/>
      <div className="sm:col-span-2"><Field label="REVIEW" name="review" form={form} multiline placeholder="What did it mean to you? Any length."/> </div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" className="h-5 w-5 accent-cyan-400" {...form.register('featured')}/>
        <span className="text-sm font-medium">Feature on the Hall of Fame rail</span>
      </label>
      {form.watch('featured') && <>
        <Field label="FEATURED ORDER" name="featuredOrder" form={form} type="number" min="0"/>
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
        {!entries.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">Library is empty — search IGDB above to add your first world.</li>}
      </ul>
    </section>
  </EditorShell>;
}

/* ---------------------------------- awards tab -------------------------------- */

function AwardEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const form = useForm<AwardForm>({ resolver: zodResolver(awardSchema) as unknown as Resolver<AwardForm>, defaultValues: { profileGameId: '', title: '', description: '', awardedOn: '' } });
  const entries = useMemo(() => [...(data?.games ?? [])].sort((a, b) => a.game.name.localeCompare(b.game.name)), [data]);
  const submit = async (v: AwardForm) => {
    const ok = await run(() => api.createAward({
      profile_game_id: v.profileGameId, title: v.title, description: v.description || null,
      awarded_on: v.awardedOn || null, sort_order: data?.awards.length ?? 0,
    }), 'Award added to the cabinet.');
    if (ok) form.reset({ profileGameId: '', title: '', description: '', awardedOn: '' });
  };
  const titleOf = (id: string) => entries.find(entry => entry.id === id)?.game.name ?? 'Unknown entry';
  return <EditorShell title="Mark what mattered." eyebrow="Custom awards" aside={<Panel className="p-5">
    <span className="label">AWARDS ARE PERSONAL</span>
    <p className="muted mt-2 text-sm leading-6">Invent categories no critic would print: “Best Soundtrack I’ve Ever Heard” counts double here.</p>
  </Panel>}>
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
      <SelectField label="GAME" name="profileGameId" form={form} options={[['', 'Choose one of your games'], ...entries.map(entry => [entry.id, `${entry.game.name} (${STATUS_LABELS[entry.status]})`] as [string, string])]} />
      <Field label="AWARD TITLE" name="title" form={form} placeholder="Changed My Brain"/>
      <div className="sm:col-span-2"><Field label="CITATION" name="description" form={form} multiline placeholder="Why it earned this"/></div>
      <Field label="AWARDED ON" name="awardedOn" form={form} type="date"/>
      <div className="flex items-end"><Button className="btn-primary" type="submit" disabled={form.formState.isSubmitting}><Plus size={16}/> Attach award</Button></div>
    </form>
    <section className="mt-10 border-t border-white/10 pt-8">
      <h2 className="text-xl font-semibold">Cabinet ({data?.awards.length ?? 0})</h2>
      <ul className="mt-5 grid gap-3">
        {(data?.awards ?? []).map(award => <li key={award.id} className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
          <Star size={18} className="shrink-0 text-amber-300"/>
          <div className="flex-1"><b>{award.title}</b><p className="muted text-sm">{titleOf(award.profile_game_id)}{award.description ? ` · ${award.description}` : ''}</p></div>
          <Button className="icon-btn" aria-label={`Delete ${award.title}`} onClick={() => void run(() => api.deleteAward(award.id), 'Award removed.')}><Trash2 size={16}/></Button>
        </li>)}
        {data && !data.awards.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">No awards yet.</li>}
      </ul>
    </section>
  </EditorShell>;
}

/* --------------------------------- featured tab ------------------------------- */

function FeaturedEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const [drafts, setDrafts] = useState<Record<string, { featured: boolean; order: number | null; note: string }>>({});
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
  };
  const publish = () => run(async () => {
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
  return <EditorShell title="Arrange the front shelf." eyebrow="Hall of Fame curator">
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
              <input className="field" type="number" min="0" value={draft.order ?? ''} onChange={event => update(entry.id, { order: event.target.value === '' ? null : Number(event.target.value) })}/>
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

export default function Editors() {
  const page = useLocation().pathname.split('/').pop();
  if (page === 'profile') return <ProfileEditor/>;
  if (page === 'rig') return <RigEditor/>;
  if (page === 'games') return <GameEditor/>;
  if (page === 'awards') return <AwardEditor/>;
  return <FeaturedEditor/>;
}
