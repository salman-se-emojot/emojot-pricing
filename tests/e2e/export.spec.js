// E2E — Export bar (Copy Summary)
import { test, expect } from '@playwright/test';
import { activateModule } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
});

// ── Visibility ────────────────────────────────────────────────────────────────
test('export bar is hidden when no modules are active', async ({ page }) => {
  await expect(page.locator('#export-bar')).toBeHidden();
});

test('export bar appears once a module is activated', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#export-bar')).toBeVisible();
});

test('export bar has Copy Summary button', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#btn-copy-summary')).toBeVisible();
  await expect(page.locator('#btn-copy-summary')).toContainText('Copy Summary');
});

test('export bar does not have a Print button', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#btn-print-summary')).toHaveCount(0);
});

test('export bar hides again when all modules are deactivated', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#export-bar')).toBeVisible();
  await page.click('#mtoggle-xm');  // deactivate
  await page.waitForSelector('#card-xm', { state: 'detached' });
  await expect(page.locator('#export-bar')).toBeHidden();
});

// ── Copy button feedback ──────────────────────────────────────────────────────
test('Copy button changes text to "Copied!" immediately after click', async ({ page }) => {
  // Grant clipboard permissions so the write succeeds
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await activateModule(page, 'xm');

  const btn = page.locator('#btn-copy-summary');
  await btn.click();

  // Text should change to Copied! within a tick
  await expect(btn).toContainText('Copied!', { timeout: 1000 });
});

test('Copy button returns to original label after 2 seconds', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await activateModule(page, 'xm');
  await page.locator('#btn-copy-summary').click();
  // Wait for the 2s reset
  await expect(page.locator('#btn-copy-summary')).toContainText('Copy Summary', { timeout: 3500 });
});

test('Copy button is disabled while showing Copied!', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await activateModule(page, 'xm');
  await page.locator('#btn-copy-summary').click();
  await expect(page.locator('#btn-copy-summary')).toBeDisabled({ timeout: 500 });
});
