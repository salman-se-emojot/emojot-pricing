// Unit tests — engine.js + state.js
import { describe, it, expect, beforeEach } from 'vitest';
import { calculate } from '../../js/core/engine.js';

// Minimal AppState stub — mirrors the real shape without DOM/side effects
function makeState(activeModules = [], moduleStates = {}, billing = 'annual') {
  return {
    billing,
    activeModules,
    moduleStates,
    getModule(id) { return this.moduleStates[id]; },
  };
}

describe('engine — no active modules', () => {
  it('returns empty results, zero totals', () => {
    const out = calculate(makeState());
    expect(out.results).toHaveLength(0);
    expect(out.baseTotal).toBe(0);
    expect(out.billedTotal).toBe(0);
    expect(out.hasAnyContactSales).toBe(false);
    expect(out.isUXI).toBe(false);
  });
});

describe('engine — single module (XM Basic)', () => {
  it('calculates XM basic correctly and wraps in result', () => {
    const xmState = {
      tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
      brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
    };
    const out = calculate(makeState(['xm'], { xm: xmState }));
    expect(out.results).toHaveLength(1);
    expect(out.results[0].moduleId).toBe('xm');
    expect(out.baseTotal).toBe(50);
    expect(out.billedTotal).toBe(50);  // annual → ×1.0
    expect(out.isUXI).toBe(false);
  });
});

describe('engine — billing cycle multipliers', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('annual: no surcharge (×1.0)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual'));
    expect(out.billedTotal).toBeCloseTo(50, 5);
  });

  it('quarterly: +7.5% surcharge (×1.075)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'quarterly'));
    expect(out.billedTotal).toBeCloseTo(53.75, 5);
  });

  it('monthly: +10% surcharge (×1.1)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'monthly'));
    expect(out.billedTotal).toBeCloseTo(55, 5);
  });
});

describe('engine — multiple modules (UXI)', () => {
  it('marks isUXI when 2+ modules active', () => {
    const xmState = {
      tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
      brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
    };
    const sltState = {
      tier: 'basic', keywords: 5, mentions: 10000, profiles: 30,
      flaggingOn: false, youtubeOn: false, users: 5,
    };
    const out = calculate(makeState(['xm', 'slt'], { xm: xmState, slt: sltState }));
    expect(out.results).toHaveLength(2);
    expect(out.baseTotal).toBe(180);     // $50 XM + $130 SLT
    expect(out.isUXI).toBe(true);
  });
});

describe('engine — contact sales handling', () => {
  it('hasAnyContactSales is true when any module triggers it', () => {
    const ormState = {
      packageType: 'admin', adminTier: 'basic', adminLocations: 100000,
      nonAdminTier: 'basic', nonAdminLocations: 1,
      competitorOn: false, competitorLocationChannels: 0,
      ticketOn: false, users: 2,
    };
    const out = calculate(makeState(['orm'], { orm: ormState }));
    expect(out.hasAnyContactSales).toBe(true);
    expect(out.baseTotal).toBe(0);       // contact-sales modules excluded from total
  });

  it('contact-sales module excluded from baseTotal but normal modules included', () => {
    const ormState = {
      packageType: 'admin', adminTier: 'basic', adminLocations: 100000,
      nonAdminTier: 'basic', nonAdminLocations: 1,
      competitorOn: false, competitorLocationChannels: 0,
      ticketOn: false, users: 2,
    };
    const sltState = {
      tier: 'basic', keywords: 5, mentions: 10000, profiles: 30,
      flaggingOn: false, youtubeOn: false, users: 5,
    };
    const out = calculate(makeState(['orm', 'slt'], { orm: ormState, slt: sltState }));
    expect(out.hasAnyContactSales).toBe(true);
    expect(out.baseTotal).toBe(130);     // only SLT counted
  });
});
