import { test, expect } from './fixtures/auth-bypass';

test.describe('Dashboard', () => {
  test('loads and shows dashboard cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=New Assessment')).toBeVisible();
    await expect(page.locator('text=Service Contract')).toBeVisible();
    await expect(page.locator('text=Resume Draft')).toBeVisible();
    await expect(page.locator('text=Admin / Settings')).toBeVisible();
  });

  test('navigates to assessment wizard', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');
    // Should show template picker
    await expect(page.locator('text=Choose a Template')).toBeVisible();
    await expect(page.getByRole('button', { name: /Blank Assessment/ })).toBeVisible();
  });

  test('navigates to service contract wizard', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Service Contract');
    await expect(page.locator('text=Service Agreement')).toBeVisible();
  });

  test('navigates to settings', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin / Settings');
    // Non-admin users see restricted view with Activity Log
    await expect(page.locator('text=Activity Log')).toBeVisible();
  });
});

test.describe('Assessment Wizard', () => {
  test('can start blank assessment and see form', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();

    // Should show Client Help List form with step indicator
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    await expect(page.getByLabel('Client Name')).toBeVisible();
  });

  test('shows validation error when clicking Continue without required fields', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();

    // Click Continue without filling required fields
    await page.click('button:has-text("Continue")');

    // Should show error for required client name
    await expect(page.locator('text=Client name is required')).toBeVisible();
  });

  test('can select a template', async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Assessment');

    // Click Standard Initial template
    await page.click('text=Standard Initial');

    // Should navigate to the form
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
  });
});

test.describe('Service Contract Wizard', () => {
  test('shows first step with form fields', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Service Contract');

    await expect(page.locator('text=Service Agreement')).toBeVisible();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
  });

  test('shows validation on Continue without filling fields', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Service Contract');

    await page.click('button:has-text("Continue")');

    // Should show validation error(s)
    await expect(page.locator('.text-red-500, .text-red-700').first()).toBeVisible();
  });
});

test.describe('Settings Screen', () => {
  test('can open and see configuration sections', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin / Settings');

    // With auth bypassed (no allowedEmails), user is treated as admin — all sections visible
    await expect(page.locator('text=Activity Log')).toBeVisible();
    await expect(page.locator('text=HIPAA Compliance')).toBeVisible();
  });

  test('can navigate home from settings', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Admin / Settings');
    await expect(page.locator('text=Activity Log')).toBeVisible();

    await page.click('button:has-text("Home")');
    await expect(page.locator('text=New Assessment')).toBeVisible();
  });
});
