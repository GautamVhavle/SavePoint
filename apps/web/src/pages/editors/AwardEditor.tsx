import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Panel, Button } from '../../components/ui';
import { api } from '../../lib/api';
import { awardSchema, type AwardForm } from '../../lib/schemas';
import { STATUS_LABELS } from '../../types';
import { EditorShell, Field, SelectField, useArchiveAction, useMe , zodResolverFor } from './shared';

export function AwardEditor() {
  const { data } = useMe();
  const run = useArchiveAction();
  const form = useForm<AwardForm>({ resolver: zodResolverFor(awardSchema), defaultValues: { profileGameId: '', title: '', description: '', awardedOn: '' } });
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
      <div className="sm:col-span-2"><Field label="CITATION" name="description" form={form} multiline maxLength={2000} placeholder="Why it earned this"/></div>
      <Field label="AWARDED ON" name="awardedOn" form={form} type="date"/>
      <div className="flex items-end"><Button className="btn-primary" type="submit" disabled={form.formState.isSubmitting}><Plus size={16}/> Attach award</Button></div>
    </form>
    <section className="mt-10 border-t border-white/10 pt-8">
      <h2 className="text-xl font-semibold">Cabinet ({data?.awards.length ?? 0})</h2>
      <ul className="mt-5 grid gap-3">
        {(data?.awards ?? []).map(award => <li key={award.id} className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
          <Star size={18} className="shrink-0 text-amber-300"/>
          <div className="flex-1"><b>{award.title}</b><p className="muted text-sm">{titleOf(award.profile_game_id)}{award.description ? ` · ${award.description}` : ''}</p></div>
          <Button className="icon-btn" aria-label={`Delete ${award.title}`} onClick={() => {
            if (confirm(`Remove the "${award.title}" award?`)) void run(() => api.deleteAward(award.id), 'Award removed.');
          }}><Trash2 size={16}/></Button>
        </li>)}
        {data && !data.awards.length && <li className="muted rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm">No awards yet.</li>}
      </ul>
    </section>
  </EditorShell>;
}
