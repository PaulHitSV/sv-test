import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string; color?: string };

/**
 * App-styled replacement for <select>. ARIA combobox (select-only) pattern:
 * focus stays on the trigger, the active option is exposed through
 * aria-activedescendant. The list renders in the top layer (popover), so it
 * works inside dialogs and clipped containers.
 */
export function Select({
  label,
  labelledBy,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
  tip,
}: {
  label?: string;
  labelledBy?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  tip?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef({ text: '', at: 0 });
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    const list = menu.current;
    if (!list) return;
    if (!open) {
      if (list.matches(':popover-open')) list.hidePopover?.();
      return;
    }
    list.showPopover?.();
    position(list, trigger.current!);
    list
      .querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
    const close = (e: Event) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || list.contains(t)) return;
      setOpen(false);
    };
    const reflow = () => position(list, trigger.current!);
    // Follow the trigger while the page scrolls; close once it leaves view.
    const scrolled = (e: Event) => {
      if (list.contains(e.target as Node)) return;
      const r = trigger.current!.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
      else reflow();
    };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', reflow);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', reflow);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-opt-${active}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function choose(index: number) {
    const option = options[index];
    setOpen(false);
    if (option && option.value !== value) onChange(option.value);
    trigger.current?.focus();
  }
  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(last);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        return;
      case 'Escape':
        // Close the list without also closing a surrounding dialog.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      case 'Tab':
        setOpen(false);
        return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      typed.current.text =
        (now - typed.current.at < 700 ? typed.current.text : '') +
        e.key.toLowerCase();
      typed.current.at = now;
      const match = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(typed.current.text),
      );
      if (match >= 0) setActive(match);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className={`select-trigger ${className}`}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        data-tip={tip}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected?.color && (
          <i
            className="select-dot"
            style={{ background: selected.color }}
            aria-hidden="true"
          />
        )}
        <span className="select-value">{selected?.label}</span>
        <ChevronDown size={15} className="select-chevron" aria-hidden="true" />
      </button>
      <div
        ref={menu}
        id={`${id}-list`}
        popover="manual"
        role="listbox"
        aria-label={label}
        aria-labelledby={labelledBy}
        className="select-menu"
      >
        {open &&
          options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`select-option ${index === active ? 'active' : ''}`}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.color && (
                <i
                  className="select-dot"
                  style={{ background: option.color }}
                  aria-hidden="true"
                />
              )}
              <span>{option.label}</span>
              {option.value === value && (
                <Check size={14} className="select-check" aria-hidden="true" />
              )}
            </div>
          ))}
      </div>
    </>
  );
}

function position(list: HTMLElement, trigger: HTMLElement) {
  const r = trigger.getBoundingClientRect();
  list.style.minWidth = `${r.width}px`;
  const height = list.getBoundingClientRect().height;
  const below = window.innerHeight - r.bottom;
  const top =
    below < height + 8 && r.top > below
      ? Math.max(8, r.top - height - 4)
      : r.bottom + 4;
  const width = list.getBoundingClientRect().width;
  list.style.top = `${top}px`;
  list.style.left = `${Math.min(r.left, window.innerWidth - width - 8)}px`;
}
