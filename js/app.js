// App entry point — wires state, modules, and UI together.
// This file orchestrates; it does not contain pricing logic or rendering primitives.

import { appState } from './core/state.js';
import { calculate } from './core/engine.js';
import { saveFocus, restoreFocus, fmt, round2 } from './core/utils.js';
import { serializeState, deserializeState } from './core/url-state.js';
import { BILLING_CYCLES, DISCOUNTS } from './config/pricing.js';
import { MODULE_REGISTRY } from './modules/registry.js';
import { renderSummary, renderOpenItemsBanner } from './components/Summary.js';

// Tracks the raw text in the discount input across re-renders.
// Separate from appState.discount (which stores the matched preset id).
let _discountInputText = '';

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
});

// ── URL state ─────────────────────────────────────────────────
function restoreFromHash() {
  const decoded = deserializeState(window.location.hash);
  if (!decoded) return;

  const { billing, discount, moduleIds, moduleStates } = decoded;
  if (billing)  appState.setBilling(billing);
  if (discount) {
    appState.setDiscount(discount);
    // Pre-populate the input with the preset's display label
    _discountInputText = DISCOUNTS.find(d => d.id === discount)?.label ?? '';
  }

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

  const focus = saveFocus();
  panel.innerHTML = renderSummary(output, appState, _discountInputText);
  restoreFocus(focus);

  // Bind discount input (re-rendered on every summary update).
  // Looks up the typed name against DISCOUNTS presets (case-insensitive).
  document.getElementById('discount-input')?.addEventListener('input', e => {
    _discountInputText = e.target.value;
    const q = e.target.value.trim().toLowerCase();
    const match = DISCOUNTS.find(d => d.id === q || d.label.toLowerCase() === q);
    appState.setDiscount(match ? match.id : null);
  });

  // Clear button on the applied-discount chip
  document.getElementById('discount-clear-btn')?.addEventListener('click', () => {
    _discountInputText = '';
    appState.setDiscount(null);
  });

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

// ── Export: Copy to clipboard ─────────────────────────────────
function buildTextQuote() {
  if (appState.activeModules.length === 0) return '';

  const output = calculate(appState);
  const { results, billing, baseTotal, discountPreset, discountAmount, discountedBase, billedTotal, hasAnyContactSales, totalSetupFee } = output;
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
      lines.push(`${'  Setup fee (one-time)'.padEnd(36)}${fmt(r.setupFee).padStart(8)}`);
    }
    lines.push('');
  }

  lines.push(HR);
  if (hasAnyContactSales) {
    lines.push('TOTAL: Custom quote required — contact sales');
  } else {
    const showBreakdown = discountPreset || billing.surchargePct > 0;
    if (showBreakdown) {
      const baseLbl = billing.surchargePct > 0 ? 'Base total (annual rate)' : 'Base total';
      lines.push(`${baseLbl.padEnd(36)}${fmt(baseTotal).padStart(8)}/mo`);
    }
    if (discountPreset) {
      const pct = Math.round(discountPreset.rate * 100);
      const discLbl = `Discount — ${discountPreset.label} (${pct}%)`;
      lines.push(`${discLbl.padEnd(36)}${('−' + fmt(discountAmount)).padStart(8)}/mo`);
    }
    if (billing.surchargePct > 0) {
      lines.push(`${'Billing surcharge (+' + billing.surchargePct + '%)'.padEnd(36)}${('+' + fmt(round2(discountedBase * (billing.multiplier - 1)))).padStart(8)}/mo`);
    }
    if (showBreakdown) lines.push('');
    lines.push(`TOTAL: ${fmt(billedTotal)}/mo`);
    lines.push(`Annual total: ${fmt(round2(billedTotal * 12))}/yr`);
    lines.push('');
    lines.push(`${'Total setup fee (one-time)'.padEnd(36)}${fmt(totalSetupFee).padStart(8)}`);
  }

  lines.push('');
  lines.push(`Shareable link: ${window.location.href}`);

  return lines.join('\n');
}
