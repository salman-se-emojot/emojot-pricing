// Shared UI rendering primitives.
// All functions return HTML strings. After insertion, call bindEvents.

// ── Tier selector ────────────────────────────────────────────
export function renderTierSelector(moduleId, tiers, currentTierId) {
  return `<div class="tier-selector">
    ${Object.values(tiers).map(t => `
      <button class="tier-btn ${t.id === currentTierId ? 'active' : ''}"
              data-module="${moduleId}" data-tier="${t.id}">
        <span class="tier-name">${t.label}</span>
        <span class="tier-price">$${t.base.toLocaleString()}/mo</span>
      </button>`).join('')}
  </div>`;
}

// ── Included-in-tier visual panel ───────────────────────────
// items: [{ label: string, value: string }]
export function renderIncludedPanel({ tierLabel, items = [], note = '' }) {
  return `<div class="included-panel">
    <div class="included-panel-head">
      <div class="included-panel-title">Included In ${tierLabel}</div>
      <span class="included-tier-pill">${tierLabel} Tier</span>
    </div>
    <div class="included-grid">
      ${items.map(item => `
        <div class="included-item">
          <div class="included-label">${item.label}</div>
          <div class="included-value">${item.value}</div>
        </div>
      `).join('')}
    </div>
    ${note ? `<div class="included-note">${note}</div>` : ''}
  </div>`;
}

// ── Numeric input field ──────────────────────────────────────
export function renderNumberField({ id, label, value, hint = '', disabled = false, placeholder = '', flagId = null }) {
  const inputAttrs = disabled
    ? `disabled placeholder="${placeholder}"`
    : `value="${value}"`;
  return `<div class="field-group">
    <label for="${id}">${label}</label>
    <input type="number" id="${id}" min="0" ${inputAttrs} class="field-input">
    ${hint ? `<div class="field-hint">${hint}</div>` : ''}
    ${flagId ? `<div id="${flagId}"></div>` : ''}
  </div>`;
}

// ── Two-column row ────────────────────────────────────────────
export function renderRow2(left, right) {
  return `<div class="row2">${left}${right}</div>`;
}

// ── Toggle (on/off switch) row ────────────────────────────────
// status: 'included' | 'addon' | 'unavailable'
export function renderToggleRow({ id, label, priceLabel = '', status = 'addon', checked = false }) {
  const isIncluded = status === 'included';
  const isUnavailable = status === 'unavailable';
  const isDisabled = isIncluded || isUnavailable;

  const badge = isIncluded
    ? `<span class="tag-included">INCLUDED</span>`
    : isUnavailable
      ? `<span class="tag-unavailable">N/A</span>`
      : priceLabel
        ? `<span class="price">${priceLabel}</span>`
        : '';

  return `<div class="toggle-row ${isUnavailable ? 'muted' : ''}">
    <span class="toggle-label">${label} ${badge}</span>
    <label class="switch">
      <input type="checkbox" id="${id}"
        ${checked && !isDisabled ? 'checked' : ''}
        ${isDisabled ? 'disabled' : ''}>
      <span class="slider"></span>
    </label>
  </div>`;
}

// ── Radio-style button group ──────────────────────────────────
export function renderRadioGroup({ name, options, currentValue }) {
  return `<div class="radio-group" data-radio-group="${name}">
    ${options.map(o => `
      <button class="radio-opt ${o.value === currentValue ? 'active' : ''}"
              data-radio="${name}" data-value="${o.value}">
        ${o.label}
      </button>`).join('')}
  </div>`;
}

// ── Section heading ───────────────────────────────────────────
export function renderSection(label) {
  return `<div class="section-title">${label}</div>`;
}

// ── Add-ons wrapper ───────────────────────────────────────────
export function renderAddonsSection(inner) {
  return `<div class="addons-section">
    <div class="section-title">Add-ons</div>
    ${inner}
  </div>`;
}

// ── Inline banners ────────────────────────────────────────────
export function renderContactSalesBanner(message) {
  return `<div class="contact-sales">📞 ${message}</div>`;
}

export function renderWarnBanner(message) {
  return `<div class="warn-banner"><span class="warn-icon">⚠</span><span>${message}</span></div>`;
}

// ── Convenience event binders (used inside module mount()) ────
export function bindNum(id, callback, min = 0) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', e => callback(Math.max(min, parseInt(e.target.value) || 0)));
}

export function bindToggle(id, callback) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', e => callback(e.target.checked));
}

export function bindRadio(name, callback) {
  document.querySelectorAll(`[data-radio="${name}"]`).forEach(el => {
    el.addEventListener('click', () => callback(el.dataset.value));
  });
}

export function bindTier(moduleId, callback) {
  document.querySelectorAll(`[data-module="${moduleId}"][data-tier]`).forEach(btn => {
    btn.addEventListener('click', () => callback(btn.dataset.tier));
  });
}
