import { describe, expect, it } from 'vitest';
import { decodeData } from './model';
import type { Data } from './model';
import pilot from './fixtures/pilot-workspace.json';
import { saveEntry, selectReview, undoEntries, updateEntries } from './review';

const load = (): Data => decodeData(JSON.stringify(pilot));
const find = (data: Data, description: string) =>
  data.entries.find((e) => e.description === description)!;

describe('editing one field preserves the others', () => {
  it('keeps a non-billable entry non-billable when only the wording changes', () => {
    const data = load();
    const planning = find(data, 'Weekly team planning');
    const next = saveEntry(
      data,
      { ...planning, description: 'Weekly team planning (internal)' },
      undefined,
      planning,
    );
    const saved = find(next, 'Weekly team planning (internal)');
    expect(saved.billable).toBe(false);
    expect(saved.clientId).toBe('internal');
    expect(saved.minutes).toBe(45);
  });
  it('keeps review status when an unchanged entry is saved', () => {
    const data = load();
    const reviewed = find(data, 'Shareholder agreement review');
    const next = saveEntry(data, { ...reviewed }, undefined, reviewed);
    expect(find(next, 'Shareholder agreement review').reviewed).toBe(true);
  });
  it('requires review again after a meaningful form edit', () => {
    const data = load();
    const reviewed = find(data, 'Shareholder agreement review');
    const next = saveEntry(
      data,
      { ...reviewed, minutes: 120 },
      undefined,
      reviewed,
    );
    expect(find(next, 'Shareholder agreement review').reviewed).toBe(false);
  });
});

describe('review actions', () => {
  it('returns a reviewed entry to review when its client is corrected', () => {
    const data = load();
    const entry = find(data, 'Shareholder agreement review');
    const { data: next, changes } = updateEntries(data, [entry.id], {
      clientId: 'foundation',
    });
    const moved = find(next, 'Shareholder agreement review');
    expect(moved.clientId).toBe('foundation');
    expect(moved.reviewed).toBe(false);
    expect(changes).toHaveLength(1);
  });
  it('returns a reviewed entry to review when billability changes', () => {
    const data = load();
    const entry = find(data, 'Knowledge sharing');
    const { data: next } = updateEntries(data, [entry.id], { billable: true });
    expect(find(next, 'Knowledge sharing').reviewed).toBe(false);
  });
  it('does not record entries the action leaves unchanged', () => {
    const data = load();
    const entry = find(data, 'Investment documents');
    const { changes } = updateEntries(data, [entry.id], { billable: true });
    expect(changes).toEqual([]);
  });
  it('only touches the given ids', () => {
    const data = load();
    const entry = find(data, 'Draft term sheet');
    const { data: next } = updateEntries(data, [entry.id], { reviewed: true });
    const changed = next.entries.filter(
      (e, i) => JSON.stringify(e) !== JSON.stringify(data.entries[i]),
    );
    expect(changed.map((e) => e.id)).toEqual([entry.id]);
  });
});

describe('undo', () => {
  it('reverses the last action and keeps independent newer work', () => {
    const data = load();
    const a = find(data, 'Draft term sheet');
    const { data: afterAction, changes } = updateEntries(data, [a.id], {
      reviewed: true,
    });
    // An unrelated correction made after the review action.
    const other = find(afterAction, 'Closing checklist');
    const afterEdit = saveEntry(
      afterAction,
      { ...other, description: 'Closing checklist v2' },
      undefined,
      other,
    );
    const undone = undoEntries(afterEdit, { label: 'review', changes });
    expect(find(undone, 'Draft term sheet').reviewed).toBe(false);
    expect(find(undone, 'Closing checklist v2')).toBeTruthy();
  });
  it('declines instead of erasing newer work on an affected entry', () => {
    const data = load();
    const a = find(data, 'Shareholder agreement review');
    const { data: afterAction, changes } = updateEntries(data, [a.id], {
      clientId: 'foundation',
    });
    const moved = find(afterAction, 'Shareholder agreement review');
    const afterEdit = saveEntry(
      afterAction,
      { ...moved, minutes: 100 },
      undefined,
      moved,
    );
    expect(() => undoEntries(afterEdit, { label: 'move', changes })).toThrow(
      /Nothing was reverted/,
    );
  });
  it('restores the reviewed state removed by a correction', () => {
    const data = load();
    const a = find(data, 'Shareholder agreement review');
    const { data: next, changes } = updateEntries(data, [a.id], {
      clientId: 'foundation',
    });
    const undone = undoEntries(next, { label: 'move', changes });
    expect(find(undone, 'Shareholder agreement review')).toMatchObject({
      clientId: 'meridian',
      reviewed: true,
    });
  });
});

describe('review view', () => {
  it('narrows the pilot week to Meridian Holdings', () => {
    const data = load();
    const rows = selectReview(data.entries, data.clients, {
      week: '2026-09-28',
      clientId: 'meridian',
      employee: 'all',
      status: 'all',
      search: '',
    });
    expect(rows).toHaveLength(5);
    expect(rows.reduce((n, e) => n + e.minutes, 0)).toBe(390);
  });
});
