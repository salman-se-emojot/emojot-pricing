// E2E — ORM (Online Reputation Management) module
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setNumber, toggleSwitch, setRadio, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'orm');
});

// ── Initial state ────────────────────────────────────────────────────
test('ORM defaults to Admin Connect package type', async ({ page }) => {
  await expect(page.locator('[data-radio="orm-package"][data-value="admin"]')).toHaveClass(/active/);
});

test('ORM initial total is $50 (Admin Basic base)', async ({ page }) => {
  const total = await getTotalAmount(page);
  expect(total).toBe(50);
});

test('Admin Connect section is visible by default', async ({ page }) => {
  await expect(page.locator('#orm-admin-loc')).toBeVisible();
});

test('Non-Admin Connect section is hidden by default', async ({ page }) => {
  await expect(page.locator('#orm-non-loc')).not.toBeAttached();
});

test('package type radio has three options: Admin, Non-Admin, Both', async ({ page }) => {
  await expect(page.locator('[data-radio="orm-package"][data-value="admin"]')).toBeVisible();
  await expect(page.locator('[data-radio="orm-package"][data-value="nonAdmin"]')).toBeVisible();
  await expect(page.locator('[data-radio="orm-package"][data-value="both"]')).toBeVisible();
});

// ── Package type switching ───────────────────────────────────────────
test('switching to Non-Admin Connect hides admin section and shows non-admin', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  await expect(page.locator('#orm-admin-loc')).not.toBeAttached();
  await expect(page.locator('#orm-non-loc')).toBeVisible();
});

test('switching to Non-Admin: base price updates to $150', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  const total = await getTotalAmount(page);
  expect(total).toBe(150);
});

test('switching to Both shows both admin and non-admin sections', async ({ page }) => {
  await setRadio(page, 'orm-package', 'both');
  await expect(page.locator('#orm-admin-loc')).toBeVisible();
  await expect(page.locator('#orm-non-loc')).toBeVisible();
});

test('Both package: total is sum of both bases ($50 + $150 = $200)', async ({ page }) => {
  await setRadio(page, 'orm-package', 'both');
  const total = await getTotalAmount(page);
  expect(total).toBe(200);
});

// ── Admin Connect tiers ──────────────────────────────────────────────
test('Admin Standard tier: base $250', async ({ page }) => {
  await setTier(page, 'orm-admin', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBe(250);
});

test('Admin Enterprise tier: base $500', async ({ page }) => {
  await setTier(page, 'orm-admin', 'enterprise');
  const total = await getTotalAmount(page);
  expect(total).toBe(500);
});

// ── Admin Connect — excess locations ────────────────────────────────
test('Admin Basic: 10 locations (5 excess × $10 = $50) → total $100', async ({ page }) => {
  await setNumber(page, 'orm-admin-loc', 10);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(100, 0);
});

// ── Non-Admin tiers ──────────────────────────────────────────────────
test('Non-Admin Standard tier: base $350', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  await setTier(page, 'orm-non', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBe(350);
});

test('Non-Admin Enterprise tier: base $1250', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  await setTier(page, 'orm-non', 'enterprise');
  const total = await getTotalAmount(page);
  expect(total).toBe(1250);
});

// ── Non-Admin Connect — excess locations ─────────────────────────────
test('Non-Admin Basic: 3 locations (2 excess × $116.67 = $233.34) → ~$383', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  await setNumber(page, 'orm-non-loc', 3);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(383.34, 0);
});

// ── Add-ons — Competitor Analysis ────────────────────────────────────
test('Competitor toggle is disabled (N/A) on Admin Basic', async ({ page }) => {
  // Admin Basic has competitor: 'unavailable'
  await expect(page.locator('#orm-competitor')).toBeDisabled();
});

test('Competitor toggle enabled on Admin Standard (addon)', async ({ page }) => {
  await setTier(page, 'orm-admin', 'standard');
  await expect(page.locator('#orm-competitor')).not.toBeDisabled();
});

test('Admin Standard: competitor channels shown after enabling competitor', async ({ page }) => {
  await setTier(page, 'orm-admin', 'standard');
  await expect(page.locator('#orm-comp-channels-wrap')).toBeHidden();
  await toggleSwitch(page, 'orm-competitor');
  await expect(page.locator('#orm-comp-channels-wrap')).toBeVisible();
});

test('Competitor analysis charges $25/location-channel', async ({ page }) => {
  await setTier(page, 'orm-admin', 'standard');  // $250 base
  await toggleSwitch(page, 'orm-competitor');
  await setNumber(page, 'orm-comp-channels', 3); // 3 × $25 = $75
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(325, 0);             // $250 + $75
});

test('Competitor is included in Admin Enterprise (toggle disabled, channels field visible)', async ({ page }) => {
  await setTier(page, 'orm-admin', 'enterprise');
  await expect(page.locator('#orm-competitor')).toBeDisabled();
  await expect(page.locator('#orm-comp-channels-wrap')).toBeVisible();
});

// ── Add-ons — Ticket Management ──────────────────────────────────────
test('Ticket toggle is enabled (addon) on Admin Basic', async ({ page }) => {
  await expect(page.locator('#orm-ticket')).not.toBeDisabled();
});

test('Ticket management adds $50 on Admin Basic', async ({ page }) => {
  await toggleSwitch(page, 'orm-ticket');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(100, 0);             // $50 + $50
});

test('Ticket is included in Admin Standard (toggle disabled)', async ({ page }) => {
  await setTier(page, 'orm-admin', 'standard');
  await expect(page.locator('#orm-ticket')).toBeDisabled();
});

// ── Add-ons — Users ──────────────────────────────────────────────────
test('user overage at $2/user (Admin Basic: 2 included)', async ({ page }) => {
  await setNumber(page, 'orm-users', 5);         // 3 excess × $2 = $6
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(56, 0);
});

// ── Summary ──────────────────────────────────────────────────────────
test('summary shows ORM module section', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('ORM — Online Reputation');
});

test('ORM shows correct tier label in package entitlements', async ({ page }) => {
  await expect(page.locator('.sum-included-users')).toContainText('Admin Connect');
});

test('switching to Non-Admin updates entitlements label', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  await expect(page.locator('.sum-included-users')).toContainText('Non-Admin Connect');
});

// ── Add-ons visible for Non-Admin package ────────────────────────────
test('add-ons section is visible when using Non-Admin package', async ({ page }) => {
  await setRadio(page, 'orm-package', 'nonAdmin');
  // Verify add-ons section is rendered (check the visible user field label and the addons wrapper)
  await expect(page.locator('.addons-section')).toBeVisible();
  await expect(page.locator('#orm-users')).toBeAttached();  // field present in DOM
  await expect(page.locator('#orm-ticket')).toBeAttached(); // toggle present in DOM
});
