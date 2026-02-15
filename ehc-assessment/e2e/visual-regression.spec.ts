/**
 * Visual regression screenshot tests.
 *
 * Captures full-page screenshots at key screens for manual review.
 * Screenshots are saved to test-results/screenshots/ with project-specific names.
 *
 * Runs on: all responsive + dark mode projects.
 */
import { test, expect } from './fixtures/auth-bypass';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOT_DIR = join(__dirname, '..', 'test-results', 'screenshots');

test.beforeAll(() => {
  // Ensure screenshot directory exists
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

function screenshotPath(screen: string, project: string): string {
  return join(SCREENSHOT_DIR, `${screen}-${project}.png`);
}

test.describe('Visual regression screenshots', () => {
  test.describe.configure({ mode: 'parallel' });

  test('dashboard', async ({ page }) => {
    const project = test.info().project.name;

    // Set dark mode for dark projects
    if (project.startsWith('dark-')) {
      await page.addInitScript(() => localStorage.setItem('ehc-theme', 'dark'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    await expect(page.locator('text=New Assessment')).toBeVisible();

    // Wait for any animations to settle
    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath('dashboard', project),
      fullPage: true,
    });
  });

  test('assessment step 1 - client help list', async ({ page }) => {
    const project = test.info().project.name;

    if (project.startsWith('dark-')) {
      await page.addInitScript(() => localStorage.setItem('ehc-theme', 'dark'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByLabel('Client Name')).toBeVisible();

    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath('assessment-step1', project),
      fullPage: true,
    });
  });

  test('assessment step 3 - client assessment categories', async ({ page }) => {
    const project = test.info().project.name;

    if (project.startsWith('dark-')) {
      await page.addInitScript(() => localStorage.setItem('ehc-theme', 'dark'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to step 3 via template (skips validation on step 1-2)
    await page.click('text=New Assessment');
    await page.click('text=Standard Initial');

    // Fill required fields on step 1 to advance
    await page.getByLabel('Client Name').fill('Test Client');
    await page.getByLabel(/Date of Birth/).fill('1950-01-01');
    // Use force click since fixed footer may overlap on mobile viewports
    await page.locator('button:has-text("Continue")').click({ force: true });

    // Step 2 — fill minimum and continue
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Continue")').click({ force: true });

    // Step 3 — Assessment categories with ToggleCards
    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath('assessment-step3', project),
      fullPage: true,
    });
  });

  test('service contract step 1', async ({ page }) => {
    const project = test.info().project.name;

    if (project.startsWith('dark-')) {
      await page.addInitScript(() => localStorage.setItem('ehc-theme', 'dark'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=Service Contract');
    await expect(page.locator('text=Service Agreement')).toBeVisible();

    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath('contract-step1', project),
      fullPage: true,
    });
  });

  test('settings screen', async ({ page }) => {
    const project = test.info().project.name;

    if (project.startsWith('dark-')) {
      await page.addInitScript(() => localStorage.setItem('ehc-theme', 'dark'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    await page.click('text=Admin / Settings');
    await expect(page.locator('text=Google Sheets Connection')).toBeVisible();

    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath('settings', project),
      fullPage: true,
    });
  });
});
