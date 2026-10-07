import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, localDate, parseDate, shortDate, weekStart } from '../model';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * App-styled date picker replacing <input type="date">. In `week` mode the
 * whole week row highlights and the value is that week's Monday. Keyboard:
 * arrows move by day/week, PageUp/PageDown by month, Home/End to week
 * edges, Enter to pick, Escape to close. The calendar renders in the top
 * layer (popover), so it works inside dialogs and clipped containers.
 */
export function DatePicker({
  value,
  onChange,
  label,
  labelledBy,
  mode = 'day',
  className = '',
  tip,
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  labelledBy?: string;
  mode?: 'day' | 'week';
  className?: string;
  tip?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value);
  const [hoverWeek, setHoverWeek] = useState<string | null>(null);
  const today = localDate();
  const month = focused.slice(0, 7);
  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: 6 }, (_, w) =>
    days.slice(w * 7, w * 7 + 7),
  )
    // Drop a trailing week that is entirely in the next month.
    .filter((week, w) => w < 5 || week[0].slice(0, 7) === month);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    if (!open) {
      if (el.matches(':popover-open')) el.hidePopover?.();
      return;
    }
    el.showPopover?.();
    position(el, trigger.current!);
    const close = (e: Event) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || el.contains(t)) return;
      setOpen(false);
    };
    const reflow = () => {
      const r = trigger.current!.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
      else position(el, trigger.current!);
    };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
  }, [open]);

  // Keep keyboard focus on the focused day while the calendar is open.
  useEffect(() => {
    if (!open) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus({ preventScroll: true });
  }, [focused, open]);

  function openPanel() {
    setFocused(value);
    setOpen(true);
  }
  function pick(date: string) {
    onChange(mode === 'week' ? weekStart(date) : date);
    setOpen(false);
    trigger.current?.focus();
  }
  function shiftMonth(delta: number) {
    const d = parseDate(focused);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    setFocused(localDate(d));
  }
  function onGridKey(e: KeyboardEvent) {
    const moves: Record<string, () => string | void> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => weekStart(focused),
      End: () => addDays(weekStart(focused), 6),
      PageUp: () => shiftMonth(-1),
      PageDown: () => shiftMonth(1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      const next = moves[e.key]();
      if (next) setFocused(next);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
  }

  const display =
    mode === 'week'
      ? `${shortDate(value, { day: 'numeric', month: 'short' })} – ${shortDate(addDays(value, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
      : shortDate(value, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  const selectedWeek = weekStart(value);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`date-trigger ${className}`}
        aria-label={labelledBy ? undefined : `${label}: ${display}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}-value` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        data-tip={tip}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openPanel();
          }
        }}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span id={`${id}-value`}>{display}</span>
      </button>
      <div
        ref={panel}
        id={`${id}-panel`}
        popover="manual"
        role="dialog"
        aria-label={mode === 'week' ? 'Choose a week' : 'Choose a date'}
        className="calendar"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        {open && (
          <>
            <div className="calendar-head">
              <button
                type="button"
                className="icon-button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong aria-live="polite">
                {parseDate(first).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              <button
                type="button"
                className="icon-button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div
              ref={grid}
              role="grid"
              className={`calendar-grid ${mode === 'week' ? 'week-mode' : ''}`}
              onKeyDown={onGridKey}
              onPointerLeave={() => setHoverWeek(null)}
            >
              <div role="row" className="calendar-row weekdays">
                {WEEKDAYS.map((d) => (
                  <span role="columnheader" key={d}>
                    {d}
                  </span>
                ))}
              </div>
              {weeks.map((week) => {
                const ws = week[0];
                const weekClass =
                  mode === 'week'
                    ? `${ws === selectedWeek ? 'selected-week' : ''} ${ws === hoverWeek ? 'hover-week' : ''}`
                    : '';
                return (
                  <div
                    role="row"
                    key={ws}
                    className={`calendar-row ${weekClass}`}
                    onPointerEnter={() => mode === 'week' && setHoverWeek(ws)}
                  >
                    {week.map((date) => {
                      const selected =
                        mode === 'week' ? ws === selectedWeek : date === value;
                      return (
                        <span role="gridcell" key={date}>
                          <button
                            type="button"
                            data-date={date}
                            tabIndex={date === focused ? 0 : -1}
                            aria-selected={selected}
                            aria-current={date === today ? 'date' : undefined}
                            aria-label={shortDate(date, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            className={[
                              'calendar-day',
                              date.slice(0, 7) !== month && 'outside',
                              date === today && 'today',
                              mode === 'day' && selected && 'selected',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => pick(date)}
                          >
                            {Number(date.slice(8))}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="calendar-foot">
              <button
                type="button"
                className="text-button"
                onClick={() => pick(today)}
              >
                {mode === 'week' ? 'This week' : 'Today'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function position(panel: HTMLElement, trigger: HTMLElement) {
  const r = trigger.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const below = window.innerHeight - r.bottom;
  const top =
    below < p.height + 8 && r.top > below
      ? Math.max(8, r.top - p.height - 6)
      : r.bottom + 6;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - p.width - 8));
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}
