# Requirements index

Every ask in [ASSESSMENT.md](../ASSESSMENT.md), with where it is handled and how it is checked.
Status: ✅ done and tested · 🟡 done, manual check only · ⏭ deferred.

## Customer reports

| #   | Report                                                          | Root cause                                                             | Fix                                                                                                     | Evidence                                                             | Status |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| R1  | Alex: wording change on “Weekly team planning” made it billable | `EntryForm` always initialised `billable` to `true`, even when editing | Form starts from the entry’s own billability                                                            | `review.test.ts` “keeps a non-billable entry…”, e2e `review.spec.ts` | ✅     |
| R2a | Sofia: hours above the list ≠ sum of Meridian rows              | Review totals were computed from the whole week, not the filtered rows | Totals use the rows in view                                                                             | `review.test.ts` “narrows the pilot week…”, e2e                      | ✅     |
| R2b | Sofia: export of “my reviewed entries” contained other work     | Export used the whole week, ignoring filters                           | **Export view** exports exactly the rows in view; button shows the count                                | e2e reads the downloaded CSV                                         | ✅     |
| R3a | Sofia: client corrected via review actions but still “checked”  | Bulk patch never reset `reviewed`                                      | A meaningful change via any path returns the entry to review                                            | `review.test.ts` “returns a reviewed entry to review…”               | ✅     |
| R3b | Sofia: Undo reverted something else too                         | Undo restored a snapshot of the entire workspace                       | Undo reverses only the affected entries and declines, with an explanation, if any of them changed since | `review.test.ts` undo suite, e2e                                     | ✅     |

## Workflow: Friday review

| #   | Ask                                                 | Implementation                                                                                                                          | Status |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| W1  | Know what is ready for billing                      | Progress bar (reviewed / needs review) and “ready for billing” billable time                                                            | ✅     |
| W2  | Don’t lose track moving between clients and filters | Client chips with counts; a scope line that names the active filters; “Clear filters”                                                   | ✅     |
| W3  | Know which records the next action will touch       | Selection bar: “N selected · time · only these entries change”. Selection is cleared when filters or week change, with a visible notice | ✅     |

## Product expectations

| #   | Expectation                                                                                                                                                            | Where                                                                  | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| E1  | Editing one field preserves the others                                                                                                                                 | `EntryForm`, `saveEntry`                                               | ✅     |
| E2  | Totals and Export view match the active week and filters; selection doesn’t change export scope                                                                        | `ReviewPage`                                                           | ✅     |
| E3  | Reviewed = date, employee, client, duration, billability, description checked; a meaningful change via any path needs review again; an unchanged save keeps the status | `meaningfulChange` in `review.ts`                                      | ✅     |
| E4  | Undo reverses the last review action, keeps independent work, never silently erases newer work (declining is fine)                                                     | `undoEntries`                                                          | ✅     |
| E5  | Selection scope understandable when filters change                                                                                                                     | Cleared and explained                                                  | ✅     |
| E6  | Preserve entries, clients and backup compatibility                                                                                                                     | Data format unchanged (`version: 1`); existing backup tests still pass | ✅     |
| E7  | Internal non-billable work stays part of the review                                                                                                                    | Not filtered out anywhere                                              | ✅     |

## Optional requests

| #   | Request                                        | Status                                                                                                           |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| O1  | Dark theme (partner)                           | ✅ Theme toggle in the top bar. Follows the system setting until chosen; the choice is remembered on this device |
| O2  | Repeat yesterday’s entry (Alex)                | ✅ “Repeat yesterday” opens the form prefilled from your most recent entry on an earlier day, dated today        |
| O3  | Quicker way to see what needs checking (Sofia) | ✅ “Show what needs checking” and a count badge on Weekly review in the sidebar                                  |

## Deliverables

| #   | Deliverable                                | Status                                     |
| --- | ------------------------------------------ | ------------------------------------------ |
| D1  | Runnable repository with committed changes | Pending your commit/push                   |
| D2  | Verification (tests and/or manual checks)  | Unit and Playwright tests; see HANDOVER.md |
| D3  | `HANDOVER.md` ≤ ~300 words                 | ✅                                         |
