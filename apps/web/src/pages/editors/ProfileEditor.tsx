import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Link2, Trash2 } from 'lucide-react';
import { Button, CoverImage, Panel, useToast } from '../../components/ui';
import { api, isDemoMode } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { copyToClipboard } from '../../lib/clipboard';
import { useDialogA11y } from '../../lib/useDialogA11y';
import { profileSchema, type ProfileForm } from '../../lib/schemas';
import { EditorShell, Field, SaveBar, SelectField, UploadCard, useArchiveAction, useMe, zodResolverFor } from './shared';

function PublicUrlCard({ handle, isPublic, onToggle, toggling }: {
  handle: string; isPublic: boolean; onToggle: () => void; toggling: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const url = `${window.location.origin}/u/${handle || '…'}`;
  const copy = async () => {
    if (!(await copyToClipboard(url))) return toast.show('Copying is unavailable in this browser.', 'error');
    setCopied(true);
    toast.show('Profile URL copied to your clipboard.');
    setTimeout(() => setCopied(false), 1800);
  };
  return <Panel className="p-5">
    <span className="label">PUBLIC URL</span>
    <p className="break-all font-mono text-sm">{url}</p>
    <Button className="btn mt-4 w-full" onClick={() => void copy()}>
      {copied ? <Check size={16}/> : <Link2 size={16}/>}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
    <hr className="my-5 border-white/10"/>
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="label">VISIBILITY</span>
        <p className="muted mt-1 text-sm leading-6">{isPublic ? 'Anyone with the link can read this archive.' : 'The public URL returns 404 until you publish again.'}</p>
      </div>
      <Button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label={isPublic ? 'Unpublish archive' : 'Publish archive'}
        disabled={toggling}
        className={`!min-h-10 !px-3 ${isPublic ? 'btn-primary' : ''}`}
        onClick={onToggle}
      >
        {isPublic ? <Eye size={16}/> : <EyeOff size={16}/>}
        {isPublic ? 'Public' : 'Private'}
      </Button>
    </div>
    <p className="muted mt-5 text-sm leading-6">The first 160 characters of your statement become the public share description.</p>
  </Panel>;
}

function DangerZone({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const run = useArchiveAction();
  useDialogA11y(panel, open, () => setOpen(false));
  const confirm = async () => {
    setBusy(true);
    const ok = await run(() => api.deleteMe(), isDemoMode ? 'Demo workspace cleared.' : 'Archive deleted.');
    setBusy(false);
    if (!ok) return;
    setOpen(false);
    if (!isDemoMode) auth.logout();
    navigate('/');
  };
  return <>
    <Panel className="border-rose-300/20 p-5">
      <span className="label">DANGER ZONE</span>
      <h2 className="mt-3 text-lg font-semibold">Delete this archive</h2>
      <p className="muted mt-2 text-sm leading-6">Removes the profile, games, awards, rig, and uploaded photos. This cannot be undone.</p>
      <Button className="mt-4 w-full border-rose-300/30 text-rose-200" onClick={() => { setTyped(''); setOpen(true); }}>
        <Trash2 size={16}/> Delete archive
      </Button>
    </Panel>
    {open && (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-[#03050b]/80 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="delete-title" className="glass w-full max-w-md rounded-[22px] p-6">
          <h2 id="delete-title" className="text-2xl font-semibold">Type @{handle} to confirm.</h2>
          <p className="muted mt-3 text-sm leading-6">The public page, studio, and uploaded photos go with it.</p>
          <label className="mt-5 block">
            <span className="label">HANDLE</span>
            <input className="field" value={typed} onChange={event => setTyped(event.target.value.toLowerCase())} autoComplete="off" spellCheck={false} />
          </label>
          <div className="mt-6 flex gap-2">
            <Button className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="btn-primary flex-1" disabled={busy || typed !== handle} onClick={() => void confirm()}>
              {busy ? 'Deleting…' : 'Delete forever'}
            </Button>
          </div>
        </div>
      </div>
    )}
  </>;
}

export function ProfileEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const hydrated = useRef<string | null>(null);
  const form = useForm<ProfileForm>({
    resolver: zodResolverFor(profileSchema),
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
  const toggleVisibility = async () => {
    if (!data) return;
    setToggling(true);
    const next = !data.profile.is_public;
    await run(() => api.patchMe({ is_public: next }), next ? 'Archive is public again.' : 'Archive unpublished. The public URL now returns 404.');
    setToggling(false);
  };
  return <EditorShell title="Shape your identity." eyebrow="Profile editor" aside={<>
    <PublicUrlCard handle={form.watch('handle')} isPublic={data?.profile.is_public ?? true} onToggle={() => void toggleVisibility()} toggling={toggling || !data} />
    {data && <DangerZone handle={data.profile.handle} />}
  </>}>
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
      <div className="sm:col-span-2"><Field label="ARCHIVIST STATEMENT" name="bio" form={form} multiline maxLength={2000}/></div>
      <div className="sm:col-span-2">
        <UploadCard purpose="avatar" title="AVATAR" hint="Square works best · WebP optimized on device" current={data?.profile.avatar_url} onUploaded={setAvatarUrl}/>
      </div>
    </div>
    <SaveBar form={form} onSave={save} ready={Boolean(data)}/>
  </EditorShell>;
}
