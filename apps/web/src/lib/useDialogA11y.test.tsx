import { useRef } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useDialogA11y } from './useDialogA11y';

afterEach(cleanup);

function DialogSurface({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, open, onClose);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Test dialog" ref={ref}>
      <button type="button" data-autofocus>Inside first</button>
      <button type="button">Inside second</button>
    </div>
  );
}

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div>
      <header><a href="/">Behind the dialog</a></header>
      <main><DialogSurface open={open} onClose={onClose} /></main>
    </div>
  );
}

describe('useDialogA11y', () => {
  it('occludes sibling branches with inert and restores them on close', async () => {
    const view = render(<Harness open onClose={() => undefined} />);
    const header = screen.getByRole('link', { name: 'Behind the dialog' }).closest('header');
    expect(header).toHaveAttribute('inert');
    // Focus moves into the dialog on open (deferred one animation frame).
    await waitFor(() => expect(screen.getByRole('button', { name: 'Inside first' })).toHaveFocus());
    view.rerender(<Harness open={false} onClose={() => undefined} />);
    expect(header).not.toHaveAttribute('inert');
  });

  it('traps Tab inside the container', async () => {
    const user = userEvent.setup();
    render(<Harness open onClose={() => undefined} />);
    const first = screen.getByRole('button', { name: 'Inside first' });
    const second = screen.getByRole('button', { name: 'Inside second' });
    await waitFor(() => expect(first).toHaveFocus());
    await user.tab();
    expect(second).toHaveFocus();
    await user.tab();
    // Wraps back to the first focusable element.
    expect(first).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(second).toHaveFocus();
  });

  it('closes on Escape', async () => {
    let closed = false;
    const user = userEvent.setup();
    render(<Harness open onClose={() => { closed = true; }} />);
    await user.keyboard('{Escape}');
    expect(closed).toBe(true);
  });
});
