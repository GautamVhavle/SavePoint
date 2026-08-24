import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Link2 } from 'lucide-react';
import { Button, CoverImage, Panel, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { copyToClipboard } from '../../lib/clipboard';
import { profileSchema, type ProfileForm } from '../../lib/schemas';
import { EditorShell, Field, SaveBar, SelectField, UploadCard, useArchiveAction, useMe } from './shared';

function PublicUrlCard({ handle }: { handle: string }) {
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
    <p className="muted text-sm leading-6">The first 160 characters of your statement become the public share description.</p>
  </Panel>;
}

export function ProfileEditor() {
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
  return <EditorShell title="Shape your identity." eyebrow="Profile editor" aside={<PublicUrlCard handle={form.watch('handle')}/>}>
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
