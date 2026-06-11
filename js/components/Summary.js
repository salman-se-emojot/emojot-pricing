// Summary panel renderer.
// Receives the structured output from engine.calculate() and produces HTML.

import { fmt, round2 } from '../core/utils.js';
import { OPEN_ITEMS } from '../config/openItems.js';
import { TIERS, DISCOUNTS } from '../config/pricing.js';

const MODULE_LABELS = {
  xm:  'XM — Experience Management',
  orm: 'ORM — Online Reputation',
  slt: 'SLT — Social Listening',
};

// ── Open items banner ─────────────────────────────────────────
// Returns '' when OPEN_ITEMS is empty (all resolved/dismissed)
export function renderOpenItemsBanner() {
  if (OPEN_ITEMS.length === 0) return '';

  const pending  = OPEN_ITEMS.filter(i => !i.resolved);
  const resolved = OPEN_ITEMS.filter(i =>  i.resolved);

  return `<div class="open-items-banner">
    <div class="oi-header"><span class="oi-icon">📋</span><span class="oi-title">Pricing Open Items</span></div>
    ${resolved.map(item => `
      <div class="oi-row resolved">
        <span class="oi-status resolved-badge">✓ RESOLVED</span>
        <span class="oi-text"><strong>${item.title}:</strong> ${item.resolution}</span>
      </div>`).join('')}
    ${pending.map(item => `
      <div class="oi-row pending">
        <span class="oi-status pending-badge">⚠ PENDING</span>
        <span class="oi-text"><strong>${item.title}:</strong> ${item.note}</span>
      </div>`).join('')}
  </div>`;
}

// ── Package entitlement block ─────────────────────────────────
// Shows included users per module from the selected tiers.
// ORM is handled specially because its tiers are nested under admin/nonAdmin.
function renderPackageEntitlements(appState) {
  if (appState.activeModules.length === 0) return '';

  const rows = appState.activeModules.map(id => {
    const modState = appState.getModule(id);
    let users, tierLabel;

    if (id === 'orm') {
      // ORM has no flat .tier — uses packageType + adminTier/nonAdminTier.
      // Admin tier drives add-on rules (including users) when 'both' is active.
      const showAdmin = modState.packageType === 'admin' || modState.packageType === 'both';
      const activeTier = showAdmin
        ? TIERS.orm.admin[modState.adminTier]
        : TIERS.orm.nonAdmin[modState.nonAdminTier];
      users = activeTier.users;

      if (modState.packageType === 'admin') {
        tierLabel = `Admin Connect · ${activeTier.label}`;
      } else if (modState.packageType === 'nonAdmin') {
        tierLabel = `Non-Admin Connect · ${activeTier.label}`;
      } else {
        // 'both' — admin tier drives user allocation
        tierLabel = `Admin ${TIERS.orm.admin[modState.adminTier].label} + Non-Admin ${TIERS.orm.nonAdmin[modState.nonAdminTier].label}`;
      }
    } else {
      const tierConfig = TIERS[id]?.[modState.tier];
      if (!tierConfig) return null;
      users = typeof tierConfig.users === 'number' ? tierConfig.users : 0;
      tierLabel = tierConfig.label;
    }

    return { id, label: MODULE_LABELS[id] ?? id, tierLabel, users };
  }).filter(Boolean);

  const totalUsers = rows.reduce((sum, r) => sum + r.users, 0);

  return `<div class="sum-included-users">
    <div class="sum-included-title">📦 Package Entitlements (Selected Tiers)</div>
    ${rows.map(r => `
      <div class="sum-line">
        <span class="sum-label indent">${r.label} · ${r.tierLabel}</span>
        <span class="sum-amount" style="color:var(--success)">${r.users} users included</span>
      </div>`).join('')}
    <div class="sum-line" style="border-top:1px solid var(--gray-200);margin-top:4px;padding-top:5px">
      <span class="sum-label" style="font-weight:600">Total Included Users</span>
      <span class="sum-amount" style="color:var(--success);font-weight:700">${totalUsers} users</span>
    </div>
    <div style="font-size:11px;color:var(--gray-500);margin-top:3px">
      Users above each module's included count are charged at $2/user/mo.
    </div>
  </div>`;
}

// ── Discount input ────────────────────────────────────────────
// Free-text name lookup; event binding + lookup logic in app.js.
function renderDiscountInput(currentDiscountId, inputText) {
  const preset = currentDiscountId ? DISCOUNTS.find(d => d.id === currentDiscountId) : null;

  let feedbackHtml = '';
  if (preset) {
    feedbackHtml = `<div class="discount-chip">
      <span class="discount-chip-icon">🏷</span>
      <span class="discount-chip-name">${preset.label.toUpperCase()}</span>
      <button class="discount-chip-clear" id="discount-clear-btn" aria-label="Remove discount">×</button>
    </div>`;
  } else if ((inputText ?? '').trim()) {
    feedbackHtml = `<span class="discount-no-match">Unknown name</span>`;
  }

  const safeValue = (inputText ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  return `<div class="discount-selector-wrap">
    <label class="discount-label" for="discount-input">Discount</label>
    <input type="text" id="discount-input" class="discount-input"
           value="${safeValue}"
           placeholder="Enter code"
           autocomplete="off" spellcheck="false">
    ${feedbackHtml}
  </div>`;
}

// ── Main summary renderer ─────────────────────────────────────
export function renderSummary(calcOutput, appState, discountInputText = '') {
  const { results, billing, baseTotal, discountPreset, discountAmount, discountedBase, billedTotal, hasAnyContactSales, isUXI, totalSetupFee } = calcOutput;

  if (results.length === 0) {
    return `<div class="summary-empty">Select one or more modules to see pricing.</div>`;
  }

  let html = '';

  // Package-level entitlement transparency block
  if (appState) html += renderPackageEntitlements(appState);

  // Per-module sections
  for (const r of results) {
    html += `<div class="sum-module">
      <div class="sum-module-title">${MODULE_LABELS[r.moduleId] ?? r.moduleId}</div>`;

    for (const line of r.lines) {
      const estMark = line.estimated ? ' <span class="est-mark">*est</span>' : '';
      if (line.amount === null) {
        html += `<div class="sum-line">
          <span class="sum-label indent">${line.label}</span>
          <span class="sum-note">${line.note ?? ''}</span>
        </div>`;
      } else {
        html += `<div class="sum-line">
          <span class="sum-label indent">${line.label}${estMark}</span>
          <span class="sum-amount">${fmt(line.amount)}</span>
        </div>`;
      }
    }

    if (r.hasContactSales) {
      html += `<div class="contact-sales" style="margin:6px 0">
        📞 ${r.contactSalesReason ?? 'Custom quote required — contact sales'}
      </div>`;
    }

    html += `<div class="sum-line subtotal">
      <span class="sum-label">Module subtotal</span>
      <span class="sum-amount">${r.hasContactSales ? '—' : fmt(r.subtotal)}/mo</span>
    </div>`;

    if (!hasAnyContactSales) {
      html += `<div class="sum-line setup-fee-line">
        <span class="sum-label indent">Setup fee (one-time)</span>
        <span class="sum-amount setup-fee-amount">${fmt(r.setupFee)}</span>
      </div>`;
    }

    html += `</div>`;
  }

  html += `<hr class="sum-divider">`;

  // Discount input — hidden when contact-sales (nothing to discount)
  if (!hasAnyContactSales) {
    html += renderDiscountInput(appState?.discount ?? null, discountInputText);
  }

  // Breakdown rows — shown when there's a discount, a surcharge, or both
  const showBreakdown = !hasAnyContactSales && (discountPreset || billing.surchargePct > 0);
  if (showBreakdown) {
    const baseLbl = billing.surchargePct > 0 ? 'Base total (annual rate)' : 'Base total';
    html += `<div class="sum-line">
      <span class="sum-label">${baseLbl}</span>
      <span class="sum-amount">${fmt(baseTotal)}/mo</span>
    </div>`;

    if (discountPreset) {
      const pct = Math.round(discountPreset.rate * 100);
      html += `<div class="sum-line">
        <span class="sum-label discount-line-label">Discount — ${discountPreset.label} (${pct}%)</span>
        <span class="sum-amount discount-line-amount">−${fmt(discountAmount)}/mo</span>
      </div>`;
    }

    if (billing.surchargePct > 0) {
      html += `<div class="sum-line">
        <span class="sum-label">Billing surcharge (+${billing.surchargePct}%)</span>
        <span class="sum-amount">+${fmt(round2(discountedBase * (billing.multiplier - 1)))}/mo</span>
      </div>`;
    }

    html += `<hr class="sum-divider">`;
  }

  // Total block
  if (hasAnyContactSales) {
    html += `<div class="sum-contact-total">
      <p class="sum-contact-title">⛔ Custom quote required</p>
      <p class="sum-contact-body">One or more modules need a custom price.<br>Please contact the Emojot sales team.</p>
    </div>`;
  } else {
    const cycleNote = {
      annual:    'Annual rate · no surcharge',
      quarterly: 'Billed quarterly · +7.5% applied',
      monthly:   'Billed monthly · +10% applied',
    }[billing.id];

    html += `<div class="sum-total-block">
      <div class="sum-total-note">${isUXI ? '<span class="uxi-badge">UXI</span> ' : ''}${cycleNote}</div>
      <div class="sum-total-amount">${fmt(billedTotal)}<span class="sum-total-mo">/mo</span></div>
      <div class="sum-total-annual">Annual total: ${fmt(round2(billedTotal * 12))}</div>
    </div>
    <div class="sum-setup-total-block">
      <div class="sum-line setup-fee-total-line">
        <span class="sum-label">Total setup fee <span class="setup-fee-badge">one-time</span></span>
        <span class="sum-amount setup-fee-total-amount">${fmt(totalSetupFee)}</span>
      </div>
    </div>`;

    if (billing.surchargePct > 0) {
      // Reference note: show discounted base if discount active, otherwise raw base
      const refBase = discountPreset ? discountedBase : baseTotal;
      const refLabel = discountPreset ? 'Discounted annual rate' : 'Base annual rate';
      html += `<div class="sum-base-note">${refLabel}: ${fmt(refBase)}/mo · ${fmt(round2(refBase * 12))}/yr</div>`;
    } else {
      html += `<div class="sum-base-note">${fmt(round2(billedTotal * 12))}/yr · no surcharge on annual billing</div>`;
    }
  }

  return html;
}
