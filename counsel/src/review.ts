import type { Client, Data, Entry } from './model';
import { addDays, validateEntry } from './model';

export type ReviewFilters = {
  week: string;
  clientId: string;
  employee: string;
  status: string;
  search: string;
};
export type EntryPatch = Partial<
  Pick<Entry, 'clientId' | 'billable' | 'reviewed'>
>;
/** One entry touched by a review action: its value before and right after. */
export type EntryChange = { before: Entry; after: Entry };
export type UndoRecord = { label: string; changes: EntryChange[] };

export function selectWeek(entries: Entry[], week: string) {
  return entries.filter(
    (entry) => entry.date >= week && entry.date <= addDays(week, 6),
  );
}
export function selectReview(
  entries: Entry[],
  clients: Client[],
  filters: ReviewFilters,
) {
  return selectWeek(entries, filters.week)
    .filter(
      (entry) =>
        (filters.clientId === 'all' || entry.clientId === filters.clientId) &&
        (filters.employee === 'all' || entry.employee === filters.employee) &&
        (filters.status === 'all' ||
          !!entry.reviewed === (filters.status === 'reviewed')) &&
        `${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name ?? ''} ${entry.employee}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.employee.localeCompare(b.employee) ||
        a.id.localeCompare(b.id),
    );
}
/** Fields a reviewer checks. Changing any of them requires review again. */
const REVIEWED_FIELDS = [
  'date',
  'employee',
  'clientId',
  'minutes',
  'billable',
  'description',
] as const;
export function meaningfulChange(previous: Entry, next: Entry) {
  return REVIEWED_FIELDS.some((field) => previous[field] !== next[field]);
}
export function sameEntry(a: Entry, b: Entry) {
  return !meaningfulChange(a, b) && !!a.reviewed === !!b.reviewed;
}
export function applyEntryUpdate(previous: Entry, next: Entry): Entry {
  return {
    ...next,
    reviewed: meaningfulChange(previous, next) ? false : previous.reviewed,
  };
}
export function saveEntry(
  data: Data,
  entry: Entry,
  client?: Client,
  original?: Entry,
): Data {
  const previous = data.entries.find((e) => e.id === entry.id);
  if (original && (!previous || !sameEntry(previous, original)))
    throw new Error(
      'This entry changed while you were editing. Close and reopen it to use the latest version.',
    );
  const clients = client ? [...data.clients, client] : data.clients;
  validateEntry(entry, clients);
  return {
    ...data,
    clients,
    entries: [
      ...data.entries.filter((e) => e.id !== entry.id),
      previous
        ? applyEntryUpdate(previous, entry)
        : { ...entry, reviewed: false },
    ],
  };
}
/**
 * Applies a review action to the given entries. A correction (client or
 * billability) to a reviewed entry returns it to review unless the patch sets
 * `reviewed` itself. Returns the new data and the per-entry changes for undo.
 */
export function updateEntries(
  data: Data,
  ids: string[],
  patch: EntryPatch,
): { data: Data; changes: EntryChange[] } {
  const selected = new Set(ids);
  if (ids.some((id) => !data.entries.some((e) => e.id === id)))
    throw new Error('An entry no longer exists. Refresh your selection.');
  const changes: EntryChange[] = [];
  const entries = data.entries.map((entry) => {
    if (!selected.has(entry.id)) return entry;
    const merged: Entry = { ...entry, ...patch };
    if (!('reviewed' in patch) && meaningfulChange(entry, merged))
      merged.reviewed = false;
    validateEntry(merged, data.clients);
    if (!sameEntry(entry, merged))
      changes.push({ before: entry, after: merged });
    return merged;
  });
  return { data: { ...data, entries }, changes };
}
/**
 * Reverses a review action on the affected entries only. Declines (throws)
 * when any affected entry was edited, deleted or re-reviewed since, so newer
 * work is never silently erased.
 */
export function undoEntries(data: Data, operation: UndoRecord): Data {
  const conflicts = operation.changes.filter(({ after }) => {
    const current = data.entries.find((e) => e.id === after.id);
    return !current || !sameEntry(current, after);
  });
  if (conflicts.length)
    throw new Error(
      `Undo isn’t available: ${conflicts.length === 1 ? `“${conflicts[0].after.description || 'an entry'}” was` : `${conflicts.length} entries were`} changed after this action. Nothing was reverted.`,
    );
  const restore = new Map(
    operation.changes.map((c) => [c.before.id, c.before]),
  );
  if (
    [...restore.values()].some(
      (e) => !data.clients.some((c) => c.id === e.clientId),
    )
  )
    throw new Error(
      'Undo isn’t available: a client was removed. Nothing was reverted.',
    );
  return {
    ...data,
    entries: data.entries.map((e) => restore.get(e.id) ?? e),
  };
}
