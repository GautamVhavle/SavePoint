import { useRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { useDialogA11y } from '../lib/useDialogA11y';

afterEach(cleanup);

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom');
  return <p>fine</p>;
}

describe('ErrorBoundary', () => {
  it('renders the recovery screen instead of crashing the tree', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ErrorBoundary><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('This view hit a snag.');
    spy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});

function DialogHarness({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, open);
  return (
    <>
      <button type="button" id="trigger">trigger</button>
      {open && (
        <div ref={ref} role="dialog">
          <input id="first" aria-label="first field" />
          <button type="button" onClick={() => undefined}>inside action</button>
        </div>
      )}
      <button type="button" id="outside">outside</button>
    </>
  );
}

describe('useDialogA11y', () => {
  it('moves focus into the dialog on open and traps Tab inside', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DialogHarness open={false} />);
    screen.getByText('trigger').focus();
    rerender(<DialogHarness open />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('first field')));

    // Tab from the last focusable wraps to the first.
    screen.getByText('inside action').focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('first field'));
    // Shift+Tab from the first wraps back to the last.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(screen.getByText('inside action'));

    rerender(<DialogHarness open={false} />);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('trigger')));
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      useDialogA11y(ref, true, onEscape);
      return <div ref={ref} role="dialog"><button type="button">close target</button></div>;
    }
    render(<Harness />);
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledOnce();
  });
});
