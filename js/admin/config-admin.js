import {
  getActivePricingConfig,
  getDefaultPricingConfig,
  savePricingConfig,
  clearPricingConfig,
} from '../config/pricing.js';

const sectionsEl = document.getElementById('config-sections');
const statusEl = document.getElementById('admin-status');
const importInput = document.getElementById('import-config-file');
const searchInput = document.getElementById('admin-search');

let configState = getActivePricingConfig();
const defaultConfig = getDefaultPricingConfig();

let searchQuery = '';
let isDirty = false;
let statusMessage = 'Use search or browse sections below. Save after editing.';
let statusMode = 'info';

const SECTION_ORDER = [
  'BILLING_CYCLES',
  'TOUCHPOINT_SLABS',
  'ENTERPRISE_TOUCHPOINT_SLABS',
  'ORM_ADMIN_CONNECT_SLABS',
  'ORM_NON_ADMIN_CONNECT_SLABS',
  'TIERS',
  'PRICES',
];

const SECTION_META = {
  BILLING_CYCLES: {
    title: 'Billing cycles',
    description: 'Controls monthly/quarterly/annual multipliers and customer-facing notes.',
  },
  TOUCHPOINT_SLABS: {
    title: 'Touchpoint slabs (basic/standard)',
    description: 'Rates used when touchpoints exceed included limits for XM/CCM non-enterprise tiers.',
  },
  ENTERPRISE_TOUCHPOINT_SLABS: {
    title: 'Touchpoint slabs (enterprise)',
    description: 'Excess-only touchpoint rates for enterprise tiers.',
  },
  ORM_ADMIN_CONNECT_SLABS: {
    title: 'ORM admin connect slabs',
    description: 'Location-based rates for ORM Admin Connect (Google + Facebook).',
  },
  ORM_NON_ADMIN_CONNECT_SLABS: {
    title: 'ORM non-admin connect slabs',
    description: 'Location-based rates for ORM Non-Admin Connect (all platforms).',
  },
  TIERS: {
    title: 'Tier definitions',
    description: 'Included limits and base package values shown in each module tier card.',
  },
  PRICES: {
    title: 'Add-on unit prices',
    description: 'Unit prices used in calculations when usage exceeds included limits.',
  },
};

const FIELD_HINTS = {
  label: 'Display label shown in the UI.',
  multiplier: 'Decimal multiplier applied to base monthly pricing.',
  surchargePct: 'Percentage shown in billing messaging.',
  note: 'Helper text shown under billing options.',
  max: 'Upper boundary for this slab.',
  rate: 'USD rate used for this slab.',
  base: 'Base package price per month (USD).',
  users: 'Included users before add-on charges apply.',
  touchpoints: 'Included touchpoints in this tier.',
  sensors: 'Included sensors in this tier.',
  dashboards: 'Included dashboards in this tier.',
  workflows: 'Included workflows in this tier.',
  keywords: 'Included keywords in this tier.',
  mentions: 'Included monthly mentions in this tier.',
  profiles: 'Included social profiles in this tier.',
  locations: 'Included ORM locations in this tier.',
};

function titleize(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pathToken(path) {
  return encodeURIComponent(JSON.stringify(path));
}

function readAtPath(obj, path) {
  return path.reduce((acc, k) => acc?.[k], obj);
}

function writeAtPath(obj, path, value) {
  if (!path.length) return;
  let node = obj;
  for (let i = 0; i < path.length - 1; i += 1) node = node[path[i]];
  node[path[path.length - 1]] = value;
}

function parseTypedValue(raw, type) {
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === 'boolean') {
    return raw === 'true';
  }
  return raw;
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase();
}

function countFields(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countFields(item), 0);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).reduce((sum, child) => sum + countFields(child), 0);
  }
  return 1;
}

function countChangedFields(value, path) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item, idx) => sum + countChangedFields(item, [...path, idx]), 0);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).reduce((sum, [k, child]) => sum + countChangedFields(child, [...path, k]), 0);
  }
  const defaultValue = readAtPath(defaultConfig, path);
  return defaultValue === value ? 0 : 1;
}

function nodeMatches(path, key, value, query) {
  if (!query) return true;

  const keyText = normalizeText(key);
  const pathText = normalizeText(path.join(' '));
  if (keyText.includes(query) || pathText.includes(query)) return true;

  if (Array.isArray(value)) {
    return value.some((item, idx) => nodeMatches([...path, idx], `${key}_${idx}`, item, query));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(([childKey, childValue]) =>
      nodeMatches([...path, childKey], childKey, childValue, query)
    );
  }

  return normalizeText(value).includes(query);
}

function getFieldHint(key) {
  return FIELD_HINTS[key] || '';
}

function renderPrimitiveField(path, key, value) {
  const token = pathToken(path);
  const defaultValue = readAtPath(defaultConfig, path);
  const isChanged = defaultValue !== value;
  const hint = getFieldHint(key);

  if (typeof value === 'boolean') {
    return `<label class="admin-field ${isChanged ? 'changed' : ''}">
      <span class="admin-field-label">${escapeHtml(titleize(key))} ${isChanged ? '<span class="admin-change-dot">Changed</span>' : ''}</span>
      <select data-path="${token}" data-type="boolean" class="admin-input">
        <option value="true" ${value ? 'selected' : ''}>true</option>
        <option value="false" ${!value ? 'selected' : ''}>false</option>
      </select>
      ${hint ? `<span class="admin-field-help">${escapeHtml(hint)}</span>` : ''}
    </label>`;
  }

  if (typeof value === 'number') {
    return `<label class="admin-field ${isChanged ? 'changed' : ''}">
      <span class="admin-field-label">${escapeHtml(titleize(key))} ${isChanged ? '<span class="admin-change-dot">Changed</span>' : ''}</span>
      <input type="number" step="any" value="${value}" data-path="${token}" data-type="number" class="admin-input">
      ${hint ? `<span class="admin-field-help">${escapeHtml(hint)}</span>` : ''}
    </label>`;
  }

  const textValue = escapeHtml(value ?? '');
  const useTextArea = String(value ?? '').length > 80;
  if (useTextArea) {
    return `<label class="admin-field ${isChanged ? 'changed' : ''}">
      <span class="admin-field-label">${escapeHtml(titleize(key))} ${isChanged ? '<span class="admin-change-dot">Changed</span>' : ''}</span>
      <textarea data-path="${token}" data-type="string" class="admin-input admin-textarea">${textValue}</textarea>
      ${hint ? `<span class="admin-field-help">${escapeHtml(hint)}</span>` : ''}
    </label>`;
  }

  return `<label class="admin-field ${isChanged ? 'changed' : ''}">
    <span class="admin-field-label">${escapeHtml(titleize(key))} ${isChanged ? '<span class="admin-change-dot">Changed</span>' : ''}</span>
    <input type="text" value="${textValue}" data-path="${token}" data-type="string" class="admin-input">
    ${hint ? `<span class="admin-field-help">${escapeHtml(hint)}</span>` : ''}
  </label>`;
}

function renderNode(path, key, value, depth = 0) {
  if (!nodeMatches(path, key, value, searchQuery)) return '';

  const title = titleize(key);

  if (Array.isArray(value)) {
    const children = value
      .map((item, idx) => renderNode([...path, idx], `Item ${idx + 1}`, item, depth + 1))
      .filter(Boolean)
      .join('');

    if (!children) return '';

    return `<details class="admin-node admin-array depth-${depth}" ${depth < 1 ? 'open' : ''}>
      <summary class="admin-node-head">
        <span>${escapeHtml(title)}</span>
        <span class="admin-node-meta">${value.length} items · ${countFields(value)} fields</span>
      </summary>
      <div class="admin-array-items">${children}</div>
    </details>`;
  }

  if (value !== null && typeof value === 'object') {
    const children = Object.entries(value)
      .map(([childKey, childValue]) => renderNode([...path, childKey], childKey, childValue, depth + 1))
      .filter(Boolean)
      .join('');

    if (!children) return '';

    return `<details class="admin-node admin-object depth-${depth}" ${depth < 1 ? 'open' : ''}>
      <summary class="admin-node-head">
        <span>${escapeHtml(title)}</span>
        <span class="admin-node-meta">${countFields(value)} fields</span>
      </summary>
      <div class="admin-node-body">${children}</div>
    </details>`;
  }

  return renderPrimitiveField(path, key, value);
}

function renderSection(section) {
  if (!(section in configState)) return '';

  const value = configState[section];
  if (!nodeMatches([section], section, value, searchQuery)) return '';

  const meta = SECTION_META[section] || {};
  const title = meta.title || titleize(section);
  const description = meta.description || 'Configuration values for this section.';
  const fieldCount = countFields(value);
  const changedCount = countChangedFields(value, [section]);

  const body = renderNode([section], section, value, 0);
  if (!body) return '';

  return `<section class="card admin-card">
    <div class="card-header admin-card-header">
      <h2>${escapeHtml(title)}</h2>
      <div class="admin-section-stats">
        <span>${fieldCount} fields</span>
        <span class="${changedCount > 0 ? 'warn' : 'ok'}">${changedCount} changed</span>
      </div>
    </div>
    <div class="card-body admin-card-body">
      <p class="admin-section-desc">${escapeHtml(description)}</p>
      ${body}
    </div>
  </section>`;
}

function bindFieldEvents() {
  sectionsEl.querySelectorAll('[data-path]').forEach(el => {
    const eventName = 'change';
    el.addEventListener(eventName, () => {
      const path = JSON.parse(decodeURIComponent(el.dataset.path));
      const type = el.dataset.type;
      const next = parseTypedValue(el.value, type);
      writeAtPath(configState, path, next);
      isDirty = true;
      setStatus('Changes not saved yet.', 'warn');
      renderConfig();
    });
  });
}

function renderConfig() {
  const html = SECTION_ORDER
    .map(section => renderSection(section))
    .filter(Boolean)
    .join('');

  sectionsEl.innerHTML = html || `<section class="card admin-card admin-empty-card">
    <div class="card-body admin-card-body">
      <p class="admin-empty-text">No matches found for "${escapeHtml(searchQuery)}". Try a different keyword.</p>
    </div>
  </section>`;

  bindFieldEvents();
}

function renderStatus() {
  const prefix = isDirty ? 'Unsaved changes. ' : '';
  statusEl.textContent = `${prefix}${statusMessage}`;
  statusEl.className = `admin-status ${isDirty ? 'warn' : statusMode}`;
}

function setStatus(message, mode = 'info') {
  statusMessage = message;
  statusMode = mode;
  renderStatus();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bindToolbar() {
  document.getElementById('save-config-btn').addEventListener('click', () => {
    const ok = savePricingConfig(configState);
    if (!ok) {
      setStatus('Unable to save configuration in this environment.', 'error');
      return;
    }
    isDirty = false;
    setStatus('Configuration saved. Reload calculator page to apply changes.', 'success');
  });

  document.getElementById('reset-config-btn').addEventListener('click', () => {
    const confirmed = window.confirm('Reset all pricing values to defaults?');
    if (!confirmed) return;

    clearPricingConfig();
    configState = getDefaultPricingConfig();
    isDirty = false;
    renderConfig();
    setStatus('Defaults restored from base configuration.', 'warn');
  });

  document.getElementById('export-config-btn').addEventListener('click', () => {
    downloadJson('emojot-pricing-config.json', configState);
    setStatus('Configuration exported as JSON.', 'info');
  });

  document.getElementById('import-config-btn').addEventListener('click', () => {
    importInput.value = '';
    importInput.click();
  });

  document.getElementById('expand-all-btn').addEventListener('click', () => {
    sectionsEl.querySelectorAll('details.admin-node').forEach(el => {
      el.open = true;
    });
    setStatus('All groups expanded.', 'info');
  });

  document.getElementById('collapse-all-btn').addEventListener('click', () => {
    sectionsEl.querySelectorAll('details.admin-node').forEach(el => {
      el.open = false;
    });
    setStatus('All groups collapsed.', 'info');
  });

  searchInput.addEventListener('input', () => {
    searchQuery = normalizeText(searchInput.value.trim());
    renderConfig();
    if (searchQuery) {
      setStatus(`Filtered results for "${searchInput.value.trim()}".`, 'info');
    } else {
      setStatus('Showing all sections.', 'info');
    }
  });

  importInput.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid config format');
      }

      configState = deepClone(parsed);
      isDirty = true;
      renderConfig();
      setStatus('Configuration imported. Review and click Save Config.', 'success');
    } catch (_) {
      setStatus('Import failed. Please upload a valid JSON config file.', 'error');
    }
  });
}

renderConfig();
bindToolbar();
renderStatus();
