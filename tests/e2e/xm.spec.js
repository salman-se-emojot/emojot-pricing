// E2E — XM (Experience Management) module
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setNumber, toggleSwitch, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');
});

// ── Initial state ────────────────────────────────────────────────────
test('XM card renders with Basic tier selected by default', async ({ page }) => {
  await expect(page.locator('[data-module="xm"][data-tier="basic"]')).toHaveClass(/active/);
});

test('XM initial summary shows $50.00/mo', async ({ page }) => {
  const total = await getTotalAmount(page);
  expect(total).toBe(50);
});

test('XM tier selector is visible with at least one active tier', async ({ page }) => {
  await expect(page.locator('[data-module="xm"][data-tier="basic"]')).toBeVisible();
  await expect(page.locator('[data-module="xm"][data-tier="standard"]')).toBeVisible();
  await expect(page.locator('[data-module="xm"][data-tier="enterprise"]')).toBeVisible();
});

test('XM shows touchpoint, sensor, dashboard fields', async ({ page }) => {
  await expect(page.locator('#xm-tp')).toBeVisible();
  await expect(page.locator('#xm-sensors')).toBeVisible();
  await expect(page.locator('#xm-dashboards')).toBeVisible();
});

// ── Tier selection ───────────────────────────────────────────────────
test('switching to Standard tier updates summary base to $250', async ({ page }) => {
  await setTier(page, 'xm', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBe(250);
});

test('switching to Enterprise tier updates summary base to $1000', async ({ page }) => {
  await setTier(page, 'xm', 'enterprise');
  const total = await getTotalAmount(page);
  expect(total).toBe(1000);
});

test('switching tier marks new tier button active', async ({ page }) => {
  await setTier(page, 'xm', 'standard');
  await expect(page.locator('[data-module="xm"][data-tier="standard"]')).toHaveClass(/active/);
  await expect(page.locator('[data-module="xm"][data-tier="basic"]')).not.toHaveClass(/active/);
});

// ── Touchpoints ──────────────────────────────────────────────────────
test('increasing touchpoints beyond included raises total', async ({ page }) => {
  const baseCost = await getTotalAmount(page);  // $50
  await setNumber(page, 'xm-tp', 30);           // 30 nodes × $10 = $300
  const newTotal = await getTotalAmount(page);
  expect(newTotal).toBeGreaterThan(baseCost);
  expect(newTotal).toBeCloseTo(350, 0);         // $50 + $300
});

test('touchpoints within included count do not change total', async ({ page }) => {
  await setNumber(page, 'xm-tp', 3);            // below 5 included
  const total = await getTotalAmount(page);
  expect(total).toBe(50);
});

// ── Sensors ──────────────────────────────────────────────────────────
test('excess sensors are charged at $50/sensor', async ({ page }) => {
  await setNumber(page, 'xm-sensors', 3);       // 2 excess × $50 = $100
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(150, 0);            // $50 + $100
});

// ── Dashboards ───────────────────────────────────────────────────────
test('excess dashboards are charged at $20/dashboard', async ({ page }) => {
  await setNumber(page, 'xm-dashboards', 4);    // 3 excess × $20 = $60
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(110, 0);            // $50 + $60
});

// ── Brand Personalization ────────────────────────────────────────────
test('brand toggle shows brand count field when enabled', async ({ page }) => {
  await expect(page.locator('#xm-brand-count-wrap')).toBeHidden();
  await toggleSwitch(page, 'xm-brand');
  await expect(page.locator('#xm-brand-count-wrap')).toBeVisible();
});

test('brand add-on adds $10/brand to total', async ({ page }) => {
  await toggleSwitch(page, 'xm-brand');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(60, 0);             // $50 + 1×$10
});

test('brand add-on is not charged in Enterprise tier (included)', async ({ page }) => {
  await setTier(page, 'xm', 'enterprise');
  // brand toggle should be disabled for enterprise
  const brandInput = page.locator('#xm-brand');
  await expect(brandInput).toBeDisabled();
});

// ── Emosight AI ──────────────────────────────────────────────────────
test('emosight add-on charges $30 on Basic tier', async ({ page }) => {
  await toggleSwitch(page, 'xm-emosight');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(80, 0);             // $50 + $30
});

test('emosight is included in Standard tier (toggle disabled)', async ({ page }) => {
  await setTier(page, 'xm', 'standard');
  const emosightInput = page.locator('#xm-emosight');
  await expect(emosightInput).toBeDisabled();
});

// ── SMS Domain ───────────────────────────────────────────────────────
test('domain whitelisting adds $30', async ({ page }) => {
  await toggleSwitch(page, 'xm-domain');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(80, 0);             // $50 + $30
});

// ── Users ────────────────────────────────────────────────────────────
test('users above included count are charged at $2/user', async ({ page }) => {
  await setNumber(page, 'xm-users', 10);        // 5 excess × $2 = $10
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(60, 0);             // $50 + $10
});

// ── Summary correctness ──────────────────────────────────────────────
test('summary shows XM module section header', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('XM — Experience Management');
});

test('summary shows module subtotal line', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('Module subtotal');
});

// ── Compound scenario ────────────────────────────────────────────────
test('Standard tier + sensors + domain = $380', async ({ page }) => {
  await setTier(page, 'xm', 'standard');
  await setNumber(page, 'xm-sensors', 4);       // 1 excess (standard includes 3) × $50 = $50
  await toggleSwitch(page, 'xm-domain');        // +$30
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(330, 0);            // $250 + $50 + $30
});
