import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard } from 'lucide-react';
import { useDialogA11y } from '../../lib/useDialogA11y';
import { Button } from '../../components/ui';

const ROWS: Array<[string, string]> = [
  ['/', 'Focus chronicle search'],
  ['?', 'Open this cheatsheet'],
  ['Esc', 'Close a dossier or this panel'],
  ['← →', 'Step through dossiers'],
];

function typingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function ArchiveShortcuts({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useDialogA11y(panel, open, () => setOpen(false));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '?' && !typingInField(event.target)) {
        event.preventDefault();
        setOpen(value => !value);
        return;
      }
      if (event.key === '/' && !typingInField(event.target) && !open) {
        event.preventDefault();
        onSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSearch, open]);

  return createPortal(
    <>
      <button
        type="button"
        className="no-print glass icon-btn fixed bottom-5 left-5 z-[70] rounded-full text-cyan-200"
        aria-label="Keyboard shortcuts"
        onClick={() => setOpen(true)}
      >
        <Keyboard size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#03050b]/80 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="shortcut-title" className="glass w-full max-w-md rounded-[22px] p-6">
            <div className="eyebrow">Archive keys</div>
            <h2 id="shortcut-title" className="mt-3 text-2xl font-semibold">Move without the mouse.</h2>
            <dl className="mt-6 divide-y divide-white/10">
              {ROWS.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3">
                  <dt><kbd className="rounded-md border border-ink/15 bg-ink/5 px-2 py-1 font-mono text-sm">{key}</kbd></dt>
                  <dd className="muted text-sm">{label}</dd>
                </div>
              ))}
            </dl>
            <Button className="btn-primary mt-6 w-full" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
