// E2E — UXI multi-module scenarios (cross-module pricing)
import { test, expect } from '@playwright/test';
import { activateModule, deactivateModule, setTier, setNumber, setBilling, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
});

// ── Two modules ──────────────────────────────────────────────────────
test('XM + SLT baselines sum correctly ($50 + $130 = $180)', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(180, 0);
});

test('XM + ORM baselines ($50 + $50 = $100)', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'orm');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(100, 0);
});

// ── All three modules ────────────────────────────────────────────────
test('all three modules active: base total is $50+$50+$130 = $230', async ({ page }) => {
  for (const id of ['xm', 'orm', 'slt']) {
    await activateModule(page, id);
  }
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(230, 0);
});

test('summary shows all three module sections when all active', async ({ page }) => {
  for (const id of ['xm', 'orm', 'slt']) {
    await activateModule(page, id);
  }
  const summaryText = await page.locator('#summary-content').innerText();
  expect(summaryText).toContain('XM — Experience Management');
  expect(summaryText).toContain('ORM — Online Reputation');
  expect(summaryText).toContain('SLT — Social Listening');
});

// ── Tier upgrades across modules ─────────────────────────────────────
test('upgrading XM to Standard + SLT Standard: $250 + $225 = $475', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  await setTier(page, 'xm', 'standard');
  await setTier(page, 'slt', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(475, 0);
});

// ── Billing surcharge applied across all modules ──────────────────────
test('quarterly surcharge applies to combined total', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  const annualTotal = await getTotalAmount(page);  // $180

  await setBilling(page, 'quarterly');
  const quarterlyTotal = await getTotalAmount(page);
  expect(quarterlyTotal).toBeCloseTo(annualTotal * 1.075, 2);  // $193.50
});

test('monthly surcharge on all three modules', async ({ page }) => {
  for (const id of ['xm', 'orm', 'slt']) {
    await activateModule(page, id);
  }
  const annualTotal = await getTotalAmount(page);
  await setBilling(page, 'monthly');
  const monthlyTotal = await getTotalAmount(page);
  expect(monthlyTotal).toBeCloseTo(annualTotal * 1.1, 2);
});

// ── Module deactivation updates total ────────────────────────────────
test('deactivating a module removes its cost from total', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  const combined = await getTotalAmount(page);  // $180

  await deactivateModule(page, 'slt');
  const afterRemoval = await getTotalAmount(page);
  expect(afterRemoval).toBeCloseTo(50, 0);       // only XM left
  expect(afterRemoval).toBeLessThan(combined);
});

// ── Per-module entitlements block ────────────────────────────────────
test('entitlements block lists all active modules with user counts', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  const block = await page.locator('.sum-included-users').innerText();
  expect(block).toContain('XM');
  expect(block).toContain('SLT');
  expect(block).toContain('users included');
});

test('entitlements block shows correct total user count (XM Basic: 5 + SLT Basic: 5 = 10)', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  await expect(page.locator('.sum-included-users')).toContainText('10 users');
});

// ── UXI badge in summary ─────────────────────────────────────────────
test('UXI badge appears in summary total block with 2+ modules', async ({ page }) => {
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');
  await expect(page.locator('.sum-total-note .uxi-badge')).toBeVisible();
});

// ── Billing note in summary ──────────────────────────────────────────
test('billing note shows "Annual rate · no surcharge" by default', async ({ page }) => {
  await activateModule(page, 'xm');
  await expect(page.locator('.sum-total-note')).toContainText('Annual rate');
});

test('billing note updates when switching to quarterly', async ({ page }) => {
  await activateModule(page, 'xm');
  await setBilling(page, 'quarterly');
  await expect(page.locator('.sum-total-note')).toContainText('Billed quarterly');
});

// ── Annual year total ────────────────────────────────────────────────
test('annual total in summary = monthly × 12', async ({ page }) => {
  await activateModule(page, 'xm');
  const monthlyText = await page.locator('.sum-total-amount').innerText();
  const monthly = parseFloat(monthlyText.replace(/[$,/a-z\s]/gi, ''));
  const annualText = await page.locator('.sum-total-annual').innerText();
  const annual = parseFloat(annualText.replace(/[$,a-z\s:]/gi, ''));
  expect(annual).toBeCloseTo(monthly * 12, 1);
});
