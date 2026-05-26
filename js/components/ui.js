// Shared UI rendering primitives.
// All functions return HTML strings. After insertion, call bindEvents.

const TIER_FEATURE_LABELS = {
  touchpoints: 'Touchpoints',
  sensors: 'Sensors',
  dashboards: 'Dashboards',
  workflows: 'Workflows',
  locations: 'Locations',
  keywords: 'Keywords',
  mentions: 'Mentions',
  profiles: 'Profiles',
  users: 'Users',
  brand: 'Brand Personalization',
  emosight: 'Emosight AI',
  flagging: 'Mention Flagging',
  competitor: 'Competitor Analysis',
  ticket: 'Ticket Management',
};

const TIER_FEATURE_PRIORITY = [
  'touchpoints',
  'locations',
  'keywords',
  'mentions',
  'profiles',
  'sensors',
  'workflows',
  'dashboards',
  'users',
  'brand',
  'emosight',
  'flagging',
  'competitor',
  'ticket',
];

function normalizeTierFeatureValue(key, value, tier = {}) {
  if (key === 'competitor' && value === 'included' && tier.competitorChannelsIncluded) {
    return `${tier.competitorChannelsIncluded} included`;
  }
  if (value === 'included') return 'Included';
  if (value === 'addon') return 'Add-on';
  if (value === 'unavailable') return 'Not available';
  if (typeof value === 'number') {
    if (key === 'mentions') return value.toLocaleString();
    return String(value);
  }
  return String(value);
}

function tierHighlights(tier) {
  const keys = TIER_FEATURE_PRIORITY.filter(key => key in tier);
  return keys.slice(0, 7).map(key => {
    const label = TIER_FEATURE_LABELS[key] ?? key;
    const value = normalizeTierFeatureValue(key, tier[key], tier);
    return `${label}: ${value}`;
  });
}

// ── Tier selector ────────────────────────────────────────────
export function renderTierSelector(moduleId, tiers, currentTierId) {
  const tierValues = Object.values(tiers);
  const hasStandardTier = tierValues.some(tier => tier.id === 'standard');

  return `<div class="tier-selector">
    ${tierValues.map(tier => {
      const active = tier.id === currentTierId;
      const highlightList = tierHighlights(tier);
      const isRecommended = hasStandardTier ? tier.id === 'standard' : false;

      return `
      <button class="tier-btn ${active ? 'active' : ''} ${isRecommended ? 'recommended' : ''}"
              data-module="${moduleId}" data-tier="${tier.id}">
        <div class="tier-head">
          <span class="tier-name">${tier.label}</span>
          ${isRecommended ? '<span class="tier-chip">Most popular</span>' : ''}
        </div>
        <span class="tier-price">$${tier.base.toLocaleString()}<span class="tier-price-mo">/mo</span></span>
        <span class="tier-billing-note">Base package</span>
        <ul class="tier-feature-list">
          ${highlightList.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <span class="tier-cta">${active ? 'Selected' : 'Choose plan'}</span>
      </button>`;
    }).join('')}
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
