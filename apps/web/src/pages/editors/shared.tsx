import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, Save, UploadCloud } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { api, ApiError } from '../../lib/api';
import { preprocessImage } from '../../lib/image';
import { Button, PageFade, Panel, useToast } from '../../components/ui';

/* ------------------------------- shared chrome ------------------------------- */

export function EditorShell({ title, eyebrow, children, aside }: { title: string; eyebrow: string; children: ReactNode; aside?: ReactNode }) {
  return <PageFade className="container-shell py-10">
    <Helmet><title>{title} · SavePoint Studio</title><meta name="robots" content="noindex"/></Helmet>
    <Link to="/dashboard" className="btn mb-8"><ArrowLeft size={16}/> Studio</Link>
    <div className="mb-8"><div className="eyebrow">{eyebrow}</div><h1 className="mt-4 text-4xl font-bold tracking-[-.045em] sm:text-6xl">{title}</h1></div>
    <div className={aside ? 'grid items-start gap-5 lg:grid-cols-[1fr_320px]' : ''}>
      <Panel className="p-5 sm:p-8">{children}</Panel>
      {aside && <aside className="grid gap-4">{aside}</aside>}
    </div>
  </PageFade>;
}

export function Field<T extends FieldValues>({ label, name, form, type = 'text', multiline = false, placeholder, step, min, max, list, maxLength }: { label: string; name: Path<T>; form: UseFormReturn<T>; type?: string; multiline?: boolean; placeholder?: string; step?: string; min?: string; max?: string; list?: string; maxLength?: number }) {
  const error = form.formState.errors[name]?.message as string | undefined;
  const id = `field-${String(name)}`;
  return <label className="block">
    <span className="label">{label}</span>
    {multiline
      ? <textarea id={id} className="field" placeholder={placeholder} maxLength={maxLength} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)} />
      : <input id={id} type={type} placeholder={placeholder} className="field" min={min} max={max} step={step} list={list} maxLength={maxLength} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)} />}
    {error && <span id={`${id}-error`} className="field-error">{error}</span>}
  </label>;
}

export function SelectField<T extends FieldValues>({ label, name, form, options }: { label: string; name: Path<T>; form: UseFormReturn<T>; options: Array<[string, string]> }) {
  const error = form.formState.errors[name]?.message as string | undefined;
  const id = `field-${String(name)}`;
  return <label className="block">
    <span className="label">{label}</span>
    <select id={id} className="field" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
    {error && <span id={`${id}-error`} className="field-error">{error}</span>}
  </label>;
}

/** Capture-phase guard: internal links must confirm before discarding dirty form state. */
function UnsavedNavGuard({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      // Same-page anchors, mailto:, and new tabs don't abandon the form.
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || anchor.target === '_blank') return;
      if (window.confirm('Leave this editor? Unsaved changes will be discarded.')) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active]);
  return null;
}

export function SaveBar<T extends FieldValues>({ form, onSave, ready = true }: { form: UseFormReturn<T>; onSave: (v: T) => Promise<void>; ready?: boolean }) {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (form.formState.isDirty) event.preventDefault(); };
    addEventListener('beforeunload', handler);
    return () => removeEventListener('beforeunload', handler);
  }, [form.formState.isDirty]);
  return <>
    <UnsavedNavGuard active={form.formState.isDirty}/>
    <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
      <span className="muted text-sm">{!ready ? 'Loading your archive…' : form.formState.isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
      <Button className="btn-primary" disabled={form.formState.isSubmitting || !ready} title={ready ? undefined : 'Available once your archive loads'} onClick={form.handleSubmit(onSave)}>
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}
        {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  </>;
}

/* --------------------------------- data layer -------------------------------- */

export const ME_KEY = ['me'] as const;

export function useMe() { return useQuery({ queryKey: ME_KEY, queryFn: () => api.me() }); }

export function useArchiveAction() {  const toast = useToast();
  const client = useQueryClient();
  return async (action: () => Promise<void>, doneMessage?: string) => {
    try {
      await action();
      await client.invalidateQueries({ queryKey: ME_KEY });
      // Public pages must reflect curator edits immediately, never within the
      // staleTime window.
      await client.invalidateQueries({ queryKey: ['public-profile'] });
      if (doneMessage) toast.show(doneMessage);
      return true;
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : 'Something went wrong.', 'error');
      return false;
    }
  };
}

/* ---------------------------------- uploads ---------------------------------- */

export function UploadCard({ purpose, title, hint, current, onUploaded }: {
  purpose: 'avatar' | 'rig' | 'peripheral'; title: string; hint: string;
  current?: string | null; onUploaded: (url: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const inputId = useId();
  const blobRef = useRef<string | null>(null);
  useEffect(() => { if (!preview) setPreview(current ?? null); }, [current, preview]);
  // Local blob previews are session-only: revoke replaced and unmounted ones.
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);
  const load = async (file?: File) => {
    if (!file) return;
    try {
      setError(''); setBusy(true); setAnnounce('Optimizing and uploading image…');
      const processed = await preprocessImage(file);
      const url = await api.uploadMedia(purpose, processed.file);
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      URL.revokeObjectURL(processed.preview);
      setPreview(url); onUploaded(url);
      setAnnounce('Image stored.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
      setAnnounce('');
    } finally { setBusy(false); }
  };
  return <div>
    <span className="label">{title}</span>
    <label className={`flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[.025] text-center transition focus-within:border-cyan-300/60 focus-within:bg-cyan-300/5 hover:border-cyan-300/40 ${busy ? 'opacity-60' : ''}`}>
      {preview
        ? <div className={`flex items-center gap-4 p-4 ${busy ? 'animate-pulse' : ''}`}><img className="h-24 w-24 rounded-xl object-cover" src={preview} alt="Uploaded media"/><div className="text-left"><b>{busy ? 'Archiving…' : 'Stored'}</b><p className="muted mt-1 text-sm">{busy ? 'Optimizing and uploading' : 'Choose another file to replace.'}</p></div></div>
        : <div className="p-4"><UploadCloud className="mx-auto text-cyan-300"/><b className="mt-3 block">Drop or choose an image</b><p className="muted mt-1 text-sm">{hint}</p></div>}
      <input id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`Upload ${title.toLowerCase()} image`} disabled={busy} aria-describedby={error ? `${inputId}-error` : undefined} onChange={event => void load(event.target.files?.[0])}/>
    </label>
    <span className="sr-only" role="status">{announce}</span>
    {error && <p className="field-error" id={`${inputId}-error`} role="alert">{error}</p>}
  </div>;
}
