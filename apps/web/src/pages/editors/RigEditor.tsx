import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useReducedMotion } from 'framer-motion';
import { BadgeCheck, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, CoverImage } from '../../components/ui';
import { api } from '../../lib/api';
import { peripheralSchema, rigSchema, type PeripheralForm, type RigForm } from '../../lib/schemas';
import type { ApiPeripheral } from '../../types';
import { EditorShell, Field, SaveBar, UploadCard, useArchiveAction, useMe, zodResolverFor } from './shared';

const RIG_FIELDS: Array<[keyof RigForm, string]> = [
  ['cpu', 'CPU'], ['gpu', 'GPU'], ['memory', 'Memory'], ['motherboard', 'Motherboard'],
  ['storage', 'Storage'], ['caseField', 'Case'], ['psu', 'Power'], ['cooling', 'Cooling'], ['os', 'OS'],
];

export function RigEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const hydrated = useRef(false);
  const form = useForm<RigForm>({
    resolver: zodResolverFor(rigSchema),
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
      {RIG_FIELDS.map(([name, label]) => <Field key={name} label={label.toUpperCase()} name={name} form={form}/>)}
      <div className="sm:col-span-2"><Field label="BUILD NOTES" name="notes" form={form} multiline maxLength={2000} placeholder="Why this setup works for you"/></div>
    </div>
    <SaveBar form={form} onSave={save} ready={Boolean(data)}/>
    {data && <PeripheralManager peripherals={data.peripherals}/>}
  </EditorShell>;
}

function PeripheralManager({ peripherals }: { peripherals: ApiPeripheral[] }) {
  const run = useArchiveAction();
  const reduce = useReducedMotion();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(peripherals.find(item => item.id === editingId)?.photo_url ?? null);
  const form = useForm<PeripheralForm>({ resolver: zodResolverFor(peripheralSchema), defaultValues: { type: '', displayName: '', brandModel: '', notes: '' } });
  const openEditor = (item?: typeof peripherals[number], focus = false) => {
    setEditingId(item?.id ?? null);
    setPhotoUrl(item?.photo_url ?? null);
    form.reset({ type: item?.type ?? '', displayName: item?.display_name ?? '', brandModel: item?.brand_model ?? '', notes: item?.notes ?? '' });
    if (focus) {
      document.getElementById('peripheral-form')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      document.getElementById('field-type')?.focus({ preventScroll: true });
    }
  };
  const submit = async (v: PeripheralForm) => {
    const payload = { type: v.type, display_name: v.displayName, brand_model: v.brandModel || null, notes: v.notes || null, photo_url: photoUrl, sort_order: editingId ? (peripherals.find(item => item.id === editingId)?.sort_order ?? 0) : peripherals.length };
    const ok = await run(() => (editingId ? api.updatePeripheral(editingId, payload) : api.createPeripheral(payload)), editingId ? 'Peripheral updated.' : 'Peripheral added.');
    if (ok) openEditor(undefined);
  };
  const ordered = [...peripherals].sort((a, b) => a.sort_order - b.sort_order);
  return <section className="mt-10 border-t border-white/10 pt-8">
    <h2 className="text-xl font-semibold">Peripherals & extras</h2>
    <p className="muted mt-1 text-sm">Keyboard, mouse, headset, chair, mic, anything that shapes the setup.</p>
    <ul className="mt-5 grid gap-3">
      {ordered.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-3">
        <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-200">{item.type}</span>
        <b className="flex-1">{item.display_name}<small className="muted ml-2 font-normal">{item.brand_model}</small></b>
        {item.photo_url && <BadgeCheck size={17} className="text-emerald-300"/>}
        <Button className="icon-btn" aria-label={`Edit ${item.display_name}`} onClick={() => openEditor(item, true)}><Pencil size={16}/></Button>
        <Button className="icon-btn" aria-label={`Remove ${item.display_name}`} onClick={() => {
          if (confirm(`Remove ${item.display_name} from your rig?`)) void run(() => api.deletePeripheral(item.id), 'Peripheral removed.');
        }}><Trash2 size={16}/></Button>
      </li>)}
      {!ordered.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">Nothing documented yet, add your first piece below.</li>}
    </ul>
    <form id="peripheral-form" className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.02] p-4 sm:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
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
