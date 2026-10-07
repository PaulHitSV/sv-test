# Release handover

**What changed?**
I fixed all three customer reports. Edits made entries billable because the form always started billable; it now starts from the entry's values and previews what will be saved. Review totals and Export view used the whole week; both now use exactly the rows in view. Any meaningful correction, from the form or bulk actions, now returns a reviewed entry to review; unchanged saves keep it reviewed. Undo restored a whole-workspace snapshot; it now reverts only its own entries, and declines with an explanation if any changed since. For the Friday review: week progress, client chips with counts, and a line naming active filters. A selection bar states what an action touches, and changing filters clears the selection with a notice. Also: dark theme, Repeat yesterday, "Show what needs checking", and a visual refresh.

**What did you check?**
35 unit tests (11 new) and 36 Playwright tests (desktop and mobile Chromium) pass. They reproduce each report, read the exported CSV, and run axe in both themes. The build passes, and I walked through the pilot week by hand. Store tests already failed on Node 26; fixed in the Vitest config.

**What did you defer?**
Undo covers only the last action and is lost on reload. Repeat copies one entry, not a day. Reports no longer follow the time page's search filters.

**What risks remain?**
Untested in Safari, Firefox, screen readers, and with large data sets. The custom dropdowns and calendar need a recent browser (they use the Popover API). The UI diff is large; the logic fixes are isolated and tested in `review.ts`.

**Would you release it?**
Yes, to the pilot. The data format and backups are unchanged. I'd ask Sofia to run one real Friday close first.

**How did you check AI-generated code?**
Claude Code wrote most changes. I checked each fix against the brief, with a test reproducing the reported scenario. For example, its first undo design still overwrote later edits to the same entry; it was changed to detect conflicts and decline, with a test.
