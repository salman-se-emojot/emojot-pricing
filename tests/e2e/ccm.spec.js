// E2E — CCM (Customer Complaints Management) module
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setNumber, toggleSwitch, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'ccm');
});

// ── Initial state ────────────────────────────────────────────────────
test('CCM card renders with Basic tier selected', async ({ page }) => {
  await expect(page.locator('[data-module="ccm"][data-tier="basic"]')).toHaveClass(/active/);
});

test('CCM initial total is $80 (Basic base)', async ({ page }) => {
  const total = await getTotalAmount(page);
  expect(total).toBe(80);
});

test('CCM shows workflow field (unique to CCM)', async ({ page }) => {
  await expect(page.locator('#ccm-workflows')).toBeVisible();
});

// ── Tier selection ───────────────────────────────────────────────────
test('switching to CCM Standard gives $300 base', async ({ page }) => {
  await setTier(page, 'ccm', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBe(300);
});

test('switching to CCM Enterprise gives $1000 base', async ({ page }) => {
  await setTier(page, 'ccm', 'enterprise');
  const total = await getTotalAmount(page);
  expect(total).toBe(1000);
});

// ── Touchpoints ──────────────────────────────────────────────────────
test('excess touchpoints charge all-nodes × rate (Basic: 30 × $10 = $300)', async ({ page }) => {
  await setNumber(page, 'ccm-tp', 30);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(380, 0);            // $80 + $300
});

test('Enterprise excess touchpoints: excess-only pricing', async ({ page }) => {
  await setTier(page, 'ccm', 'enterprise');
  await setNumber(page, 'ccm-tp', 150);         // 50 excess × $2.00 = $100
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(1100, 0);
});

// ── Workflows ────────────────────────────────────────────────────────
test('excess workflows at $30/workflow', async ({ page }) => {
  await setNumber(page, 'ccm-workflows', 4);    // 3 excess × $30 = $90
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(170, 0);            // $80 + $90
});

// ── Brand ────────────────────────────────────────────────────────────
test('brand add-on shows count field when toggled on', async ({ page }) => {
  await expect(page.locator('#ccm-brand-count-wrap')).toBeHidden();
  await toggleSwitch(page, 'ccm-brand');
  await expect(page.locator('#ccm-brand-count-wrap')).toBeVisible();
});

test('brand charges $10/brand', async ({ page }) => {
  await toggleSwitch(page, 'ccm-brand');
  await setNumber(page, 'ccm-brand-count', 2);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(100, 0);            // $80 + 2×$10
});

// ── Emosight ─────────────────────────────────────────────────────────
test('emosight add-on charges $30 on Basic CCM', async ({ page }) => {
  await toggleSwitch(page, 'ccm-emosight');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(110, 0);            // $80 + $30
});

// ── SMS Domain ───────────────────────────────────────────────────────
test('SMS domain whitelisting adds $30', async ({ page }) => {
  await toggleSwitch(page, 'ccm-domain');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(110, 0);            // $80 + $30
});

// ── Users ────────────────────────────────────────────────────────────
test('user overage at $2/user', async ({ page }) => {
  await setNumber(page, 'ccm-users', 8);        // 3 excess × $2 = $6
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(86, 0);
});

// ── Summary ──────────────────────────────────────────────────────────
test('summary shows CCM module section', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('CCM — Complaints Management');
});
