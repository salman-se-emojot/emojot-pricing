// ============================================================
// PRICING CONFIGURATION — Single source of truth (USD only)
// Admin overrides are stored in localStorage and merged at load.
// ============================================================

export const PRICING_STORAGE_KEY = 'emojot_pricing_config_v1';

export const DEFAULT_PRICING_CONFIG = {
  BILLING_CYCLES: {
    annual:    { id: 'annual',    label: 'Annual',    multiplier: 1.000, surchargePct: 0,   note: 'Annual billing — no surcharge (base rate)' },
    quarterly: { id: 'quarterly', label: 'Quarterly', multiplier: 1.075, surchargePct: 7.5, note: 'Quarterly billing — +7.5% surcharge applied' },
    monthly:   { id: 'monthly',   label: 'Monthly',   multiplier: 1.100, surchargePct: 10,  note: 'Monthly billing — +10% surcharge applied' },
  },

  // XM Basic & Standard Touchpoint Slabs (all-nodes × rate)
  // Last band extends to cover any node count — no estimated flag needed.
  TOUCHPOINT_SLABS: [
    { max: 55,    rate: 10.00 },
    { max: 105,   rate: 5.00  },
    { max: 200,   rate: 2.50  },
    { max: 99999, rate: 2.00  },  // 201+ nodes — standard continuation rate
  ],

  // XM Enterprise Touchpoint Slabs (excess-only)
  ENTERPRISE_TOUCHPOINT_SLABS: [
    { max: 200,  rate: 2.00 },
    { max: 400,  rate: 1.50 },
    { max: 750,  rate: 1.25 },
    { max: 1500, rate: 1.00 },
    { max: 3000, rate: 0.75 },
    { max: 9999, rate: 0.50 },
  ],
  // ORM Admin Connect Location Slabs (all-nodes × rate)
  // Google + Facebook only — requires admin API access.
  ORM_ADMIN_CONNECT_SLABS: [
    { max: 1,     rate: 25.00 },
    { max: 10,    rate: 10.00 },
    { max: 30,    rate:  8.33 },
    { max: 50,    rate:  7.00 },
    { max: 100,   rate:  4.00 },
    { max: 150,   rate:  3.00 },
    { max: 200,   rate:  2.50 },
    { max: 99999, rate:  2.00 },  // 201+ — continue at last rate
  ],

  // ORM Non-Admin Connect Location Slabs (all-nodes × rate)
  // All review platforms (Google, Facebook, TripAdvisor, etc.) — no admin access needed.
  ORM_NON_ADMIN_CONNECT_SLABS: [
    { max: 1,     rate: 150.00 },
    { max: 3,     rate: 116.67 },
    { max: 15,    rate:  83.33 },
    { max: 30,    rate:  70.00 },
    { max: 50,    rate:  65.00 },
    { max: 100,   rate:  55.00 },
    { max: 150,   rate:  50.00 },
    { max: 200,   rate:  45.00 },
    { max: 99999, rate:  40.00 },  // 201+ — continue at last rate
  ],

  // Tier Definitions
  TIERS: {
    xm: {
      basic: {
        id: 'basic', label: 'Basic', base: 50,
        touchpoints: 5, sensors: 1, dashboards: 1, users: 5,
        brand: 'addon', emosight: 'addon', ticket: 'addon',
      },
      standard: {
        id: 'standard', label: 'Standard', base: 250,
        touchpoints: 25, sensors: 3, dashboards: 2, users: 25,
        brand: 'addon', emosight: 'included', ticket: 'addon',
      },
      enterprise: {
        id: 'enterprise', label: 'Enterprise', base: 1000,
        touchpoints: 100, sensors: 5, dashboards: 5, users: 100,
        brand: 'included', emosight: 'included', ticket: 'addon',
      },
    },

    orm: {
      admin: {
        basic:      { id: 'basic',       label: 'Basic',       base: 50,   locations: 5,   users: 2,  competitor: 'unavailable', ticket: 'addon'    },
        standard:   { id: 'standard',    label: 'Standard',    base: 250,  locations: 25,  users: 5,  competitor: 'addon',       ticket: 'included' },
        enterprise: { id: 'enterprise',  label: 'Enterprise',  base: 500,  locations: 100, users: 10, competitor: 'included',    competitorChannelsIncluded: 3, ticket: 'included' },
      },
      nonAdmin: {
        basic:      { id: 'basic',       label: 'Basic',       base: 150,  locations: 1,  users: 2,  competitor: 'unavailable', ticket: 'addon'    },
        standard:   { id: 'standard',    label: 'Standard',    base: 350,  locations: 3,  users: 5,  competitor: 'addon',       ticket: 'included' },
        enterprise: { id: 'enterprise',  label: 'Enterprise',  base: 1250, locations: 15, users: 10, competitor: 'included',    competitorChannelsIncluded: 3, ticket: 'included' },
      },
    },

    slt: {
      basic: {
        id: 'basic', label: 'Basic', base: 130,
        keywords: 5, mentions: 10000, profiles: 30, users: 5,
        flagging: 'addon',
      },
      standard: {
        id: 'standard', label: 'Standard', base: 225,
        keywords: 10, mentions: 20000, profiles: 50, users: 10,
        flagging: 'addon',
      },
      enterprise: {
        id: 'enterprise', label: 'Enterprise', base: 600,
        keywords: 25, mentions: 120000, profiles: 100, users: 25,
        flagging: 'included',
      },
    },
  },

  // Discount Presets — named, pre-approved percentage discounts (ADR 0002)
  // Applied to Base Total before the billing-cycle surcharge. Single selection only.
  DISCOUNTS: [
    { id: 'sampath', label: 'Sampath', rate: 0.10 },
    { id: 'anaz',    label: 'Anaz',    rate: 0.10 },
    { id: 'aqeel',   label: 'Aqeel',   rate: 0.10 },
    { id: 'gimhani', label: 'Gimhani', rate: 0.10 },
    { id: 'viraj',   label: 'Viraj',   rate: 0.10 },
    { id: 'partner', label: 'Partner', rate: 0.15 },
    { id: 'pilot',   label: 'Pilot',   rate: 0.25 },
  ],

  // Add-on Unit Prices (USD/month)
  PRICES: {
    sensor:              50,
    dashboard:           20,
    brand:               10,
    emosight:            30,
    user:                 2,
    domainWhitelist:     30,
    ormCompetitorPerLocationChannel: 25,
    ormTicketBasic:      50,
    xmTicket:            50,
    sltKeyword:          15,
    sltMentionBlock:     12,
    sltProfileBlock:     15,
    sltFlagging:         50,
    sltYoutube:          50,
  },
};

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override.map(item => deepClone(item)) : base.map(item => deepClone(item));
  }
  if (!isPlainObject(base)) {
    return override === undefined ? base : override;
  }

  const out = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(isPlainObject(override) ? override : {})]);
  for (const key of keys) {
    const baseVal = base[key];
    const overrideVal = isPlainObject(override) ? override[key] : undefined;

    if (overrideVal === undefined) {
      out[key] = deepClone(baseVal);
    } else if (isPlainObject(baseVal) || Array.isArray(baseVal)) {
      out[key] = deepMerge(baseVal, overrideVal);
    } else {
      out[key] = overrideVal;
    }
  }
  return out;
}

function readStoredConfig() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(PRICING_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function buildActiveConfig() {
  const stored = readStoredConfig();
  const defaults = deepClone(DEFAULT_PRICING_CONFIG);
  return stored ? deepMerge(defaults, stored) : defaults;
}

const ACTIVE_PRICING_CONFIG = buildActiveConfig();

export const BILLING_CYCLES = ACTIVE_PRICING_CONFIG.BILLING_CYCLES;
export const TOUCHPOINT_SLABS = ACTIVE_PRICING_CONFIG.TOUCHPOINT_SLABS;
export const ENTERPRISE_TOUCHPOINT_SLABS = ACTIVE_PRICING_CONFIG.ENTERPRISE_TOUCHPOINT_SLABS;
export const ORM_ADMIN_CONNECT_SLABS = ACTIVE_PRICING_CONFIG.ORM_ADMIN_CONNECT_SLABS;
export const ORM_NON_ADMIN_CONNECT_SLABS = ACTIVE_PRICING_CONFIG.ORM_NON_ADMIN_CONNECT_SLABS;
export const TIERS = ACTIVE_PRICING_CONFIG.TIERS;
export const PRICES = ACTIVE_PRICING_CONFIG.PRICES;
export const DISCOUNTS = ACTIVE_PRICING_CONFIG.DISCOUNTS;

export function getDefaultPricingConfig() {
  return deepClone(DEFAULT_PRICING_CONFIG);
}

export function getActivePricingConfig() {
  return deepClone(ACTIVE_PRICING_CONFIG);
}

export function savePricingConfig(nextConfig) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const merged = deepMerge(deepClone(DEFAULT_PRICING_CONFIG), nextConfig);
  window.localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(merged));
  return true;
}

export function clearPricingConfig() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  window.localStorage.removeItem(PRICING_STORAGE_KEY);
  return true;
}
