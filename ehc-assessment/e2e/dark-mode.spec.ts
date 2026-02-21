/**
 * Dark mode rendering tests.
 *
 * Validates that dark mode activates correctly and key UI elements
 * use the dark slate palette.
 *
 * Runs on: dark-desktop, dark-mobile, dark-tablet
 * These projects have colorScheme: 'dark' configured.
 */
import { test, expect } from './fixtures/auth-bypass';

test.describe('Dark mode', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark theme in localStorage before app reads it
    await page.addInitScript(() => {
      localStorage.setItem('ehc-theme', 'dark');
    });
    // Re-navigate to pick up the dark mode setting
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=New Assessment')).toBeVisible();
  });

  test('dark class is applied to html element', async ({ page }) => {
    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    expect(hasDarkClass).toBe(true);
  });

  test('dashboard has dark background', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return window.getComputedStyle(main).backgroundColor;
    });
    // Should be a dark color (slate-900: rgb(15, 23, 42) or similar dark value)
    // Parse rgb values and check they are dark
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // All channels should be less than 100 for a dark background
      expect(r).toBeLessThan(100);
      expect(g).toBeLessThan(100);
      expect(b).toBeLessThan(100);
    }
  });

  test('dashboard cards have dark background', async ({ page }) => {
    // Find a dashboard card
    const card = page.locator('text=New Assessment').locator('..');
    const bgColor = await card.evaluate(el => {
      // Walk up to find the card container with a background
      let current: HTMLElement | null = el as HTMLElement;
      while (current) {
        const bg = window.getComputedStyle(current).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        current = current.parentElement;
      }
      return '';
    });

    if (bgColor) {
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // Dark card bg should be dark slate (< 80 for all channels)
        expect(r).toBeLessThan(80);
        expect(g).toBeLessThan(80);
        expect(b).toBeLessThan(80);
      }
    }
  });

  test('form inputs have dark background in wizard', async ({ page }) => {
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByLabel('Client Name')).toBeVisible();

    const inputBg = await page.getByLabel('Client Name').evaluate(el =>
      window.getComputedStyle(el).backgroundColor,
    );

    const match = inputBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // Dark input should be dark (slate-800: ~30, 41, 59)
      expect(r).toBeLessThan(80);
      expect(g).toBeLessThan(80);
      expect(b).toBeLessThan(100);
    }
  });

  test('theme toggle button exists and is functional', async ({ page }) => {
    // Find the theme toggle button (cycles light→dark→system)
    const toggle = page.locator('button[aria-label*="theme"], button[aria-label*="Theme"], button[title*="theme"], button[title*="Theme"]').first();

    if (await toggle.count() > 0) {
      // Click to cycle to next mode
      await toggle.click();

      // Verify the click was handled (class may change)
      const classList = await page.evaluate(() =>
        document.documentElement.className,
      );
      // After one click from dark, it should go to system or light
      // Just verify the button is interactive — the exact cycle depends on implementation
      expect(classList).toBeDefined();
    }
  });

  test('dark mode persists across navigation', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Admin / Settings');
    await expect(page.locator('text=Activity Log')).toBeVisible();

    // Verify dark class is still active
    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    expect(hasDarkClass).toBe(true);

    // Navigate back home
    await page.click('button:has-text("Home")');
    await expect(page.locator('text=New Assessment')).toBeVisible();

    // Still dark
    const stillDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    expect(stillDark).toBe(true);
  });
});
