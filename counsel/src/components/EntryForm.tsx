import { useState } from 'react';
import { Check, Plus, ShieldCheck } from 'lucide-react';
import {
  COLORS,
  duration,
  EMPLOYEE,
  localDate,
  shortDate,
  validateEntry,
} from '../model';
import type { Client, Entry } from '../model';
import { meaningfulChange } from '../review';
import { Modal } from './Modal';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
export type EntryTemplate = Pick<
  Entry,
  'clientId' | 'minutes' | 'billable' | 'description'
>;
export function EntryForm({
  entry,
  template,
  clients,
  onSave,
  onClose,
}: {
  entry?: Entry;
  /** Prefill a new entry (used by "Repeat yesterday"). */
  template?: EntryTemplate;
  clients: Client[];
  onSave: (entry: Entry, client?: Client) => void;
  onClose: () => void;
}) {
  const source = entry ?? template;
  const [date, setDate] = useState(entry?.date ?? localDate());
  const [hours, setHours] = useState(
    source ? String(Math.floor(source.minutes / 60)) : '',
  );
  const [minutes, setMinutes] = useState(
    source ? String(source.minutes % 60) : '',
  );
  const [clientId, setClientId] = useState(
    source?.clientId ?? clients[0]?.id ?? '__new',
  );
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState(source?.description ?? '');
  // Start from the entry's own billability; only brand-new entries default to billable.
  const [billable, setBillable] = useState(source?.billable ?? true);
  const [error, setError] = useState('');
  const draft: Entry | undefined = entry && {
    ...entry,
    date,
    minutes: Number(hours) * 60 + Number(minutes),
    clientId,
    billable,
    description: cleanDescription(entry, description),
  };
  const changed = entry && draft ? changedFields(entry, draft, clients) : [];
  return (
    <Modal
      title={entry ? 'Edit entry' : template ? 'Repeat entry' : 'Log time'}
      subtitle={
        entry
          ? `${entry.employee} · ${shortDate(entry.date, { weekday: 'short', day: 'numeric', month: 'short' })}`
          : template
            ? 'Prefilled from your most recent day. Check the details before saving.'
            : undefined
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          try {
            let client: Client | undefined;
            if (clientId === '__new') {
              const name = clientName.trim();
              if (!name) throw new Error('Enter a client name.');
              if (
                clients.some((c) => c.name.toLowerCase() === name.toLowerCase())
              )
                throw new Error(
                  'That client already exists. Select it from the list.',
                );
              client = {
                id: crypto.randomUUID(),
                name,
                color: COLORS[clients.length % COLORS.length],
              };
            }
            const next: Entry = {
              ...(entry ?? {}),
              id: entry?.id ?? crypto.randomUUID(),
              date,
              minutes: Number(hours) * 60 + Number(minutes),
              clientId: client?.id ?? clientId,
              billable,
              description: cleanDescription(entry, description),
              employee: entry?.employee ?? EMPLOYEE,
            };
            validateEntry(next, client ? [...clients, client] : clients);
            onSave(next, client);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="field">
          <span id="entry-client-label">Client</span>
          <Select
            labelledBy="entry-client-label"
            value={clientId}
            onChange={setClientId}
            options={[
              ...clients.map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color,
              })),
              { value: '__new', label: '+ Create a new client' },
            ]}
          />
        </div>
        {clientId === '__new' && (
          <label className="field">
            New client name
            <input
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. Meridian Holdings"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
        )}
        <div className="form-row">
          <div className="field">
            <span id="entry-date-label">Date</span>
            <DatePicker
              labelledBy="entry-date-label"
              value={date}
              onChange={setDate}
            />
          </div>
          <fieldset className="duration-field">
            <legend>Duration</legend>
            <div>
              <label>
                <input
                  aria-label="Hours"
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
                <span>h</span>
              </label>
              <label>
                <input
                  aria-label="Minutes"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  placeholder="00"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
                <span>m</span>
              </label>
            </div>
          </fieldset>
        </div>
        <label className="field">
          Description <span className="optional">optional</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="billable-control">
          <span>
            <strong>Billable</strong>
            <span>Include this work in billable hours.</span>
          </span>
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          <span className="switch" aria-hidden="true">
            <Check size={12} />
          </span>
        </label>
        {entry && (
          <section className="change-summary" aria-label="Changes on save">
            <div className="change-head">
              <strong>What will be saved</strong>
              <span>
                {changed.length
                  ? `${changed.length} ${changed.length === 1 ? 'change' : 'changes'}`
                  : 'No changes'}
              </span>
            </div>
            {changed.map((c) => (
              <div className="change-row" key={c.label}>
                <span>{c.label}</span>
                <span>
                  <s>{c.from || '—'}</s>
                  <b>{c.to || '—'}</b>
                </span>
              </div>
            ))}
            <p className="change-note">
              <ShieldCheck size={15} aria-hidden="true" />
              {entry.reviewed
                ? changed.length
                  ? 'This entry was reviewed. Saving these changes returns it to review.'
                  : 'Saving without changes keeps it reviewed.'
                : 'This entry is waiting for review.'}
            </p>
          </section>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {entry ? <Check size={16} /> : <Plus size={16} />}{' '}
            {entry ? 'Save changes' : 'Save entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
/** Trim typed text, but keep the stored value when only whitespace differs,
 * so an unchanged save never counts as a correction. */
function cleanDescription(entry: Entry | undefined, typed: string) {
  const trimmed = typed.trim();
  return entry && entry.description.trim() === trimmed
    ? entry.description
    : trimmed;
}
function changedFields(before: Entry, after: Entry, clients: Client[]) {
  if (!meaningfulChange(before, after)) return [];
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? '';
  const rows: { label: string; from: string; to: string }[] = [];
  if (before.description !== after.description)
    rows.push({
      label: 'Description',
      from: before.description,
      to: after.description,
    });
  if (before.clientId !== after.clientId)
    rows.push({
      label: 'Client',
      from: name(before.clientId),
      to: after.clientId === '__new' ? 'New client' : name(after.clientId),
    });
  if (before.date !== after.date)
    rows.push({ label: 'Date', from: before.date, to: after.date });
  if (before.minutes !== after.minutes)
    rows.push({
      label: 'Duration',
      from: duration(before.minutes),
      to: Number.isFinite(after.minutes) ? duration(after.minutes) : '',
    });
  if (before.billable !== after.billable)
    rows.push({
      label: 'Billing',
      from: before.billable ? 'Billable' : 'Non-billable',
      to: after.billable ? 'Billable' : 'Non-billable',
    });
  return rows;
}
