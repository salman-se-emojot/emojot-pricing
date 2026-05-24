// App entry point — wires state, modules, and UI together.
// This file orchestrates; it does not contain pricing logic or rendering primitives.

import { appState } from './core/state.js';
import { calculate } from './core/engine.js';
import { saveFocus, restoreFocus } from './core/utils.js';
import { BILLING_CYCLES } from './config/pricing.js';
import { MODULE_REGISTRY } from './modules/registry.js';
import { renderSummary, renderOpenItemsBanner } from './components/Summary.js';

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderOpenItems();
  renderModuleSelector();
  renderBillingSelector();
  updateSummary();

  // React to all state changes
  appState.subscribe(() => updateSummary());
});

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
}
