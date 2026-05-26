// E2E — SLT (Social Listening & Tracking) module
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setNumber, toggleSwitch, getTotalAmount } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'slt');
});

// ── Initial state ────────────────────────────────────────────────────
test('SLT card renders with Basic tier selected', async ({ page }) => {
  await expect(page.locator('[data-module="slt"][data-tier="basic"]')).toHaveClass(/active/);
});

test('SLT initial total is $130 (Basic base)', async ({ page }) => {
  const total = await getTotalAmount(page);
  expect(total).toBe(130);
});

test('SLT shows keywords, mentions, profiles fields', async ({ page }) => {
  await expect(page.locator('#slt-kw')).toBeVisible();
  await expect(page.locator('#slt-mentions')).toBeVisible();
  await expect(page.locator('#slt-profiles')).toBeVisible();
});

// ── Tier selection ───────────────────────────────────────────────────
test('Standard tier base is $225', async ({ page }) => {
  await setTier(page, 'slt', 'standard');
  const total = await getTotalAmount(page);
  expect(total).toBe(225);
});

test('Enterprise tier base is $600', async ({ page }) => {
  await setTier(page, 'slt', 'enterprise');
  const total = await getTotalAmount(page);
  expect(total).toBe(600);
});

// ── Keywords ─────────────────────────────────────────────────────────
test('keyword excess charged at $15/keyword', async ({ page }) => {
  await setNumber(page, 'slt-kw', 7);           // 2 excess × $15 = $30
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(160, 0);
});

test('keywords within included count (5) do not increase total', async ({ page }) => {
  await setNumber(page, 'slt-kw', 5);
  const total = await getTotalAmount(page);
  expect(total).toBe(130);
});

// ── Mentions (billed in 10k blocks) ──────────────────────────────────
test('1 mention above included triggers 1 block charge ($12)', async ({ page }) => {
  await setNumber(page, 'slt-mentions', 10001);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(142, 0);            // $130 + $12
});

test('exactly 10k excess = 1 block, $12', async ({ page }) => {
  await setNumber(page, 'slt-mentions', 20000);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(142, 0);
});

test('10001 excess = 2 blocks, $24', async ({ page }) => {
  await setNumber(page, 'slt-mentions', 20001);
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(154, 0);            // $130 + $24
});

test('summary shows raw mention count, not blocks', async ({ page }) => {
  // The field value should be a raw count
  const val = await page.locator('#slt-mentions').inputValue();
  expect(Number(val)).toBeGreaterThan(1000);    // raw, not 1 block
});

// ── SM Profiles (billed in blocks of 10) ─────────────────────────────
test('1 profile above included triggers 1 block ($15)', async ({ page }) => {
  await setNumber(page, 'slt-profiles', 31);    // 1 excess → 1 block
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(145, 0);
});

test('11 profiles above = 2 blocks ($30)', async ({ page }) => {
  await setNumber(page, 'slt-profiles', 41);    // 11 excess → 2 blocks
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(160, 0);
});

// ── Mention Flagging ─────────────────────────────────────────────────
test('Flagging add-on charges $50 on Basic', async ({ page }) => {
  await toggleSwitch(page, 'slt-flagging');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(180, 0);
});

test('Flagging is included in Enterprise (toggle disabled)', async ({ page }) => {
  await setTier(page, 'slt', 'enterprise');
  await expect(page.locator('#slt-flagging')).toBeDisabled();
});

test('tier change resets flagging toggle', async ({ page }) => {
  await toggleSwitch(page, 'slt-flagging');
  const totalWithFlagging = await getTotalAmount(page);
  expect(totalWithFlagging).toBeCloseTo(180, 0);
  // Switch tier — should reset flaggingOn to false
  await setTier(page, 'slt', 'standard');
  const totalAfterTierSwitch = await getTotalAmount(page);
  expect(totalAfterTierSwitch).toBe(225);       // Standard base only, no flagging
});

// ── YouTube AI Search ────────────────────────────────────────────────
test('YouTube add-on charges $50', async ({ page }) => {
  await toggleSwitch(page, 'slt-youtube');
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(180, 0);            // $130 + $50
});

test('tier change resets youtube toggle', async ({ page }) => {
  await toggleSwitch(page, 'slt-youtube');
  await setTier(page, 'slt', 'standard');       // should reset youtubeOn
  const total = await getTotalAmount(page);
  expect(total).toBe(225);                       // Standard base only, no youtube
});

// ── Users ────────────────────────────────────────────────────────────
test('user overage at $2/user', async ({ page }) => {
  await setNumber(page, 'slt-users', 8);        // 3 excess × $2 = $6
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(136, 0);
});

// ── Summary ──────────────────────────────────────────────────────────
test('summary shows SLT module section', async ({ page }) => {
  await expect(page.locator('#summary-content')).toContainText('SLT — Social Listening');
});

test('slt-mentions field shows raw count (10000) not blocks (1)', async ({ page }) => {
  // The input should hold the raw mention count, not a block count
  const val = await page.locator('#slt-mentions').inputValue();
  expect(Number(val)).toBe(10000);
});

// ── Compound ─────────────────────────────────────────────────────────
test('Standard + keyword excess + youtube = $300', async ({ page }) => {
  await setTier(page, 'slt', 'standard');        // $225
  await setNumber(page, 'slt-kw', 15);           // 5 excess × $15 = $75
  // Note: youtube was reset when switching tier, re-enable it
  await toggleSwitch(page, 'slt-youtube');        // +$50
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(350, 0);             // $225 + $75 + $50
});
