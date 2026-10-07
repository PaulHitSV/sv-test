# Release handover

Requirement-by-requirement index: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Changed

- **Alex:** the edit form always started billable. It now starts from the entry’s values and previews “What will be saved”.
- **Sofia’s numbers:** review totals and **Export view** used the whole week. Both now use exactly the rows in view.
- **Re-review:** any meaningful change (form or bulk action) returns a reviewed entry to review. Unchanged saves, including whitespace-only edits, keep the status ([`review.ts`](src/review.ts)).
- **Undo:** it restored a whole-workspace snapshot. It now reverts only the affected entries, and declines with an explanation if any of them changed since.
- **Workflow:** week progress and “ready for billing”; client chips with counts; a scope line naming the filters. A selection bar states what the next action touches, and filter changes clear the selection, with a notice.
- **Optional:** dark theme, “Repeat yesterday”, “Show what needs checking”. New visual design, with app-styled dropdowns, calendar and tooltips.

## Verified

- `npm run check`: 35 unit tests pass (11 new), and the build succeeds.
- `npm run test:e2e`: 36 pass, desktop and mobile Chromium. [`review.spec.ts`](tests/review.spec.ts) reproduces each report, inspects the exported CSV, and covers keyboard use. Axe covers the review page in both themes.
- Store tests failed on Node 26 before any change (Node’s `localStorage` shadows jsdom’s). Fixed in `vite.config.ts`.
- Not tested: Safari or Firefox, screen readers, large data sets.

## Remaining

- Undo covers only the last review action and doesn’t survive a reload.
- “Repeat yesterday” copies one entry. Reports no longer apply the time page’s search filters.
- The UI diff is large; logic changes are isolated in `review.ts`.

## Release recommendation

Release to the pilot. The reported problems are fixed and tested, and the data format and backups are unchanged. Ask Sofia to run one real Friday close.

## AI use

Claude Code wrote the changes. Its first undo idea, a per-entry revert, would still overwrite a later edit. It was changed to detect conflicts and decline, and a test covers that case.
