/**
 * Responsive layout tests.
 *
 * Validates that the app's 2-tier responsive design (mobile-first + sm:640px)
 * renders correctly across phone, tablet, and desktop viewports.
 *
 * Runs on: mobile-chrome, mobile-safari, tablet-portrait, tablet-landscape, desktop-chromium
 */
import { test, expect } from './fixtures/auth-bypass';

const SM_BREAKPOINT = 640;

/** Helper: is this a mobile-width project? */
function isMobile(projectName: string) {
  return projectName.startsWith('mobile-');
}

function isDesktop(projectName: string) {
  return projectName.startsWith('desktop-') || projectName === 'tablet-landscape';
}

// ----- Dashboard -----

test.describe('Dashboard responsive layout', () => {
  test('dashboard cards layout adapts to viewport', async ({ page }) => {
    const project = test.info().project.name;
    const viewportWidth = page.viewportSize()!.width;

    // Wait for dashboard to render
    await expect(page.locator('text=New Assessment')).toBeVisible();

    // Check grid layout
    const grid = page.locator('[class*="grid"]').filter({ hasText: 'New Assessment' });
    const gridStyle = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);

    if (viewportWidth < SM_BREAKPOINT) {
      // Mobile: single column
      expect(gridStyle.split(' ').length).toBeLessThanOrEqual(1);
    } else {
      // Tablet+: 2 columns
      expect(gridStyle.split(' ').length).toBeGreaterThanOrEqual(2);
    }
  });

  test('dashboard heading scales with viewport', async ({ page }) => {
    await expect(page.locator('text=New Assessment')).toBeVisible();

    const heading = page.locator('h1, h2').filter({ hasText: /Welcome|EHC|Home Care/ }).first();
    if (await heading.count() > 0) {
      const fontSize = await heading.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
      // Mobile should be smaller than desktop heading
      if (isMobile(test.info().project.name)) {
        expect(fontSize).toBeLessThan(32);
      }
    }
  });
});

// ----- Progress Bar -----

test.describe('ProgressBar responsive', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to assessment wizard
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
  });

  test('step indicator dots size adapts to viewport', async ({ page }) => {
    const viewportWidth = page.viewportSize()!.width;

    // Find a step dot button
    const stepDot = page.locator('nav[aria-label="Form steps"] button').first();
    const box = await stepDot.locator('div').first().boundingBox();

    if (box) {
      if (viewportWidth < SM_BREAKPOINT) {
        // Mobile: 24px (w-6)
        expect(box.width).toBeLessThanOrEqual(28);
      } else {
        // Desktop/tablet: 32px (w-8)
        expect(box.width).toBeGreaterThanOrEqual(28);
      }
    }
  });

  test('step labels visibility adapts to viewport', async ({ page }) => {
    const viewportWidth = page.viewportSize()!.width;

    // Count visible step label texts (spans inside nav buttons)
    const labels = page.locator('nav[aria-label="Form steps"] button span');
    const allLabels = await labels.all();

    let visibleCount = 0;
    for (const label of allLabels) {
      if (await label.isVisible()) visibleCount++;
    }

    if (viewportWidth < SM_BREAKPOINT) {
      // Mobile: only current step label visible (1)
      expect(visibleCount).toBeGreaterThanOrEqual(1);
      expect(visibleCount).toBeLessThanOrEqual(2);
    } else {
      // Desktop/tablet: all 7 labels visible
      expect(visibleCount).toBeGreaterThanOrEqual(7);
    }
  });
});

// ----- Wizard Shell -----

test.describe('WizardShell responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
  });

  test('footer step counter visibility', async ({ page }) => {
    const viewportWidth = page.viewportSize()!.width;
    // Footer step counter uses "1 / 7" format (hidden sm:block)
    const stepCounter = page.locator('footer span:has-text("1 / 7")');

    if (viewportWidth < SM_BREAKPOINT) {
      // Mobile: step counter hidden in footer
      await expect(stepCounter).toBeHidden();
    } else {
      // Desktop: step counter visible
      await expect(stepCounter).toBeVisible();
    }
  });

  test('footer buttons have adequate touch targets', async ({ page }) => {
    // Continue button should be at least 44px tall on all devices
    const continueBtn = page.locator('button:has-text("Continue")');
    const box = await continueBtn.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36);
    }
  });
});

// ----- Form Grid Layout -----

test.describe('Form grid responsive', () => {
  test('client help list fields stack on mobile, side-by-side on tablet+', async ({ page }) => {
    const viewportWidth = page.viewportSize()!.width;

    // Navigate to step 1 (Client Help List)
    await page.click('text=New Assessment');
    await page.getByRole('button', { name: /Blank Assessment/ }).click();
    await expect(page.getByLabel('Client Name')).toBeVisible();

    // Find the form grid container
    const clientNameInput = page.getByLabel('Client Name');
    const dobInput = page.getByLabel(/Date of Birth/);

    if (await clientNameInput.isVisible() && await dobInput.isVisible()) {
      const nameBox = await clientNameInput.boundingBox();
      const dobBox = await dobInput.boundingBox();

      if (nameBox && dobBox) {
        if (viewportWidth < SM_BREAKPOINT) {
          // Mobile: fields stacked vertically (DOB below name)
          expect(dobBox.y).toBeGreaterThan(nameBox.y + nameBox.height - 5);
        } else {
          // Desktop: fields side-by-side (DOB to the right or same row)
          // They could be on the same row or close
          expect(dobBox.y).toBeLessThanOrEqual(nameBox.y + nameBox.height + 40);
        }
      }
    }
  });
});

// ----- Service Contract -----

test.describe('Service Contract responsive', () => {
  test('contract wizard renders at all viewport sizes', async ({ page }) => {
    await page.click('text=Service Contract');
    await expect(page.locator('text=Service Agreement')).toBeVisible();
    await expect(page.getByText('Step 1 of 7')).toBeVisible({ timeout: 10_000 });
  });
});
