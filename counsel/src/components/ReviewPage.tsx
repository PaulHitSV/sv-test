import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Pencil,
  Search,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';
import type { Data, Entry } from '../model';
import {
  addDays,
  csv,
  download,
  duration,
  initials,
  shortDate,
  totals,
} from '../model';
import {
  selectReview,
  selectWeek,
  undoEntries,
  updateEntries,
} from '../review';
import type { EntryPatch, ReviewFilters, UndoRecord } from '../review';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { useSlidingIndicator } from '../useSlidingIndicator';

export const defaultReviewView = (week: string): ReviewFilters => ({
  week,
  clientId: 'all',
  employee: 'all',
  status: 'all',
  search: '',
});

export function ReviewPage({
  data,
  save,
  onEdit,
  readOnly,
  view,
  setView,
  operation,
  setOperation,
}: {
  data: Data;
  save: (data: Data) => void;
  onEdit: (entry: Entry) => void;
  readOnly: boolean;
  view: ReviewFilters;
  setView: (view: ReviewFilters) => void;
  operation: UndoRecord | null;
  setOperation: (operation: UndoRecord | null) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [targetClient, setTargetClient] = useState(data.clients[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { week } = view;
  const weekEntries = selectWeek(data.entries, week);
  const visible = selectReview(data.entries, data.clients, view);
  // Totals and export follow exactly what is in view.
  const summary = totals(visible);
  const visibleIds = new Set(visible.map((e) => e.id));
  // Selection never reaches rows outside the current view.
  const selectedIds = selected.filter((id) => visibleIds.has(id));
  const selectedMinutes = totals(
    visible.filter((e) => selectedIds.includes(e.id)),
  ).total;
  // Keep the selection bar mounted briefly after the last row is deselected
  // so it can slide out, showing the counts it had.
  const hasSelection = selectedIds.length > 0;
  const lastBar = useRef({ count: 0, minutes: 0 });
  if (hasSelection)
    lastBar.current = { count: selectedIds.length, minutes: selectedMinutes };
  const [barClosing, setBarClosing] = useState(false);
  const hadSelection = useRef(hasSelection);
  useEffect(() => {
    const was = hadSelection.current;
    hadSelection.current = hasSelection;
    if (hasSelection || !was) {
      setBarClosing(false);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setBarClosing(true);
    const t = setTimeout(() => setBarClosing(false), 180);
    return () => clearTimeout(t);
  }, [hasSelection]);
  const barCount = lastBar.current.count;
  const employees = [...new Set(data.entries.map((e) => e.employee))].sort();
  const weekReviewed = weekEntries.filter((e) => e.reviewed).length;
  const weekOpen = weekEntries.length - weekReviewed;
  const readyMinutes = totals(
    weekEntries.filter((e) => e.reviewed && e.billable),
  ).billable;
  const weekBillable = totals(weekEntries).billable;
  const filtered =
    view.clientId !== 'all' ||
    view.employee !== 'all' ||
    view.status !== 'all' ||
    !!view.search;
  const scopeParts = [
    view.clientId !== 'all' &&
      data.clients.find((c) => c.id === view.clientId)?.name,
    view.employee !== 'all' && view.employee,
    view.status !== 'all' &&
      (view.status === 'reviewed' ? 'Reviewed' : 'Needs review'),
    view.search && `“${view.search}”`,
  ].filter(Boolean);

  function changeView(patch: Partial<ReviewFilters>) {
    setView({ ...view, ...patch });
    if (selectedIds.length) {
      setSelected([]);
      setError('');
      setMessage(
        'Selection cleared because the view changed. Nothing was modified.',
      );
    }
  }
  function apply(ids: string[], patch: EntryPatch, label: string) {
    setError('');
    try {
      const result = updateEntries(data, ids, patch);
      setSelected([]);
      if (!result.changes.length) {
        setMessage(
          'Nothing changed — those entries were already in that state.',
        );
        return;
      }
      save(result.data);
      const n = result.changes.length;
      const text = `${label} ${n} ${n === 1 ? 'entry' : 'entries'}.`;
      const reopened = result.changes.filter(
        (c) => c.before.reviewed && !c.after.reviewed && !('reviewed' in patch),
      ).length;
      setOperation({ label: text, changes: result.changes });
      setMessage(
        reopened
          ? `${text} ${reopened} reviewed ${reopened === 1 ? 'entry needs' : 'entries need'} another check.`
          : text,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function undo() {
    if (!operation) return;
    try {
      save(undoEntries(data, operation));
      setMessage(`Undone: ${operation.label}`);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setMessage('');
    }
    setOperation(null);
  }
  const clientChips = [
    { id: 'all', name: 'All clients', color: '' },
    ...data.clients,
  ]
    .map((c) => ({
      ...c,
      count: selectReview(data.entries, data.clients, {
        ...view,
        clientId: c.id,
      }).length,
    }))
    .filter((c) => c.id === 'all' || c.count || c.id === view.clientId);
  const chipThumb = useSlidingIndicator<HTMLDivElement>(
    `${view.clientId}|${clientChips.map((c) => `${c.id}:${c.count}`).join(',')}`,
  );
  const statusThumb = useSlidingIndicator<HTMLDivElement>(view.status);
  const allChecked =
    visible.length > 0 && selectedIds.length === visible.length;

  return (
    <section className="review-page" aria-label="Weekly review">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {shortDate(week, { day: 'numeric', month: 'short' })} –{' '}
            {shortDate(addDays(week, 6), {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <h1>Weekly review</h1>
        </div>
        <div className="heading-actions">
          <div className="week-selector">
            <button
              className="icon-button"
              aria-label="Previous review week"
              data-tip="Previous week"
              onClick={() => changeView({ week: addDays(week, -7) })}
            >
              <ChevronLeft size={16} />
            </button>
            <DatePicker
              mode="week"
              label="Review week"
              value={week}
              onChange={(date) => changeView({ week: date })}
            />
            <button
              className="icon-button"
              aria-label="Next review week"
              data-tip="Next week"
              onClick={() => changeView({ week: addDays(week, 7) })}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            className="button secondary"
            disabled={!visible.length}
            onClick={() => {
              download(
                csv(visible, data.clients),
                `counsel-review-${week}.csv`,
                'text/csv;charset=utf-8',
              );
              setError('');
              setMessage(
                `Exported ${visible.length} ${visible.length === 1 ? 'entry' : 'entries'} — exactly the rows in view.`,
              );
            }}
          >
            <ArrowDownToLine size={16} />
            Export view ({visible.length})
          </button>
        </div>
      </div>

      <section className="progress-card" aria-label="Week progress">
        <div className="progress-top">
          <p>
            <strong>
              {weekReviewed} of {weekEntries.length}
            </strong>{' '}
            entries reviewed this week.{' '}
            {weekOpen
              ? `${weekOpen} still ${weekOpen === 1 ? 'needs' : 'need'} a check.`
              : weekEntries.length
                ? 'Everything is checked.'
                : 'No time logged this week.'}
          </p>
          <button
            className="button primary"
            disabled={!weekOpen}
            onClick={() =>
              changeView({
                clientId: 'all',
                employee: 'all',
                status: 'pending',
                search: '',
              })
            }
          >
            <ShieldCheck size={16} />
            Show what needs checking
          </button>
        </div>
        <div
          className="progress-bar"
          role="img"
          aria-label={`${weekReviewed} reviewed, ${weekOpen} need review`}
        >
          <i className="done" style={{ flexGrow: weekReviewed }} />
          <i style={{ flexGrow: weekOpen }} />
        </div>
        <div className="progress-legend">
          <span>
            <i className="done" />
            Reviewed <strong>{weekReviewed}</strong>
          </span>
          <span>
            <i />
            Needs review <strong>{weekOpen}</strong>
          </span>
          <span
            className="legend-ready has-tip"
            tabIndex={0}
            data-tip="Billable time on entries that have been reviewed"
          >
            Ready for billing <strong>{duration(readyMinutes)}</strong> of{' '}
            {duration(weekBillable)} billable
          </span>
        </div>
      </section>

      <section className="review-filters" aria-label="Filters">
        <div
          className="chip-row"
          role="group"
          aria-label="Client"
          ref={chipThumb.ref}
        >
          <span
            className={`${chipThumb.className} chip-thumb`}
            style={chipThumb.style}
            aria-hidden="true"
          />
          {clientChips.map((c) => (
            <button
              key={c.id}
              className={`chip ${view.clientId === c.id ? 'active' : ''}`}
              aria-pressed={view.clientId === c.id}
              onClick={() => changeView({ clientId: c.id })}
            >
              {c.color && (
                <i style={{ background: c.color }} aria-hidden="true" />
              )}
              {c.name}
              <span className="chip-count">{c.count}</span>
            </button>
          ))}
        </div>
        <div className="filter-row">
          <div
            className="segmented"
            role="group"
            aria-label="Review status"
            ref={statusThumb.ref}
          >
            <span
              className={statusThumb.className}
              style={statusThumb.style}
              aria-hidden="true"
            />
            {(
              [
                ['all', 'All'],
                ['pending', 'Needs review'],
                ['reviewed', 'Reviewed'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={view.status === value ? 'selected' : ''}
                aria-pressed={view.status === value}
                onClick={() => changeView({ status: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <Select
            label="Review employee"
            value={view.employee}
            onChange={(employee) => changeView({ employee })}
            options={[
              { value: 'all', label: 'All team members' },
              ...employees.map((name) => ({ value: name, label: name })),
            ]}
          />
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search review"
              placeholder="Search descriptions, clients, people"
              value={view.search}
              onChange={(e) => changeView({ search: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel review-panel" aria-label="Entries in view">
        <div className="scope-bar">
          <p className="scope-text">
            <Filter size={15} aria-hidden="true" />
            <span>
              <strong>
                {filtered
                  ? `${visible.length} of ${weekEntries.length} entries · ${scopeParts.join(' · ')}`
                  : `All ${weekEntries.length} entries this week`}
              </strong>{' '}
              · totals and export match this view
            </span>
            {filtered && (
              <button
                className="text-button"
                onClick={() =>
                  changeView({
                    clientId: 'all',
                    employee: 'all',
                    status: 'all',
                    search: '',
                  })
                }
              >
                Clear filters
              </button>
            )}
          </p>
          <dl className="scope-totals" aria-label="Review summary">
            <div>
              <dt>Time</dt>
              <dd data-testid="review-total">{duration(summary.total)}</dd>
            </div>
            <div>
              <dt>Billable</dt>
              <dd data-testid="review-billable">
                {duration(summary.billable)}
              </dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>
                {visible.filter((e) => e.reviewed).length} / {visible.length}
              </dd>
            </div>
          </dl>
        </div>

        <div className="review-notice" aria-live="polite">
          {error && (
            <p className="notice error" role="alert">
              <Info size={16} aria-hidden="true" />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss message"
                data-tip="Dismiss"
                onClick={() => setError('')}
              >
                <X size={14} />
              </button>
            </p>
          )}
          {!error && (message || operation) && (
            <p className="notice">
              <Info size={16} aria-hidden="true" />
              <span>{message}</span>
              {operation && (
                <button
                  className="text-button"
                  disabled={readOnly}
                  onClick={undo}
                >
                  <Undo2 size={14} />
                  Undo last action
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                data-tip="Dismiss"
                onClick={() => setMessage('')}
              >
                <X size={14} />
              </button>
            </p>
          )}
        </div>

        {!visible.length ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Check size={20} />
            </span>
            <h3>Nothing in this view.</h3>
            <p>
              {weekEntries.length
                ? 'Every entry matching these filters is handled. Adjust the filters or choose another week.'
                : 'No time was logged this week. Choose another week.'}
            </p>
          </div>
        ) : (
          <div className="review-table">
            <div className="review-head">
              <label className="check-cell">
                <input
                  type="checkbox"
                  aria-label="Select visible entries"
                  checked={allChecked}
                  disabled={readOnly}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? visible.map((e) => e.id) : [],
                    )
                  }
                />
              </label>
              <span className="head-mobile" aria-hidden="true">
                Select all in view
              </span>
              <span>Date</span>
              <span>Person</span>
              <span>Client</span>
              <span>Description</span>
              <span>Billing</span>
              <span className="num-col">Time</span>
              <span>Status</span>
              <span className="sr-only">Edit</span>
            </div>
            {visible.map((entry) => {
              const client = data.clients.find((c) => c.id === entry.clientId)!;
              const checked = selectedIds.includes(entry.id);
              const name = entry.description || client.name;
              return (
                <article
                  className={`review-row ${checked ? 'selected' : ''}`}
                  data-entry-id={entry.id}
                  key={entry.id}
                >
                  <label className="check-cell">
                    <input
                      type="checkbox"
                      aria-label={`Select ${name}`}
                      checked={checked}
                      disabled={readOnly}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selectedIds, entry.id]
                            : selectedIds.filter((id) => id !== entry.id),
                        )
                      }
                    />
                  </label>
                  <span className="cell-date">
                    {shortDate(entry.date, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="cell-person">
                    <span className="tiny-avatar" aria-hidden="true">
                      {initials(entry.employee)}
                    </span>
                    <span className="truncate">{entry.employee}</span>
                  </span>
                  <span className="cell-client">
                    <i
                      style={{ background: client.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{client.name}</span>
                  </span>
                  <span className="cell-desc truncate">
                    {entry.description || 'No description'}
                  </span>
                  <span className="cell-bill">
                    <span className={`tag ${entry.billable ? 'billable' : ''}`}>
                      {entry.billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </span>
                  <span className="cell-time num-col">
                    {duration(entry.minutes)}
                  </span>
                  <span className="cell-status">
                    <button
                      className={`status-pill ${entry.reviewed ? 'is-reviewed' : ''}`}
                      disabled={readOnly}
                      aria-label={`${entry.reviewed ? 'Reopen' : 'Review'} ${name}`}
                      onClick={() =>
                        apply(
                          [entry.id],
                          { reviewed: !entry.reviewed },
                          entry.reviewed ? 'Returned to review:' : 'Reviewed',
                        )
                      }
                    >
                      <i aria-hidden="true" />
                      {entry.reviewed ? 'Reviewed' : 'Needs review'}
                    </button>
                  </span>
                  <span className="cell-edit">
                    <button
                      className="icon-button"
                      aria-label={`Edit review entry: ${name}`}
                      data-tip="Edit entry"
                      disabled={readOnly}
                      onClick={() => onEdit(entry)}
                    >
                      <Pencil size={15} />
                    </button>
                  </span>
                </article>
              );
            })}
          </div>
        )}

        {(hasSelection || barClosing) && (
          <div
            className={`selection-bar ${hasSelection ? '' : 'closing'}`}
            role={hasSelection ? 'region' : undefined}
            aria-label={hasSelection ? 'Selected entries' : undefined}
            aria-hidden={!hasSelection || undefined}
            inert={!hasSelection}
          >
            <span className="selection-count">
              <strong>
                {barCount} selected · {duration(lastBar.current.minutes)}
              </strong>
              <span>
                Actions change only{' '}
                {barCount === 1 ? 'this entry' : `these ${barCount} entries`}
              </span>
            </span>
            <div className="selection-actions">
              <button
                className="bar-button primary"
                disabled={readOnly}
                onClick={() =>
                  apply(selectedIds, { reviewed: true }, 'Marked reviewed:')
                }
              >
                <Check size={15} />
                Mark reviewed
              </button>
              <button
                className="bar-button"
                disabled={readOnly}
                onClick={() =>
                  apply(selectedIds, { reviewed: false }, 'Returned to review:')
                }
              >
                Return to review
              </button>
              <button
                className="bar-button"
                disabled={readOnly}
                onClick={() =>
                  apply(selectedIds, { billable: true }, 'Made billable:')
                }
              >
                Make billable
              </button>
              <button
                className="bar-button"
                disabled={readOnly}
                onClick={() =>
                  apply(selectedIds, { billable: false }, 'Made non-billable:')
                }
              >
                Make non-billable
              </button>
              <span className="move-group">
                <Select
                  label="Destination client"
                  className="bar-select"
                  value={targetClient}
                  onChange={setTargetClient}
                  options={data.clients.map((c) => ({
                    value: c.id,
                    label: c.name,
                    color: c.color,
                  }))}
                />
                <button
                  className="bar-button"
                  disabled={readOnly}
                  onClick={() =>
                    apply(
                      selectedIds,
                      { clientId: targetClient },
                      `Moved to ${data.clients.find((c) => c.id === targetClient)?.name}:`,
                    )
                  }
                >
                  Move
                </button>
              </span>
              <button
                className="bar-button icon-only"
                aria-label="Clear selection"
                data-tip="Clear selection"
                onClick={() => setSelected([])}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="table-footer">
          <span>
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'} in
            view
          </span>
          <span>Export includes exactly the entries in this view.</span>
        </div>
      </section>
    </section>
  );
}
