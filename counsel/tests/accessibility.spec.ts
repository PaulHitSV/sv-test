import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('workspace and entry dialog have no WCAG A/AA violations', async ({
  page,
}) => {
  // Check the settled UI, not frames of entrance animations.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Load a sample workspace/ }).click();
  const dashboard = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    dashboard.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  const dialog = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    dialog.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
for (const colorScheme of ['light', 'dark'] as const) {
  test(`weekly review has no WCAG A/AA violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Manage data', exact: true })
      .click();
    await page.getByRole('button', { name: /Open pilot workspace/ }).click();
    await page.getByRole('button', { name: 'Replace and restore' }).click();
    await page.getByRole('button', { name: /^Weekly review/ }).click();
    await page
      .getByRole('checkbox', { name: 'Select Draft term sheet' })
      .check();
    const review = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      review.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}
