/**
 * Automated WCAG 2.1 AA accessibility tests using axe-core.
 *
 * Scans each major page/view for accessibility violations.
 * Runs in CI via Playwright to catch regressions on every commit.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/auth-bypass';

/** Helper: run axe scan and assert zero violations */
async function expectNoViolations(page: import('@playwright/test').Page, disableRules: string[] = []) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

  if (disableRules.length > 0) {
    builder.disableRules(disableRules);
  }

  const results = await builder.analyze();

  // Pretty-print violations for debugging
  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => {
      const nodes = v.nodes.map((n) => `    - ${n.html.slice(0, 120)}`).join('\n');
      return `[${v.impact}] ${v.id}: ${v.description}\n${nodes}`;
    });
    console.log(`Accessibility violations:\n${summary.join('\n\n')}`);
  }

  expect(results.violations).toEqual([]);
}

test.describe('Accessibility: Dashboard', () => {
  test('dashboard has no WCAG AA violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=New Assessment')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('Accessibility: Assessment Wizard', () => {
  test('Step 1 (Client Help List) has no violations', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    await expectNoViolations(page);
  });

  test('Step 1 with validation errors has no violations', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Client name is required')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('Accessibility: Service Contract Wizard', () => {
  test('Step 1 (Service Agreement) has no violations', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Service Contract');
    await expect(page.locator('text=Service Agreement')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('Accessibility: Settings', () => {
  test('Settings screen has no violations', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin / Settings');
    await expect(page.locator('text=Google Sheets Connection')).toBeVisible();
    await expectNoViolations(page);
  });
});
