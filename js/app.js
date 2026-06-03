// App entry point — wires state, modules, and UI together.
// This file orchestrates; it does not contain pricing logic or rendering primitives.

import { appState } from './core/state.js';
import { calculate } from './core/engine.js';
import { saveFocus, restoreFocus, fmt, round2 } from './core/utils.js';
import { serializeState, deserializeState } from './core/url-state.js';
import { BILLING_CYCLES } from './config/pricing.js';
import { MODULE_REGISTRY } from './modules/registry.js';
import { renderSummary, renderOpenItemsBanner } from './components/Summary.js';

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore state from URL hash before rendering anything
  restoreFromHash();

  renderOpenItems();
  renderModuleSelector();
  renderBillingSelector();
  updateSummary();

  // Re-render active modules that were restored from URL
  for (const id of appState.activeModules) {
    setModuleToggleUI(id, true);
    mountModuleCard(id);
  }
  updateUXIBadge();

  // React to all state changes
  appState.subscribe(() => {
    updateSummary();
    pushHash();
  });

  // Clear all modules button
  document.getElementById('btn-clear-modules')?.addEventListener('click', () => {
    for (const id of [...appState.activeModules]) {
      appState.deactivateModule(id);
      setModuleToggleUI(id, false);
      document.getElementById(`card-${id}`)?.remove();
    }
    updateUXIBadge();
  });

  // Export buttons
  document.getElementById('btn-copy-summary')?.addEventListener('click', handleCopy);
  document.getElementById('btn-print-summary')?.addEventListener('click', handlePrint);
});

// ── URL state ─────────────────────────────────────────────────
function restoreFromHash() {
  const decoded = deserializeState(window.location.hash);
  if (!decoded) return;

  const { billing, moduleIds, moduleStates } = decoded;
  if (billing) appState.setBilling(billing);

  for (const id of moduleIds) {
    const mod = MODULE_REGISTRY.find(m => m.id === id);
    if (!mod) continue;
    // Merge decoded state over module defaults (so any missing keys get defaults)
    const initialState = mod.initialState();
    const merged = { ...initialState, ...(moduleStates[id] ?? {}) };
    appState.activateModule(id, merged);
  }
}

function pushHash() {
  const hash = serializeState(appState);
  history.replaceState(null, '', hash ? '#' + hash : window.location.pathname);
}

// ── Open items banner ─────────────────────────────────────────
function renderOpenItems() {
  document.getElementById('open-items-container').innerHTML = renderOpenItemsBanner();
}

// ── Billing selector ──────────────────────────────────────────
function renderBillingSelector() {
  const container = document.getElementById('billing-selector');
  container.innerHTML = Object.values(BILLING_CYCLES).map(c => `
    <button class="billing-opt ${c.id === appState.billing ? 'active' : ''}"
            data-cycle="${c.id}">
      ${c.label}
      ${c.surchargePct > 0 ? `<small>+${c.surchargePct}%</small>` : '<small>base</small>'}
    </button>
  `).join('');

  container.querySelectorAll('[data-cycle]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.setBilling(btn.dataset.cycle);
      // Update active state
      container.querySelectorAll('[data-cycle]').forEach(b =>
        b.classList.toggle('active', b.dataset.cycle === appState.billing));
      // Update note
      document.getElementById('billing-note').textContent =
        BILLING_CYCLES[appState.billing].note;
    });
  });

  document.getElementById('billing-note').textContent = BILLING_CYCLES[appState.billing].note;
}

// ── Module selector ───────────────────────────────────────────
function renderModuleSelector() {
  const grid = document.getElementById('module-selector-grid');
  grid.innerHTML = MODULE_REGISTRY.map(mod => `
    <div class="module-toggle" id="mtoggle-${mod.id}" data-module="${mod.id}">
      <div class="module-check" id="mcheck-${mod.id}" aria-hidden="true"></div>
      <div class="module-info">
        <div class="module-toggle-top">
          <span class="mod-badge" id="mbadge-${mod.id}">${mod.shortName}</span>
          <span class="mod-name">${mod.name}</span>
        </div>
        <div class="mod-desc">${mod.description}</div>
      </div>
      <div class="module-toggle-state" id="mstate-${mod.id}">Add module</div>
    </div>
  `).join('');

  grid.querySelectorAll('.module-toggle').forEach(el => {
    el.addEventListener('click', () => toggleModule(el.dataset.module));
  });
}

function toggleModule(id) {
  if (appState.isActive(id)) {
    appState.deactivateModule(id);
    setModuleToggleUI(id, false);
    document.getElementById(`card-${id}`)?.remove();
  } else {
    const mod = MODULE_REGISTRY.find(m => m.id === id);
    appState.activateModule(id, mod.initialState());
    setModuleToggleUI(id, true);
    mountModuleCard(id);
  }
  updateUXIBadge();
}

function setModuleToggleUI(id, active) {
  document.getElementById(`mtoggle-${id}`)?.classList.toggle('active', active);
  const check = document.getElementById(`mcheck-${id}`);
  const badge = document.getElementById(`mbadge-${id}`);
  const state = document.getElementById(`mstate-${id}`);
  if (check) check.innerHTML = active ? '✓' : '';
  if (badge) badge.classList.toggle('active', active);
  if (state) state.textContent = active ? 'Added' : 'Add module';
}

function updateUXIBadge() {
  const count = appState.activeModules.length;
  const badge = document.getElementById('uxi-header-badge');
  if (badge) badge.innerHTML = count > 1 ? '<span class="uxi-badge">UXI</span>' : '';
}

// ── Module card lifecycle ─────────────────────────────────────
function mountModuleCard(id) {
  const mod = MODULE_REGISTRY.find(m => m.id === id);
  const container = document.getElementById('module-cards');

  // Insert card after existing cards in registry order
  const card = document.createElement('div');
  card.className = 'card module-card';
  card.id = `card-${id}`;
  card.innerHTML = `
    <div class="card-header" data-collapse="${id}">
      <h2>${mod.shortName} — ${mod.name}</h2>
      <span class="chevron open" id="chev-${id}">▼</span>
    </div>
    <div class="card-body" id="card-body-${id}"></div>
  `;

  // Insert in registry order
  const idx = MODULE_REGISTRY.findIndex(m => m.id === id);
  const existing = [...container.querySelectorAll('.module-card')];
  let inserted = false;
  for (const ex of existing) {
    const exIdx = MODULE_REGISTRY.findIndex(m => m.id === ex.id.replace('card-', ''));
    if (exIdx > idx) { container.insertBefore(card, ex); inserted = true; break; }
  }
  if (!inserted) container.appendChild(card);

  // Collapse toggle
  card.querySelector('[data-collapse]').addEventListener('click', () => {
    const body = document.getElementById(`card-body-${id}`);
    const chev = document.getElementById(`chev-${id}`);
    body.classList.toggle('hidden');
    chev.classList.toggle('open', !body.classList.contains('hidden'));
  });

  renderModuleCard(id);
}

function renderModuleCard(id) {
  const mod = MODULE_REGISTRY.find(m => m.id === id);
  const s = appState.getModule(id);
  const body = document.getElementById(`card-body-${id}`);
  if (!body) return;

  const focus = saveFocus();
  body.innerHTML = mod.render(s);
  // onUpdate(changes, { redraw: true }) → re-render card (tier changes only)
  // onUpdate(changes)                  → state + summary update only (numeric fields)
  mod.mount(s, (updates, { redraw = false } = {}) => {
    appState.updateModule(id, updates);
    if (redraw) renderModuleCard(id);
  });
  restoreFocus(focus);
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary() {
  const output = calculate(appState);
  const panel = document.getElementById('summary-content');
  const title = document.getElementById('summary-title');

  const count = appState.activeModules.length;
  if (count === 0) {
    title.textContent = 'Pricing Summary';
  } else if (count === 1) {
    const mod = MODULE_REGISTRY.find(m => m.id === appState.activeModules[0]);
    title.textContent = `${mod.shortName} Pricing Summary`;
  } else {
    title.innerHTML = `UXI Pricing Summary <span class="uxi-badge">UXI</span>`;
  }

  panel.innerHTML = renderSummary(output, appState);

  // Show/hide export bar based on whether any module is active
  const exportBar = document.getElementById('export-bar');
  if (exportBar) exportBar.style.display = count > 0 ? 'flex' : 'none';
}

// ── Export: Copy to clipboard ─────────────────────────────────
function handleCopy() {
  const text = buildTextQuote();
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy-summary');
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Export: Print receipt ─────────────────────────────────────
function handlePrint() {
  const html = buildReceiptHTML();
  if (!html) return;
  const win = window.open('', '_blank', 'width=520,height=720');
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give fonts a tick to load, then print
  win.onload = () => { win.print(); win.onafterprint = () => win.close(); };
}

function buildReceiptHTML() {
  if (appState.activeModules.length === 0) return '';

  const output = calculate(appState);
  const { results, billing, baseTotal, billedTotal, hasAnyContactSales } = output;

  const MODULE_LABELS = {
    xm:  'XM — Experience Management',
    ccm: 'CCM — Complaints Management',
    orm: 'ORM — Online Reputation Management',
    slt: 'SLT — Social Listening & Tracking',
  };

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const billingLabel = `${billing.label}${billing.surchargePct > 0 ? ` (+${billing.surchargePct}% surcharge)` : ' · base rate'}`;

  // Build module rows HTML
  let modulesHTML = '';
  for (const r of results) {
    const rowsHTML = r.lines
      .filter(l => l.amount != null)
      .map(l => `
        <tr>
          <td class="line-label">${l.label}</td>
          <td class="line-amt">${fmt(l.amount)}</td>
        </tr>`)
      .join('');

    const subtotalHTML = r.hasContactSales
      ? `<tr class="subtotal-row"><td colspan="2" class="contact-sales">📞 Contact sales — custom quote required</td></tr>`
      : `<tr class="subtotal-row"><td class="line-label">Module subtotal</td><td class="line-amt">${fmt(r.subtotal)}/mo</td></tr>`;

    modulesHTML += `
      <tr class="module-header-row">
        <td colspan="2" class="module-header">${MODULE_LABELS[r.moduleId] ?? r.moduleId}</td>
      </tr>
      ${rowsHTML}
      ${subtotalHTML}
      <tr class="spacer-row"><td colspan="2"></td></tr>`;
  }

  // Build totals HTML
  let totalsHTML = '';
  if (hasAnyContactSales) {
    totalsHTML = `<tr><td colspan="2" class="contact-sales total-contact">Custom quote required — contact Emojot sales</td></tr>`;
  } else {
    if (billing.surchargePct > 0) {
      totalsHTML += `
        <tr>
          <td class="line-label">Base total (annual rate)</td>
          <td class="line-amt">${fmt(baseTotal)}/mo</td>
        </tr>
        <tr>
          <td class="line-label">Billing surcharge (+${billing.surchargePct}%)</td>
          <td class="line-amt">+${fmt(round2(baseTotal * (billing.multiplier - 1)))}/mo</td>
        </tr>`;
    }
    totalsHTML += `
      <tr class="grand-total-row">
        <td class="grand-total-label">Total</td>
        <td class="grand-total-amt">${fmt(billedTotal)}<span class="per-mo">/mo</span></td>
      </tr>
      <tr>
        <td class="line-label annual-label">Annual total</td>
        <td class="line-amt annual-amt">${fmt(round2(billedTotal * 12))}/yr</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Emojot Pricing Quote — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #111;
      background: #fff;
      width: 460px;
      margin: 32px auto;
      padding: 28px 32px 40px;
    }

    /* Header */
    .receipt-header { text-align: center; margin-bottom: 20px; }
    .receipt-co { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #555; margin-bottom: 4px; }
    .receipt-title { font-size: 18px; font-weight: bold; letter-spacing: .04em; margin-bottom: 14px; }
    .receipt-meta { font-size: 11px; color: #444; line-height: 1.7; }

    /* Dividers */
    .dbl { border: none; border-top: 2px solid #111; margin: 14px 0; }
    .sng { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }

    /* Line items table */
    table { width: 100%; border-collapse: collapse; }
    .module-header-row td { padding-top: 4px; }
    .module-header {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      padding-bottom: 5px;
      border-bottom: 1px solid #ccc;
    }
    .line-label { padding: 3px 0; color: #333; }
    .line-amt { padding: 3px 0; text-align: right; white-space: nowrap; }
    .subtotal-row td {
      font-weight: bold;
      border-top: 1px solid #ccc;
      padding-top: 5px;
      padding-bottom: 2px;
    }
    .spacer-row td { height: 12px; }
    .contact-sales { color: #b00; font-style: italic; }

    /* Totals */
    .grand-total-row td { padding-top: 6px; }
    .grand-total-label { font-weight: bold; font-size: 15px; }
    .grand-total-amt { font-weight: bold; font-size: 17px; text-align: right; }
    .per-mo { font-size: 11px; font-weight: normal; }
    .annual-label { font-size: 11px; color: #555; }
    .annual-amt { font-size: 11px; color: #555; text-align: right; }
    .total-contact { font-weight: bold; text-align: center; padding: 8px 0; }

    /* Footer */
    .receipt-footer {
      text-align: center;
      font-size: 10px;
      color: #888;
      margin-top: 20px;
      line-height: 1.6;
    }

    @media print {
      body { margin: 0; padding: 20px; width: 100%; }
    }
  </style>
</head>
<body>

  <div class="receipt-header">
    <div class="receipt-co">Emojot</div>
    <div class="receipt-title">Pricing Quote</div>
    <div class="receipt-meta">
      Date: ${date}<br>
      Billing: ${billingLabel}
    </div>
  </div>

  <hr class="dbl">

  <table>
    ${modulesHTML}
  </table>

  <hr class="dbl">

  <table>
    ${totalsHTML}
  </table>

  <hr class="sng">

  <div class="receipt-footer">
    emojot.com &nbsp;·&nbsp; Generated ${date}<br>
    ${window.location.href}
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  <\/script>
</body>
</html>`;
}

// ── Export: Copy to clipboard ─────────────────────────────────
function buildTextQuote() {
  if (appState.activeModules.length === 0) return '';

  const output = calculate(appState);
  const { results, billing, baseTotal, billedTotal, hasAnyContactSales } = output;
  const MODULE_LABELS = {
    xm:  'XM — Experience Management',
    ccm: 'CCM — Complaints Management',
    orm: 'ORM — Online Reputation',
    slt: 'SLT — Social Listening',
  };

  const lines = [];
  const HR = '─'.repeat(44);

  lines.push('Emojot Pricing Summary');
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`Billing: ${billing.label}${billing.surchargePct > 0 ? ` (+${billing.surchargePct}%)` : ' (base rate)'}`);
  lines.push('');

  for (const r of results) {
    lines.push(HR);
    lines.push(MODULE_LABELS[r.moduleId] ?? r.moduleId);
    for (const l of r.lines) {
      if (l.amount == null) continue;
      const label = `  ${l.label}`;
      const amount = fmt(l.amount);
      lines.push(`${label.padEnd(36)}${amount.padStart(8)}`);
    }
    if (r.hasContactSales) {
      lines.push('  Contact sales for custom quote');
    } else {
      lines.push(`${'  Module subtotal'.padEnd(36)}${fmt(r.subtotal).padStart(8)}/mo`);
    }
    lines.push('');
  }

  lines.push(HR);
  if (hasAnyContactSales) {
    lines.push('TOTAL: Custom quote required — contact sales');
  } else {
    if (billing.surchargePct > 0) {
      lines.push(`${'Base total (annual rate)'.padEnd(36)}${fmt(baseTotal).padStart(8)}/mo`);
      lines.push(`${'Billing surcharge (+' + billing.surchargePct + '%)'.padEnd(36)}${('+' + fmt(round2(baseTotal * (billing.multiplier - 1)))).padStart(8)}/mo`);
      lines.push('');
    }
    lines.push(`TOTAL: ${fmt(billedTotal)}/mo`);
    lines.push(`Annual total: ${fmt(round2(billedTotal * 12))}/yr`);
  }

  lines.push('');
  lines.push(`Shareable link: ${window.location.href}`);

  return lines.join('\n');
}
