import {
  getActivePricingConfig,
  getDefaultPricingConfig,
  savePricingConfig,
  clearPricingConfig,
} from '../config/pricing.js';

const sectionsEl = document.getElementById('config-sections');
const statusEl = document.getElementById('admin-status');
const importInput = document.getElementById('import-config-file');

let configState = getActivePricingConfig();

const SECTION_ORDER = [
  'BILLING_CYCLES',
  'TOUCHPOINT_SLABS',
  'TOUCHPOINT_OVER_200_RATE',
  'ENTERPRISE_TOUCHPOINT_SLABS',
  'ORM_LOCATION_SLABS',
  'TIERS',
  'PRICES',
];

function titleize(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
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
  for (let i = 0; i < path.length - 1; i += 1) {
    node = node[path[i]];
  }
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

function renderPrimitiveField(path, key, value) {
  const token = pathToken(path);
  if (typeof value === 'boolean') {
    return `<label class="admin-field">
      <span class="admin-field-label">${escapeHtml(titleize(key))}</span>
      <select data-path="${token}" data-type="boolean" class="admin-input">
        <option value="true" ${value ? 'selected' : ''}>true</option>
        <option value="false" ${!value ? 'selected' : ''}>false</option>
      </select>
    </label>`;
  }

  if (typeof value === 'number') {
    return `<label class="admin-field">
      <span class="admin-field-label">${escapeHtml(titleize(key))}</span>
      <input type="number" step="any" value="${value}" data-path="${token}" data-type="number" class="admin-input">
    </label>`;
  }

  const textValue = escapeHtml(value ?? '');
  const useTextArea = String(value ?? '').length > 80;
  if (useTextArea) {
    return `<label class="admin-field">
      <span class="admin-field-label">${escapeHtml(titleize(key))}</span>
      <textarea data-path="${token}" data-type="string" class="admin-input admin-textarea">${textValue}</textarea>
    </label>`;
  }

  return `<label class="admin-field">
    <span class="admin-field-label">${escapeHtml(titleize(key))}</span>
    <input type="text" value="${textValue}" data-path="${token}" data-type="string" class="admin-input">
  </label>`;
}

function renderNode(path, key, value, depth = 0) {
  const title = titleize(key);

  if (Array.isArray(value)) {
    return `<div class="admin-node admin-array depth-${depth}">
      <div class="admin-node-head">${escapeHtml(title)}</div>
      <div class="admin-array-items">
        ${value.map((item, idx) => `
          <div class="admin-array-item">
            <div class="admin-array-index">Item ${idx + 1}</div>
            ${renderNode([...path, idx], `${key}_${idx}`, item, depth + 1)}
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  if (value !== null && typeof value === 'object') {
    return `<div class="admin-node admin-object depth-${depth}">
      <div class="admin-node-head">${escapeHtml(title)}</div>
      <div class="admin-node-body">
        ${Object.entries(value).map(([childKey, childVal]) =>
          renderNode([...path, childKey], childKey, childVal, depth + 1)
        ).join('')}
      </div>
    </div>`;
  }

  return renderPrimitiveField(path, key, value);
}

function renderConfig() {
  sectionsEl.innerHTML = SECTION_ORDER
    .filter(section => section in configState)
    .map(section => `
      <section class="card admin-card">
        <div class="card-header admin-card-header">
          <h2>${escapeHtml(titleize(section))}</h2>
        </div>
        <div class="card-body admin-card-body">
          ${renderNode([section], section, configState[section], 0)}
        </div>
      </section>
    `).join('');

  bindFieldEvents();
}

function bindFieldEvents() {
  sectionsEl.querySelectorAll('[data-path]').forEach(el => {
    const eventName = el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      const path = JSON.parse(decodeURIComponent(el.dataset.path));
      const type = el.dataset.type;
      const next = parseTypedValue(el.value, type);
      writeAtPath(configState, path, next);
    });
  });
}

function setStatus(message, mode = 'info') {
  statusEl.textContent = message;
  statusEl.className = `admin-status ${mode}`;
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
    setStatus('Configuration saved. Reload calculator page to apply changes.', 'success');
  });

  document.getElementById('reset-config-btn').addEventListener('click', () => {
    const confirmed = window.confirm('Reset all pricing config values to defaults?');
    if (!confirmed) return;

    clearPricingConfig();
    configState = getDefaultPricingConfig();
    renderConfig();
    setStatus('Defaults restored. Save to persist, then reload calculator.', 'warn');
  });

  document.getElementById('export-config-btn').addEventListener('click', () => {
    downloadJson('emojot-pricing-config.json', configState);
    setStatus('Configuration exported.', 'info');
  });

  document.getElementById('import-config-btn').addEventListener('click', () => {
    importInput.value = '';
    importInput.click();
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
      configState = parsed;
      renderConfig();
      setStatus('Configuration imported. Review and click Save.', 'success');
    } catch (_) {
      setStatus('Import failed. Please provide a valid JSON config file.', 'error');
    }
  });
}

renderConfig();
bindToolbar();
setStatus('Edit values by section, then click Save.', 'info');
