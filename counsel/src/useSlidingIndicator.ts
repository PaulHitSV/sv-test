import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Positions one highlight ("thumb") under the pressed button of a group so it
 * can slide between options. The container must be `position: relative`;
 * the active child is the one with aria-pressed="true".
 */
export function useSlidingIndicator<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const update = () => {
      const active = group.querySelector<HTMLElement>(
        ':scope > [aria-pressed="true"]',
      );
      setStyle(
        active
          ? {
              opacity: 1,
              width: active.offsetWidth,
              height: active.offsetHeight,
              transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)`,
            }
          : { opacity: 0 },
      );
    };
    update();
    // Enable the transition only after the first placement, so the thumb
    // doesn't fly in from the corner on page load.
    const timer = window.setTimeout(() => setReady(true), 50);
    const observer = new ResizeObserver(update);
    observer.observe(group);
    for (const child of group.children) observer.observe(child);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [key]);
  return { ref, style, className: `slide-thumb${ready ? ' ready' : ''}` };
}
