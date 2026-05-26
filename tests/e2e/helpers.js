// Shared E2E helpers — selector shapes match the actual rendered HTML

/**
 * Activate a module by clicking its toggle card.
 * Waits until the card body is visible.
 */
export async function activateModule(page, moduleId) {
  await page.click(`#mtoggle-${moduleId}`);
  await page.waitForSelector(`#card-body-${moduleId}`, { state: 'visible' });
}

/**
 * Deactivate a module by clicking its toggle card again.
 * Waits until the card element is fully removed.
 */
export async function deactivateModule(page, moduleId) {
  await page.click(`#mtoggle-${moduleId}`);
  await page.waitForSelector(`#card-${moduleId}`, { state: 'detached' });
}

/**
 * Set a number input and fire the 'input' event (bindNum listens to 'input').
 * Clears the field first, then fills with the new value.
 */
export async function setNumber(page, inputId, value) {
  const el = page.locator(`#${inputId}`);
  await el.fill(String(value));
  await page.waitForTimeout(60);
}

/**
 * Click a billing cycle button.
 */
export async function setBilling(page, cycle) {
  await page.click(`[data-cycle="${cycle}"]`);
  await page.waitForTimeout(60);
}

/**
 * Click a tier button for a given module.
 * Buttons are rendered as: data-module="xm" data-tier="standard"
 */
export async function setTier(page, moduleId, tierId) {
  await page.click(`[data-module="${moduleId}"][data-tier="${tierId}"]`);
  await page.waitForTimeout(100);  // tier change triggers full redraw
}

/**
 * Click a radio button for ORM package type (or any radio group).
 * Buttons are rendered as: data-radio="orm-package" data-value="admin"
 */
export async function setRadio(page, groupName, value) {
  await page.click(`[data-radio="${groupName}"][data-value="${value}"]`);
  await page.waitForTimeout(100);
}

/**
 * Toggle a custom switch.
 * The checkbox itself has opacity:0 / width:0 / height:0 (CSS-hidden).
 * Clicking the visible parent <label class="switch"> fires the change event correctly.
 */
export async function toggleSwitch(page, toggleId) {
  await page.locator(`label.switch:has(#${toggleId})`).click();
  await page.waitForTimeout(60);
}

/**
 * Get the text content of the summary panel.
 */
export async function getSummaryText(page) {
  return page.locator('#summary-content').innerText();
}

/**
 * Extract a dollar amount from summary text by partial line match.
 * Returns the number or null.
 */
export function extractAmount(summaryText, keyword) {
  const lines = summaryText.split('\n').map(l => l.trim()).filter(Boolean);
  const line = lines.find(l => l.toLowerCase().includes(keyword.toLowerCase()));
  if (!line) return null;
  const match = line.match(/\$([\d,]+\.?\d*)/g);
  return match ? parseFloat(match[match.length - 1].replace(/[$,]/g, '')) : null;
}

/**
 * Get the total amount from the summary (the big number in sum-total-amount).
 */
export async function getTotalAmount(page) {
  const text = await page.locator('.sum-total-amount').innerText();
  return parseFloat(text.replace(/[$,/a-z\s]/gi, ''));
}
