// E2E — Setup fee display and behaviour
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setBilling } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
});

// ── Per-module setup fee line ─────────────────────────────────────────────────
test('setup fee line appears inside XM module block', async ({ page }) => {
  await activateModule(page, 'xm');
  const summaryText = await page.locator('#summary-content').innerText();
  expect(summaryText).toContain('Setup fee (one-time)');
});

test('XM Basic setup fee is $120.00 (= $50 × 12 × 20%)', async ({ page }) => {
  await activateModule(page, 'xm');
  // The module block contains both "Module subtotal" and "Setup fee (one-time)"
  const block = await page.locator('.sum-module').first().innerText();
  expect(block).toContain('Setup fee (one-time)');
  expect(block).toContain('$120.00');
});

test('XM Standard setup fee is $600.00 (= $250 × 12 × 20%)', async ({ page }) => {
  await activateModule(page, 'xm');
  await setTier(page, 'xm', 'standard');
  const block = await page.locator('.sum-module').first().innerText();
  expect(block).toContain('$600.00');
});

test('SLT Basic setup fee is $312.00 (= $130 × 12 × 20%)', async ({ page }) => {
  await activateModule(page, 'slt');
  const block = await page.locator('.sum-module').first().innerText();
  expect(block).toContain('$312.00');
});

test('ORM Admin Basic setup fee is $120.00 (= $50 × 12 × 20%)', async ({ page }) => {
  await activateModule(page, 'orm');
  const block = await page.locator('.sum-module').first().innerText();
  expect(block).toContain('$120.00');
});

// ── Total setup fee block ─────────────────────────────────────────────────────
test('total setup fee block is visible when module is active', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('.sum-setup-total-block')).toBeVisible();
});

test('total setup fee shows correct amount for single module (XM Basic = $120)', async ({ page }) => {
  await activateModule(page, 'xm');
  const block = await page.locator('.sum-setup-total-block').innerText();
  expect(block).toContain('$120.00');
});

test('total setup fee rolls up correctly for two modules (XM $120 + SLT $312 = $432)', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  const block = await page.locator('.sum-setup-total-block').innerText();
  expect(block).toContain('$432.00');
});

test('"one-time" badge is visible in total setup fee block', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('.setup-fee-badge')).toBeVisible();
});

// ── Discount does NOT reduce setup fee (ADR 0003) ────────────────────────────
test('Pilot 25% discount does not change XM Basic setup fee ($120)', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);
  const block = await page.locator('.sum-setup-total-block').innerText();
  expect(block).toContain('$120.00');
});

test('billing surcharge does not change setup fee (monthly billing, XM still $120)', async ({ page }) => {
  await activateModule(page, 'xm');
  await setBilling(page, 'monthly');
  const block = await page.locator('.sum-setup-total-block').innerText();
  expect(block).toContain('$120.00');
});

// ── Hidden when contact-sales ─────────────────────────────────────────────────
test('setup fee block is hidden when contact-sales module is active', async ({ page }) => {
  // Navigate with ORM at extreme location count to trigger contact-sales
  await page.goto('about:blank');
  await page.goto('/#bil=a&mods=orm&orm_pkg=admin&orm_at=basic&orm_al=100000&orm_nt=basic&orm_nl=1&orm_cp=0&orm_clc=0&orm_tk=0&orm_us=2');
  await page.waitForSelector('#card-body-orm', { state: 'visible' });
  await expect(page.locator('.sum-setup-total-block')).toHaveCount(0);
});

test('per-module setup fee line is hidden when contact-sales', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto('/#bil=a&mods=orm&orm_pkg=admin&orm_at=basic&orm_al=100000&orm_nt=basic&orm_nl=1&orm_cp=0&orm_clc=0&orm_tk=0&orm_us=2');
  await page.waitForSelector('#card-body-orm', { state: 'visible' });
  const summaryText = await page.locator('#summary-content').innerText();
  expect(summaryText).not.toContain('Setup fee (one-time)');
});

// ── Copy Summary includes setup fees ─────────────────────────────────────────
test('Copy Summary text includes per-module setup fee', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await activateModule(page, 'xm');
  await page.click('#btn-copy-summary');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Setup fee (one-time)');
  expect(text).toContain('$120.00');
});

test('Copy Summary text includes total setup fee line', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await activateModule(page, 'xm');
  await page.click('#btn-copy-summary');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Total setup fee (one-time)');
});
