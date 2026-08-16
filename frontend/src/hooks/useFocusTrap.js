import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Traps Tab/Shift+Tab focus cycling within the given ref's subtree while
 * `active` is true, and moves initial focus into the modal on open. Used by
 * the details, trailer, and auth modals so keyboard-only users can't tab
 * out to the page behind an open modal.
 */
export default function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => el.offsetParent !== null);

    const initial = focusables();
    if (initial.length) {
      initial[0].focus();
    } else {
      container.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [active, containerRef]);
}
