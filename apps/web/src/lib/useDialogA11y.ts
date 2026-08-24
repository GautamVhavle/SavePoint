import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', '[role="button"]:not([disabled])', 'summary',
  'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dialog keyboard semantics: moves focus into `container` on open, traps Tab/Shift+Tab
 * inside it, closes on Escape, occludes the page behind it, locks body scroll,
 * and restores focus to the trigger on close.
 *
 * `boundary` marks the dialog system's outermost overlay: inerting stops below
 * it so interactive siblings inside that overlay (e.g. a click-to-close
 * backdrop) stay live while everything outside is occluded.
 */
export function useDialogA11y(
  container: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
  boundary?: RefObject<HTMLElement | null>,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const node = container.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Screen-reader virtual cursors ignore focus traps, so occlude every
    // sibling branch behind the dialog with [inert] and restore on close.
    const stopAt = boundary?.current ?? null;
    const inerted: HTMLElement[] = [];
    let ancestor = node;
    while (ancestor && ancestor !== document.body) {
      // Inside a declared overlay boundary: leave the overlay's own
      // internals (backdrops, panels) interactive.
      if (stopAt && ancestor !== stopAt && stopAt.contains(ancestor)) {
        ancestor = ancestor.parentElement;
        continue;
      }
      const branch = ancestor;
      for (const sibling of Array.from(branch.parentElement?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.contains(node) && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '');
          inerted.push(sibling);
        }
      }
      if (ancestor === stopAt) break;
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
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [active, container]);
}
