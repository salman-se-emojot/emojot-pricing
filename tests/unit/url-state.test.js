// Unit tests — js/core/url-state.js
import { describe, it, expect, beforeAll } from 'vitest';
import { serializeState, deserializeState } from '../../js/core/url-state.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAppState({ billing = 'annual', discount = null, modules = [] } = {}) {
  const moduleStates = Object.fromEntries(modules.map(([id, s]) => [id, s]));
  return {
    billing,
    discount,
    activeModules: modules.map(([id]) => id),
    getModule(id) { return moduleStates[id]; },
  };
}

const XM_DEFAULTS = {
  tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
  brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
};

const CCM_DEFAULTS = {
  tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1, workflows: 1,
  brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
};

const ORM_DEFAULTS = {
  packageType: 'admin', adminTier: 'basic', adminLocations: 5,
  nonAdminTier: 'basic', nonAdminLocations: 1,
  competitorOn: false, competitorLocationChannels: 0,
  ticketOn: false, users: 2,
};

const SLT_DEFAULTS = {
  tier: 'basic', keywords: 5, mentions: 10000, profiles: 30,
  flaggingOn: false, youtubeOn: false, users: 5,
};

// ── deserializeState — empty / invalid inputs ─────────────────────────────────
describe('deserializeState — empty / invalid', () => {
  it('returns null for empty string', () => {
    expect(deserializeState('')).toBeNull();
  });

  it('returns null for bare "#"', () => {
    expect(deserializeState('#')).toBeNull();
  });

  it('returns null when mods key is missing', () => {
    expect(deserializeState('#bil=a')).toBeNull();
  });

  it('returns null when mods is empty', () => {
    expect(deserializeState('#bil=a&mods=')).toBeNull();
  });

  it('strips leading # before parsing', () => {
    const r = deserializeState('#bil=a&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5');
    expect(r).not.toBeNull();
  });
});

// ── serializeState — billing shorthand ───────────────────────────────────────
describe('serializeState — billing encoding', () => {
  const state = makeAppState({ billing: 'annual' });

  it('encodes annual as "a"', () => {
    expect(serializeState(makeAppState({ billing: 'annual' }))).toContain('bil=a');
  });

  it('encodes quarterly as "q"', () => {
    expect(serializeState(makeAppState({ billing: 'quarterly' }))).toContain('bil=q');
  });

  it('encodes monthly as "m"', () => {
    expect(serializeState(makeAppState({ billing: 'monthly' }))).toContain('bil=m');
  });
});

// ── deserializeState — billing decoding ──────────────────────────────────────
describe('deserializeState — billing decoding', () => {
  function hashWithBilling(b) {
    return `#bil=${b}&mods=xm&xm_t=basic&xm_tp=5&xm_se=1&xm_db=1&xm_br=0&xm_brc=1&xm_em=0&xm_do=0&xm_us=5`;
  }

  it('decodes "a" → annual', () => {
    expect(deserializeState(hashWithBilling('a')).billing).toBe('annual');
  });

  it('decodes "q" → quarterly', () => {
    expect(deserializeState(hashWithBilling('q')).billing).toBe('quarterly');
  });

  it('decodes "m" → monthly', () => {
    expect(deserializeState(hashWithBilling('m')).billing).toBe('monthly');
  });

  it('unknown billing code returns null', () => {
    // billing key can be null; the caller falls back to default
    const r = deserializeState(hashWithBilling('z'));
    expect(r.billing).toBeNull();
  });
});

// ── Round-trip: XM ────────────────────────────────────────────────────────────
describe('round-trip — XM module', () => {
  const original = { tier: 'standard', touchpoints: 30, sensors: 2, dashboards: 3,
    brandOn: true, brandCount: 4, emosightOn: false, domainOn: true, users: 12 };

  function roundTrip(state) {
    const appState = makeAppState({ billing: 'quarterly', modules: [['xm', state]] });
    const hash = serializeState(appState);
    return deserializeState('#' + hash);
  }

  it('preserves tier', () => expect(roundTrip(original).moduleStates.xm.tier).toBe('standard'));
  it('preserves touchpoints', () => expect(roundTrip(original).moduleStates.xm.touchpoints).toBe(30));
  it('preserves sensors', () => expect(roundTrip(original).moduleStates.xm.sensors).toBe(2));
  it('preserves dashboards', () => expect(roundTrip(original).moduleStates.xm.dashboards).toBe(3));
  it('preserves brandOn (true)', () => expect(roundTrip(original).moduleStates.xm.brandOn).toBe(true));
  it('preserves brandCount', () => expect(roundTrip(original).moduleStates.xm.brandCount).toBe(4));
  it('preserves emosightOn (false)', () => expect(roundTrip(original).moduleStates.xm.emosightOn).toBe(false));
  it('preserves domainOn (true)', () => expect(roundTrip(original).moduleStates.xm.domainOn).toBe(true));
  it('preserves users', () => expect(roundTrip(original).moduleStates.xm.users).toBe(12));
  it('preserves billing', () => expect(roundTrip(original).billing).toBe('quarterly'));
});

// ── Round-trip: CCM ───────────────────────────────────────────────────────────
describe('round-trip — CCM module', () => {
  const original = { ...CCM_DEFAULTS, tier: 'enterprise', workflows: 3, touchpoints: 50 };

  function rt() {
    const appState = makeAppState({ modules: [['ccm', original]] });
    return deserializeState('#' + serializeState(appState)).moduleStates.ccm;
  }

  it('preserves CCM tier', () => expect(rt().tier).toBe('enterprise'));
  it('preserves CCM workflows', () => expect(rt().workflows).toBe(3));
  it('preserves CCM touchpoints', () => expect(rt().touchpoints).toBe(50));
});

// ── Round-trip: ORM ───────────────────────────────────────────────────────────
describe('round-trip — ORM module', () => {
  const original = {
    ...ORM_DEFAULTS,
    packageType: 'both', adminTier: 'standard', adminLocations: 15,
    nonAdminTier: 'standard', nonAdminLocations: 5,
    competitorOn: true, competitorLocationChannels: 3,
    ticketOn: false, users: 7,
  };

  function rt() {
    const appState = makeAppState({ modules: [['orm', original]] });
    return deserializeState('#' + serializeState(appState)).moduleStates.orm;
  }

  it('preserves packageType', () => expect(rt().packageType).toBe('both'));
  it('preserves adminTier', () => expect(rt().adminTier).toBe('standard'));
  it('preserves adminLocations', () => expect(rt().adminLocations).toBe(15));
  it('preserves nonAdminTier', () => expect(rt().nonAdminTier).toBe('standard'));
  it('preserves nonAdminLocations', () => expect(rt().nonAdminLocations).toBe(5));
  it('preserves competitorOn (true)', () => expect(rt().competitorOn).toBe(true));
  it('preserves competitorLocationChannels', () => expect(rt().competitorLocationChannels).toBe(3));
  it('preserves ticketOn (false)', () => expect(rt().ticketOn).toBe(false));
  it('preserves users', () => expect(rt().users).toBe(7));
});

// ── Round-trip: SLT ───────────────────────────────────────────────────────────
describe('round-trip — SLT module', () => {
  const original = {
    tier: 'enterprise', keywords: 20, mentions: 50000, profiles: 80,
    flaggingOn: true, youtubeOn: true, users: 20,
  };

  function rt() {
    const appState = makeAppState({ modules: [['slt', original]] });
    return deserializeState('#' + serializeState(appState)).moduleStates.slt;
  }

  it('preserves SLT tier', () => expect(rt().tier).toBe('enterprise'));
  it('preserves keywords', () => expect(rt().keywords).toBe(20));
  it('preserves mentions', () => expect(rt().mentions).toBe(50000));
  it('preserves profiles', () => expect(rt().profiles).toBe(80));
  it('preserves flaggingOn (true)', () => expect(rt().flaggingOn).toBe(true));
  it('preserves youtubeOn (true)', () => expect(rt().youtubeOn).toBe(true));
  it('preserves users', () => expect(rt().users).toBe(20));
});

// ── Multi-module ──────────────────────────────────────────────────────────────
describe('round-trip — multi-module', () => {
  const appState = makeAppState({
    billing: 'monthly',
    modules: [
      ['xm',  { ...XM_DEFAULTS,  tier: 'standard' }],
      ['ccm', { ...CCM_DEFAULTS, tier: 'enterprise' }],
      ['slt', { ...SLT_DEFAULTS, youtubeOn: true }],
    ],
  });

  let decoded;
  beforeAll(() => {
    const hash = serializeState(appState);
    decoded = deserializeState('#' + hash);
  });

  it('restores all three module IDs', () => {
    expect(decoded.moduleIds).toEqual(['xm', 'ccm', 'slt']);
  });

  it('restores XM tier', () => expect(decoded.moduleStates.xm.tier).toBe('standard'));
  it('restores CCM tier', () => expect(decoded.moduleStates.ccm.tier).toBe('enterprise'));
  it('restores SLT youtubeOn', () => expect(decoded.moduleStates.slt.youtubeOn).toBe(true));
  it('restores monthly billing', () => expect(decoded.billing).toBe('monthly'));
});

// ── Boolean edge cases ────────────────────────────────────────────────────────
describe('boolean encoding', () => {
  it('false boolean encodes as 0 and decodes back to false', () => {
    const s = makeAppState({ modules: [['xm', { ...XM_DEFAULTS, brandOn: false }]] });
    const r = deserializeState('#' + serializeState(s));
    expect(r.moduleStates.xm.brandOn).toBe(false);
  });

  it('true boolean encodes as 1 and decodes back to true', () => {
    const s = makeAppState({ modules: [['xm', { ...XM_DEFAULTS, brandOn: true }]] });
    const r = deserializeState('#' + serializeState(s));
    expect(r.moduleStates.xm.brandOn).toBe(true);
  });
});

// ── Missing keys get defaults ─────────────────────────────────────────────────
describe('deserializeState — missing keys fall back to defaults', () => {
  it('missing XM touchpoints defaults to 5', () => {
    // Hash has xm in mods but no xm_tp key
    const r = deserializeState('#bil=a&mods=xm&xm_t=basic');
    expect(r.moduleStates.xm.touchpoints).toBe(5);
  });

  it('missing XM brandOn defaults to false', () => {
    const r = deserializeState('#bil=a&mods=xm&xm_t=basic');
    expect(r.moduleStates.xm.brandOn).toBe(false);
  });
});

// ── Unknown module IDs are silently skipped ───────────────────────────────────
describe('deserializeState — unknown modules', () => {
  it('skips unknown module IDs without throwing', () => {
    const r = deserializeState('#bil=a&mods=xm,fakemod&xm_t=basic');
    expect(r.moduleIds).toContain('xm');
    expect(r.moduleIds).toContain('fakemod'); // still in list, just no state
    expect(r.moduleStates.fakemod).toBeUndefined();
  });
});

// ── Discount preset — serialization ──────────────────────────────────────────
describe('serializeState — discount encoding', () => {
  it('encodes discount id as disc param', () => {
    const s = makeAppState({ discount: 'pilot', modules: [['xm', XM_DEFAULTS]] });
    expect(serializeState(s)).toContain('disc=pilot');
  });

  it('encodes sampath discount', () => {
    const s = makeAppState({ discount: 'sampath', modules: [['xm', XM_DEFAULTS]] });
    expect(serializeState(s)).toContain('disc=sampath');
  });

  it('null discount omits disc param', () => {
    const s = makeAppState({ discount: null, modules: [['xm', XM_DEFAULTS]] });
    expect(serializeState(s)).not.toContain('disc=');
  });

  it('empty string discount omits disc param', () => {
    const s = makeAppState({ discount: '', modules: [['xm', XM_DEFAULTS]] });
    expect(serializeState(s)).not.toContain('disc=');
  });
});

// ── Discount preset — deserialization ────────────────────────────────────────
describe('deserializeState — discount decoding', () => {
  it('decodes disc=pilot → discount: "pilot"', () => {
    const r = deserializeState('#bil=a&disc=pilot&mods=xm&xm_t=basic');
    expect(r.discount).toBe('pilot');
  });

  it('decodes disc=sampath → discount: "sampath"', () => {
    const r = deserializeState('#bil=a&disc=sampath&mods=xm&xm_t=basic');
    expect(r.discount).toBe('sampath');
  });

  it('decodes disc=partner → discount: "partner"', () => {
    const r = deserializeState('#bil=a&disc=partner&mods=xm&xm_t=basic');
    expect(r.discount).toBe('partner');
  });

  it('missing disc param → discount: null', () => {
    const r = deserializeState('#bil=a&mods=xm&xm_t=basic');
    expect(r.discount).toBeNull();
  });
});

// ── Discount preset — full round-trip ────────────────────────────────────────
describe('round-trip — discount field', () => {
  it('pilot discount survives serialize → deserialize', () => {
    const s = makeAppState({ discount: 'pilot', modules: [['xm', XM_DEFAULTS]] });
    const r = deserializeState('#' + serializeState(s));
    expect(r.discount).toBe('pilot');
  });

  it('partner discount survives round-trip', () => {
    const s = makeAppState({ discount: 'partner', modules: [['slt', SLT_DEFAULTS]] });
    const r = deserializeState('#' + serializeState(s));
    expect(r.discount).toBe('partner');
  });

  it('null discount survives round-trip as null', () => {
    const s = makeAppState({ discount: null, modules: [['xm', XM_DEFAULTS]] });
    const r = deserializeState('#' + serializeState(s));
    expect(r.discount).toBeNull();
  });

  it('discount preserved alongside multi-module state', () => {
    const s = makeAppState({
      billing: 'monthly',
      discount: 'gimhani',
      modules: [
        ['xm',  { ...XM_DEFAULTS, tier: 'standard' }],
        ['slt', { ...SLT_DEFAULTS, youtubeOn: true }],
      ],
    });
    const r = deserializeState('#' + serializeState(s));
    expect(r.discount).toBe('gimhani');
    expect(r.billing).toBe('monthly');
    expect(r.moduleStates.xm.tier).toBe('standard');
    expect(r.moduleStates.slt.youtubeOn).toBe(true);
  });
});
