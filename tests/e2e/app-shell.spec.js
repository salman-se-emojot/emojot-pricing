// E2E — App shell, billing cycle, module toggle UI
import { test, expect } from '@playwright/test';
import { activateModule, deactivateModule, setBilling, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid', { state: 'visible' });
});

// ── Page load ────────────────────────────────────────────────────────
test('page title is visible', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Emojot pricing calculator');
});

test('summary starts empty with placeholder text', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('Select one or more modules');
});

test('all three module toggles are rendered', async ({ page }) => {
  for (const id of ['xm', 'orm', 'slt']) {
    await expect(page.locator(`#mtoggle-${id}`)).toBeVisible();
  }
});

test('billing selector shows all three cycle options', async ({ page }) => {
  for (const cycle of ['annual', 'quarterly', 'monthly']) {
    await expect(page.locator(`[data-cycle="${cycle}"]`)).toBeVisible();
  }
});

test('annual billing is selected by default', async ({ page }) => {
  await expect(page.locator('[data-cycle="annual"]')).toHaveClass(/active/);
});

test('admin config link is present', async ({ page }) => {
  await expect(page.locator('.header-link')).toHaveAttribute('href', 'admin.html');
});

// ── Module toggle ────────────────────────────────────────────────────
test('activating XM shows its card', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#card-xm')).toBeVisible();
  await expect(page.locator('#card-body-xm')).toBeVisible();
});

test('deactivating XM removes its card', async ({ page }) => {
  await activateModule(page, 'xm');
  await deactivateModule(page, 'xm');
  await expect(page.locator('#card-xm')).not.toBeAttached();
});

test('activating a module marks its toggle button active', async ({ page }) => {
  await activateModule(page, 'orm');
  await expect(page.locator('#mtoggle-orm')).toHaveClass(/active/);
});

test('deactivating a module removes active class from toggle', async ({ page }) => {
  await activateModule(page, 'orm');
  await deactivateModule(page, 'orm');
  await expect(page.locator('#mtoggle-orm')).not.toHaveClass(/active/);
});

test('module cards appear in registry order (XM before SLT)', async ({ page }) => {
  await activateModule(page, 'slt');
  await activateModule(page, 'xm');
  const cards = await page.locator('#module-cards .module-card').all();
  const ids = await Promise.all(cards.map(c => c.getAttribute('id')));
  expect(ids.indexOf('card-xm')).toBeLessThan(ids.indexOf('card-slt'));
});

// ── Card collapse ────────────────────────────────────────────────────
test('clicking card header collapses the module card', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.click('[data-collapse="xm"]');
  await expect(page.locator('#card-body-xm')).toHaveClass(/hidden/);
});

test('chevron rotates when card collapses', async ({ page }) => {
  await activateModule(page, 'xm');
  const chev = page.locator('#chev-xm');
  // Before collapse: open class present
  await expect(chev).toHaveClass(/open/);
  await page.click('[data-collapse="xm"]');
  // After collapse: open class removed
  await expect(chev).not.toHaveClass(/open/);
});

// ── Billing cycle ────────────────────────────────────────────────────
test('switching to quarterly marks it active and demarks annual', async ({ page }) => {
  await setBilling(page, 'quarterly');
  await expect(page.locator('[data-cycle="quarterly"]')).toHaveClass(/active/);
  await expect(page.locator('[data-cycle="annual"]')).not.toHaveClass(/active/);
});

test('billing surcharge appears in summary when quarterly is selected', async ({ page }) => {
  await activateModule(page, 'xm');
  await setBilling(page, 'quarterly');
  await expect(page.locator('#summary-content')).toContainText('+7.5%');
});

test('quarterly billing raises total by 7.5% vs annual', async ({ page }) => {
  await activateModule(page, 'xm');  // Basic tier, $50/mo base
  const annualTotal = await getTotalAmount(page);

  await setBilling(page, 'quarterly');
  const quarterlyTotal = await getTotalAmount(page);

  expect(quarterlyTotal).toBeCloseTo(annualTotal * 1.075, 2);
});

test('monthly billing raises total by 10% vs annual', async ({ page }) => {
  await activateModule(page, 'xm');
  const annualTotal = await getTotalAmount(page);

  await setBilling(page, 'monthly');
  const monthlyTotal = await getTotalAmount(page);

  expect(monthlyTotal).toBeCloseTo(annualTotal * 1.1, 2);
});

// ── UXI badge ────────────────────────────────────────────────────────
test('UXI badge appears when two or more modules are active', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#uxi-header-badge .uxi-badge')).not.toBeVisible();
  await activateModule(page, 'slt');
  await expect(page.locator('#uxi-header-badge .uxi-badge')).toBeVisible();
});

test('summary title says "UXI Pricing Summary" with two modules', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  await expect(page.locator('#summary-title')).toContainText('UXI Pricing Summary');
});

// ── Summary entitlements block ───────────────────────────────────────
test('package entitlements block shows included users when module is active', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('.sum-included-users')).toBeVisible();
  await expect(page.locator('.sum-included-users')).toContainText('users included');
});
