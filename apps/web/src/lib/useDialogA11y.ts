import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dialog keyboard semantics: moves focus into `container` on open, traps Tab/Shift+Tab
 * inside it, closes on Escape, and restores focus to the trigger on close.
 */
export function useDialogA11y(
  container: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const node = container.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Screen-reader virtual cursors ignore focus traps, so occlude every
    // sibling branch behind the dialog with [inert] and restore on close.
    const inerted: HTMLElement[] = [];
    let ancestor = node;
    while (ancestor && ancestor !== document.body) {
      const branch = ancestor;
      for (const sibling of Array.from(branch.parentElement?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.contains(node) && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '');
          inerted.push(sibling);
        }
      }
      ancestor = ancestor.parentElement;
    }
    const raf = requestAnimationFrame(() => {
      const initial = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
      initial?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && node.contains(current);
      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      inerted.forEach(el => el.removeAttribute('inert'));
      previouslyFocused?.focus();
    };
  }, [active, container]);
}
