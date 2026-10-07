import { useEffect, useRef, useState } from 'react';

type Side = 'top' | 'bottom';

/**
 * One app-wide tooltip for any element with a `data-tip` attribute.
 * Shows after a short hover delay (mouse/pen) or immediately on keyboard
 * focus, animates in from the target and fades out. Rendered in the top
 * layer (popover) so table overflow and open dialogs never clip it. Purely
 * visual: targets keep their own accessible name.
 */
export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const target = useRef<Element | null>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  // Once a tooltip is visible, moving to a neighbouring control shows the
  // next one without waiting for the hover delay again.
  const warmUntil = useRef(0);

  useEffect(() => {
    const tip = ref.current!;
    const isOpen = () => tip.matches(':popover-open');
    const hide = () => {
      window.clearTimeout(showTimer.current);
      if (target.current && isOpen()) warmUntil.current = Date.now() + 400;
      target.current = null;
      if (!isOpen() || tip.dataset.state === 'closing') return;
      tip.dataset.state = 'closing';
      hideTimer.current = window.setTimeout(() => {
        tip.hidePopover?.();
        delete tip.dataset.state;
      }, 110);
    };
    const show = (el: Element) => {
      const label = el.getAttribute('data-tip');
      if (!label) return;
      window.clearTimeout(hideTimer.current);
      target.current = el;
      setText(label);
      requestAnimationFrame(() => {
        if (target.current !== el) return;
        // Re-show so the tooltip stacks above anything opened since.
        if (isOpen()) tip.hidePopover?.();
        tip.dataset.state = 'open';
        tip.showPopover?.();
        tip.dataset.side = place(tip, el);
      });
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = (e.target as Element).closest?.('[data-tip]');
      if (!el || el === target.current) return;
      hide();
      target.current = el;
      const delay = Date.now() < warmUntil.current ? 0 : 300;
      showTimer.current = window.setTimeout(() => show(el), delay);
    };
    const out = (e: PointerEvent) => {
      const el = target.current;
      if (el && !el.contains(e.relatedTarget as Node | null)) hide();
    };
    const focus = (e: FocusEvent) => {
      const el = (e.target as Element).closest?.('[data-tip]');
      if (el && (e.target as Element).matches(':focus-visible')) show(el);
    };
    // Scrolling moves the target: close an open tooltip, but let a pending
    // one appear (it is positioned when shown).
    const scrolled = () => {
      if (isOpen() && tip.dataset.state === 'open') hide();
    };
    // Only a focus change on the tooltip's own target closes it.
    const blurred = (e: FocusEvent) => {
      if (target.current?.contains(e.target as Node)) hide();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    const press = () => {
      warmUntil.current = 0;
      hide();
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blurred);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', hide);
    return () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', blurred);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  return (
    <div ref={ref} popover="manual" className="tooltip" aria-hidden="true">
      {text}
    </div>
  );
}

function place(tip: HTMLElement, el: Element): Side {
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const gap = 9;
  let side: Side = 'top';
  let top = r.top - t.height - gap;
  if (top < 4) {
    side = 'bottom';
    top = r.bottom + gap;
  }
  const center = r.left + r.width / 2;
  const left = Math.min(
    Math.max(4, center - t.width / 2),
    window.innerWidth - t.width - 4,
  );
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
  // Keep the arrow pointing at the target even when the bubble is clamped.
  tip.style.setProperty(
    '--arrow-x',
    `${Math.min(Math.max(10, center - left), t.width - 10)}px`,
  );
  return side;
}
