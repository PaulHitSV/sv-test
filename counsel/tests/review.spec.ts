import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openPilot(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function openReview(page: Page) {
  await page.getByRole('button', { name: /^Weekly review/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Weekly review' }),
  ).toBeVisible();
}
const chip = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name} \\d+$`) });

test('a wording correction keeps internal work non-billable (Alex)', async ({
  page,
}) => {
  await openPilot(page);
  await page
    .getByRole('button', { name: 'Edit Firm · Internal: Weekly team planning' })
    .click();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByLabel('Description').fill('Weekly team planning — internal');
  await expect(page.getByLabel('Changes on save')).toContainText('1 change');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const row = page.getByRole('row', {
    name: /Weekly team planning — internal/,
  });
  await expect(row.getByText('Non-billable', { exact: true })).toBeVisible();
});

test('totals and export follow the filtered view (Sofia)', async ({ page }) => {
  await openPilot(page);
  await openReview(page);
  await chip(page, 'Meridian Holdings').click();
  await expect(page.getByTestId('review-total')).toHaveText('6h 30m');
  await expect(page.getByTestId('review-billable')).toHaveText('6h');
  await page
    .getByRole('group', { name: 'Review status' })
    .getByRole('button', { name: 'Reviewed', exact: true })
    .click();
  await expect(page.getByTestId('review-total')).toHaveText('4h');
  // Selecting rows must not change what gets exported.
  await page
    .getByRole('checkbox', { name: 'Select Transaction due diligence' })
    .check();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export view (2)' }).click();
  const file = await readFile((await (await downloading).path())!, 'utf8');
  const rows = file.trim().split('\r\n').slice(1);
  expect(rows).toHaveLength(2);
  for (const row of rows) expect(row).toContain('"Meridian Holdings"');
  expect(file).toContain('Shareholder agreement review');
  expect(file).toContain('Transaction due diligence');
});

test('a client correction needs review again and undo restores it (Sofia)', async ({
  page,
}) => {
  await openPilot(page);
  await openReview(page);
  await page
    .getByRole('checkbox', { name: 'Select Shareholder agreement review' })
    .check();
  await expect(
    page.getByRole('region', { name: 'Selected entries' }),
  ).toContainText('1 selected · 1h 30m');
  await page.getByRole('combobox', { name: 'Destination client' }).click();
  await page.getByRole('option', { name: 'Meridian Foundation' }).click();
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const row = page.locator('[data-entry-id="entry-001"]');
  await expect(row).toContainText('Meridian Foundation');
  await expect(row.getByRole('button', { name: /^Review / })).toHaveText(
    /Needs review/,
  );
  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect(row).toContainText('Meridian Holdings');
  await expect(row.getByRole('button', { name: /^Reopen / })).toHaveText(
    /Reviewed/,
  );
});

test('undo keeps newer independent work and declines on conflicts', async ({
  page,
}) => {
  await openPilot(page);
  await openReview(page);
  // Review one entry, then correct a different one.
  await page.getByRole('button', { name: 'Review Draft term sheet' }).click();
  await page
    .getByRole('button', { name: 'Edit review entry: Closing checklist' })
    .click();
  await page.getByLabel('Description').fill('Closing checklist v2');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect(
    page.getByRole('button', { name: 'Review Draft term sheet' }),
  ).toBeVisible();
  await expect(page.getByText('Closing checklist v2')).toBeVisible();

  // Review an entry, then edit that same entry: undo must not erase the edit.
  await page
    .getByRole('button', { name: 'Review Lease amendment notes' })
    .click();
  await page
    .getByRole('button', { name: 'Edit review entry: Lease amendment notes' })
    .click();
  await page.getByLabel('Minutes', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect(page.getByRole('alert')).toContainText('Nothing was reverted');
  await expect(page.locator('[data-entry-id="entry-004"]')).toContainText(
    '1h 30m',
  );
});

test('changing filters clears the selection and says so', async ({ page }) => {
  await openPilot(page);
  await openReview(page);
  await page.getByRole('checkbox', { name: 'Select visible entries' }).check();
  await expect(
    page.getByRole('region', { name: 'Selected entries' }),
  ).toContainText('18 selected');
  await chip(page, 'Oak & Stone').click();
  await expect(
    page.getByRole('region', { name: 'Selected entries' }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Selection cleared because the view changed'),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Select Lease amendment notes' })
    .check();
  await page.getByRole('button', { name: 'Mark reviewed' }).click();
  await expect(page.getByText('Marked reviewed: 1 entry.')).toBeVisible();
  await chip(page, 'All clients').click();
  // Only the one Oak & Stone entry changed: 7 → 8 reviewed this week.
  await expect(page.getByLabel('Week progress')).toContainText('8 of 18');
});

test('dark theme toggle persists', async ({ page }) => {
  await page.goto('/');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dropdowns work by keyboard and Escape keeps the dialog open', async ({
  page,
}) => {
  await openPilot(page);
  await openReview(page);
  const people = page.getByRole('combobox', { name: 'Review employee' });
  await people.focus();
  await page.keyboard.press('ArrowDown');
  await expect(people).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(people).toHaveText('Alex Morgan');
  await expect(page.getByTestId('review-total')).toHaveText('9h 15m');

  await page.getByRole('button', { name: /^Time entries/ }).click();
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  const client = page.getByRole('dialog').getByRole('combobox');
  await client.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('icon buttons show app tooltips on hover', async ({ page }) => {
  await openPilot(page);
  await page.locator('.topbar').getByRole('button', { name: 'Help' }).hover();
  await expect(page.locator('.tooltip')).toHaveText('Help');
  await expect(page.locator('.tooltip')).toBeVisible();
});

test('the selection highlight slides to the chosen chip and status', async ({
  page,
}) => {
  await openPilot(page);
  await openReview(page);
  const settlesOn = async (group: string, option: RegExp | string) => {
    const container = page.getByRole('group', { name: group });
    const target = container.getByRole('button', { name: option });
    await target.click();
    await expect(async () => {
      const thumb = await container.locator('.slide-thumb').boundingBox();
      const box = await target.boundingBox();
      expect(Math.abs(thumb!.x - box!.x)).toBeLessThan(1);
      expect(Math.abs(thumb!.width - box!.width)).toBeLessThan(1);
    }).toPass();
  };
  await settlesOn('Client', /^Oak & Stone \d+$/);
  await settlesOn('Review status', 'Needs review');
  await settlesOn('Client', /^All clients \d+$/);
});

test('calendar picks a review week and an entry date', async ({ page }) => {
  await openPilot(page);
  await openReview(page);
  await page.getByRole('button', { name: /^Review week/ }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose a week' });
  await calendar
    .getByRole('button', { name: 'Wednesday, 23 September 2026' })
    .click();
  await expect(calendar).toBeHidden();
  await expect(
    page.getByRole('button', { name: /^Review week/ }),
  ).toContainText('21 Sept – 27 Sept 2026');
  await expect(page.getByLabel('Week progress')).toContainText('3 of 4');

  // Keyboard: open the entry date picker, move one day back, pick it.
  await page
    .getByRole('button', { name: 'Edit review entry: Weekend correspondence' })
    .click();
  const date = page.getByRole('dialog').getByRole('button', { name: /^Date/ });
  await expect(date).toContainText('Sun, 27 Sept 2026');
  await date.click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(date).toContainText('Sat, 26 Sept 2026');
  await expect(page.getByLabel('Changes on save')).toContainText('Date');
});

test('saving an unchanged entry keeps it reviewed, even with padded text', async ({
  page,
}) => {
  const backup = {
    version: 1,
    clients: [{ id: 'c1', name: 'Acme', color: '#416e83' }],
    entries: [
      {
        id: 'e1',
        date: '2026-09-29',
        minutes: 60,
        clientId: 'c1',
        billable: false,
        description: 'Planning ',
        employee: 'Alex Morgan',
        reviewed: true,
      },
    ],
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByLabel('Backup file').setInputFiles({
    name: 'padded.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await openReview(page);
  await page
    .getByRole('button', { name: 'Edit review entry: Planning' })
    .click();
  await expect(page.getByLabel('Changes on save')).toContainText('No changes');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('button', { name: 'Reopen Planning' }),
  ).toHaveText(/Reviewed/);
});
