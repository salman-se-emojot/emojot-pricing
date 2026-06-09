// E2E — URL hash state persistence
import { test, expect } from '@playwright/test';
import { activateModule, setTier, setNumber, setBilling, toggleSwitch, getTotalAmount } from './helpers.js';

// ── Hash updates on interaction ───────────────────────────────────────────────
test('URL hash is empty on fresh load with no modules', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  expect(new URL(page.url()).hash).toBe('');
});

test('URL hash updates when a module is activated', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('mods=');
  expect(hash).toContain('xm');
});

test('URL hash encodes billing cycle', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');
  await setBilling(page, 'quarterly');

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('bil=q');
});

test('URL hash encodes annual billing as "a"', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('bil=a');
});

test('URL hash updates when tier changes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');
  await setTier(page, 'xm', 'standard');

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('xm_t=standard');
});

test('URL hash updates when touchpoints change', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');
  await setNumber(page, 'xm-tp', 25);

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('xm_tp=25');
});

test('URL hash encodes multiple active modules', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');
  await activateModule(page, 'slt');

  const hash = new URL(page.url()).hash;
  expect(hash).toContain('xm');
  expect(hash).toContain('slt');
});

// ── State restores from URL hash ──────────────────────────────────────────────
test('navigating to a hash URL activates the encoded module', async ({ page }) => {
  // XM basic, all defaults
  await page.goto('/#bil=a&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5');
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  await expect(page.locator('#card-xm')).toBeVisible();
  await expect(page.locator('#mtoggle-xm')).toHaveClass(/active/);
});

test('URL hash restores the correct tier', async ({ page }) => {
  await page.goto('/#bil=a&mods=xm&xm_t=standard&xm_tp=25&xm_se=3&xm_db=2&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=25');
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  await expect(page.locator('[data-module="xm"][data-tier="standard"]')).toHaveClass(/active/);
  await expect(page.locator('[data-module="xm"][data-tier="basic"]')).not.toHaveClass(/active/);
});

test('URL hash restores the correct total', async ({ page }) => {
  // XM Standard ($250 base) + 5 excess touchpoints × $10 = $300
  await page.goto('/#bil=a&mods=xm&xm_t=standard&xm_tp=30&xm_se=3&xm_db=2&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=25');
  await page.waitForSelector('.sum-total-amount', { state: 'visible' });

  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(300, 0);  // $250 + 5 excess × $10
});

test('URL hash restores billing cycle', async ({ page }) => {
  await page.goto('/#bil=q&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5');
  await page.waitForSelector('#card-body-xm', { state: 'visible' });

  await expect(page.locator('[data-cycle="quarterly"]')).toHaveClass(/active/);
  // Total should reflect the +7.5% surcharge: $50 × 1.075 = $53.75
  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(53.75, 2);
});

test('URL hash restores multiple modules', async ({ page }) => {
  await page.goto('/#bil=a&mods=xm%2Cslt&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5&slt_t=basic&slt_kw=5&slt_me=10000&slt_pr=30&slt_fl=0&slt_yt=0&slt_us=5');
  await page.waitForSelector('#card-body-xm', { state: 'visible' });
  await page.waitForSelector('#card-body-slt', { state: 'visible' });

  await expect(page.locator('#card-xm')).toBeVisible();
  await expect(page.locator('#card-slt')).toBeVisible();
  // XM $50 + SLT $130 = $180
  const total = await getTotalAmount(page);
  expect(total).toBe(180);
});

test('URL hash restores toggled add-ons (domainOn = true)', async ({ page }) => {
  // XM basic with SMS domain on → $50 + $30 = $80
  await page.goto('/#bil=a&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=1&xm_us=5');
  await page.waitForSelector('.sum-total-amount', { state: 'visible' });

  const total = await getTotalAmount(page);
  expect(total).toBeCloseTo(80, 0);  // $50 + $30 domain
});

test('URL hash restores ORM package type', async ({ page }) => {
  await page.goto('/#bil=a&mods=orm&orm_pkg=nonAdmin&orm_at=basic&orm_al=5&orm_nt=basic&orm_nl=1&orm_cp=0&orm_clc=0&orm_tk=0&orm_us=2');
  await page.waitForSelector('#card-body-orm', { state: 'visible' });

  // Non-admin radio should be selected
  await expect(page.locator('[data-radio="orm-package"][data-value="nonAdmin"]')).toHaveClass(/active/);
});

// ── Shareable link ─────────────────────────────────────────────────────────────
test('copied summary text contains the shareable URL', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.waitForSelector('#module-selector-grid');
  await activateModule(page, 'xm');

  await page.click('#btn-copy-summary');
  // Read clipboard
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('localhost');
  expect(text).toContain('mods=');
});
