// E2E — Discount name input (free-text lookup against presets)
import { test, expect } from '@playwright/test';
import { activateModule, getTotalAmount, setBilling } from './helpers.js';

const BASE_URL = '/';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('#module-selector-grid');
});

// ── Input visibility ──────────────────────────────────────────────────────────

test('discount input is absent when no modules are active', async ({ page }) => {
  await expect(page.locator('#discount-input')).toHaveCount(0);
});

test('discount input appears once a module is activated', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#discount-input')).toBeVisible();
});

test('discount input defaults to empty', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('#discount-input')).toHaveValue('');
});

test('discount input shows "Enter code" placeholder', async ({ page }) => {
  await activateModule(page, 'xm');
  const placeholder = await page.locator('#discount-input').getAttribute('placeholder');
  expect(placeholder).toBe('Enter code');
});

// ── Name lookup — matching ────────────────────────────────────────────────────

test('typing "sampath" shows coupon chip with the name', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'sampath');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toBeVisible();
  const chip = await page.locator('.discount-chip-name').innerText();
  expect(chip.toUpperCase()).toContain('SAMPATH');
});

test('typing "Pilot" (capitalised) shows chip', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'Pilot');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toBeVisible();
  expect((await page.locator('.discount-chip-name').innerText()).toUpperCase()).toContain('PILOT');
});

test('typing "PARTNER" (uppercase) shows chip', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'PARTNER');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toBeVisible();
});

test('typing an unknown name shows "Unknown name" and no chip', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'notaname');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-no-match')).toBeVisible();
  await expect(page.locator('.discount-chip')).toHaveCount(0);
});

test('clearing the input removes chip and feedback', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);
  await page.fill('#discount-input', '');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toHaveCount(0);
  await expect(page.locator('.discount-no-match')).toHaveCount(0);
});

test('clicking × on the chip clears the discount and removes the chip', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toBeVisible();
  await page.click('#discount-clear-btn');
  await page.waitForTimeout(100);

  await expect(page.locator('.discount-chip')).toHaveCount(0);
  await expect(page.locator('#discount-input')).toHaveValue('');
});

test('clicking × restores original price', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);
  expect(await getTotalAmount(page)).toBeCloseTo(37.5, 2);

  await page.click('#discount-clear-btn');
  await page.waitForTimeout(100);
  expect(await getTotalAmount(page)).toBe(50);
});

// ── Price impact ──────────────────────────────────────────────────────────────

test('typing "sampath" reduces XM Basic total from $50 to $45', async ({ page }) => {
  await activateModule(page, 'xm');
  const before = await getTotalAmount(page);
  expect(before).toBe(50);

  await page.fill('#discount-input', 'sampath');
  await page.waitForTimeout(100);

  expect(await getTotalAmount(page)).toBe(45);
});

test('typing "pilot" reduces XM Basic $50 to $37.50', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);

  expect(await getTotalAmount(page)).toBeCloseTo(37.5, 2);
});

test('typing "partner" reduces XM Basic $50 to $42.50', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'partner');
  await page.waitForTimeout(100);

  expect(await getTotalAmount(page)).toBeCloseTo(42.5, 2);
});

test('clearing the input restores original price', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);
  await page.fill('#discount-input', '');
  await page.waitForTimeout(100);

  expect(await getTotalAmount(page)).toBe(50);
});

// ── Breakdown line items ──────────────────────────────────────────────────────

test('discount line item appears in summary when name matches', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);

  const summaryText = await page.locator('#summary-content').innerText();
  expect(summaryText.toLowerCase()).toContain('pilot');
  expect(summaryText).toContain('25%');
});

test('discount line shows minus sign on matched preset', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'sampath');
  await page.waitForTimeout(100);

  const discountEl = page.locator('.discount-line-amount');
  await expect(discountEl).toBeVisible();
  expect(await discountEl.innerText()).toContain('−');
});

test('discount line is absent when no name is typed', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('.discount-line-amount')).toHaveCount(0);
});

// ── Discount + surcharge compound ─────────────────────────────────────────────

test('Pilot (25%) + quarterly (+7.5%): $50 × 0.75 × 1.075 ≈ $40.31', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);
  await setBilling(page, 'quarterly');

  // $50 × 0.75 = $37.50 × 1.075 = $40.3125 → rounds to $40.31
  expect(await getTotalAmount(page)).toBeCloseTo(40.31, 1);
});

// ── URL hash encoding ─────────────────────────────────────────────────────────

test('typing a matching name encodes disc param in URL hash', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(200);

  const hash = await page.evaluate(() => window.location.hash);
  expect(hash).toContain('disc=pilot');
});

test('no name typed = no disc param in hash', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.waitForTimeout(200);

  const hash = await page.evaluate(() => window.location.hash);
  expect(hash).not.toContain('disc=');
});

test('clearing the input removes disc param from hash', async ({ page }) => {
  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'sampath');
  await page.waitForTimeout(200);
  await page.fill('#discount-input', '');
  await page.waitForTimeout(200);

  const hash = await page.evaluate(() => window.location.hash);
  expect(hash).not.toContain('disc=');
});

// ── URL state restoration ─────────────────────────────────────────────────────
// Uses about:blank → hash URL to force a fresh page load (same-path hash
// changes don't re-fire DOMContentLoaded when coming from beforeEach's goto('/'))

test('loading URL with disc=pilot pre-fills input with "Pilot"', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(
    '/#bil=a&disc=pilot&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5'
  );
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  await expect(page.locator('#discount-input')).toHaveValue('Pilot');
});

test('loading URL with disc=pilot applies 25% off immediately', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(
    '/#bil=a&disc=pilot&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5'
  );
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  expect(await getTotalAmount(page)).toBeCloseTo(37.5, 2);
});

test('loading URL with disc=sampath pre-fills input with "Sampath" and applies 10%', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(
    '/#bil=a&disc=sampath&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5'
  );
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  await expect(page.locator('#discount-input')).toHaveValue('Sampath');
  expect(await getTotalAmount(page)).toBe(45);
});

// ── Contact-sales hides discount input ───────────────────────────────────────

test('discount input is absent when contact-sales module is active', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto(
    '/#bil=a&mods=orm&orm_pkg=admin&orm_at=basic&orm_al=100000&orm_nt=basic&orm_nl=1&orm_cp=0&orm_clc=0&orm_tk=0&orm_us=2'
  );
  await page.waitForSelector('#card-body-orm', { state: 'visible' });

  await expect(page.locator('#discount-input')).toHaveCount(0);
});

// ── Export content includes discount ─────────────────────────────────────────

test('Copy Summary text includes discount line when name matches', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await activateModule(page, 'xm');
  await page.fill('#discount-input', 'pilot');
  await page.waitForTimeout(100);

  await page.click('#btn-copy-summary');
  await page.waitForTimeout(300);

  const clipText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipText.toLowerCase()).toContain('pilot');
  expect(clipText).toContain('25%');
});
