// Unit tests — engine.js + state.js
import { describe, it, expect, beforeEach } from 'vitest';
import { calculate } from '../../js/core/engine.js';

// Minimal AppState stub — mirrors the real shape without DOM/side effects
function makeState(activeModules = [], moduleStates = {}, billing = 'annual', discount = null) {
  return {
    billing,
    discount,
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

// ── Discount preset tests ─────────────────────────────────────────────────────

describe('engine — discount output fields (no discount)', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('discountPreset is null when no discount id set', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }));
    expect(out.discountPreset).toBeNull();
  });

  it('discountAmount is 0 when no discount', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }));
    expect(out.discountAmount).toBe(0);
  });

  it('discountedBase equals baseTotal when no discount', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }));
    expect(out.discountedBase).toBe(out.baseTotal);
  });
});

describe('engine — 10% discount (Sampath preset) on XM Basic ($50)', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('discountPreset id matches', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'sampath'));
    expect(out.discountPreset).not.toBeNull();
    expect(out.discountPreset.id).toBe('sampath');
  });

  it('discountAmount is 10% of baseTotal ($5)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'sampath'));
    expect(out.discountAmount).toBe(5);        // 10% of $50
  });

  it('discountedBase is $45', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'sampath'));
    expect(out.discountedBase).toBe(45);
  });

  it('billedTotal equals discountedBase for annual (no surcharge)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'sampath'));
    expect(out.billedTotal).toBe(45);
  });
});

describe('engine — 25% discount (Pilot preset)', () => {
  const xmState = {
    tier: 'standard', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('discountAmount is 25% of baseTotal ($250 → $62.50)', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'pilot'));
    expect(out.baseTotal).toBe(250);
    expect(out.discountAmount).toBe(62.5);
    expect(out.discountedBase).toBe(187.5);
    expect(out.billedTotal).toBe(187.5);
  });
});

describe('engine — 15% discount (Partner preset)', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('discountAmount is 15% of $50 = $7.50', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'partner'));
    expect(out.discountAmount).toBe(7.5);
    expect(out.discountedBase).toBe(42.5);
    expect(out.billedTotal).toBe(42.5);
  });
});

describe('engine — discount + billing surcharge compound', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('Pilot (25%) + monthly surcharge (+10%): $50 → $45 discounted wait, $50 × 0.75 = $37.50 → × 1.1 = $41.25', () => {
    // XM Basic = $50
    // Pilot 25% off → $37.50 discounted base
    // Monthly ×1.1 → $41.25 billed
    const out = calculate(makeState(['xm'], { xm: xmState }, 'monthly', 'pilot'));
    expect(out.baseTotal).toBe(50);
    expect(out.discountAmount).toBe(12.5);
    expect(out.discountedBase).toBe(37.5);
    expect(out.billedTotal).toBeCloseTo(41.25, 5);
  });

  it('Sampath (10%) + quarterly surcharge (+7.5%): $50 × 0.9 = $45 → × 1.075 = $48.38', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'quarterly', 'sampath'));
    expect(out.discountedBase).toBe(45);
    expect(out.billedTotal).toBeCloseTo(48.38, 2);
  });
});

describe('engine — discount suppressed when contact-sales module present', () => {
  it('discountPreset is null even if discount id is set', () => {
    const ormState = {
      packageType: 'admin', adminTier: 'basic', adminLocations: 100000,
      nonAdminTier: 'basic', nonAdminLocations: 1,
      competitorOn: false, competitorLocationChannels: 0,
      ticketOn: false, users: 2,
    };
    const out = calculate(makeState(['orm'], { orm: ormState }, 'annual', 'pilot'));
    expect(out.hasAnyContactSales).toBe(true);
    expect(out.discountPreset).toBeNull();
    expect(out.discountAmount).toBe(0);
  });

  it('discount suppressed even when mixed (contact-sales + normal module)', () => {
    const ormState = {
      packageType: 'admin', adminTier: 'basic', adminLocations: 100000,
      nonAdminTier: 'basic', nonAdminLocations: 1,
      competitorOn: false, competitorLocationChannels: 0,
      ticketOn: false, users: 2,
    };
    const xmState = {
      tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
      brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
    };
    const out = calculate(makeState(['orm', 'xm'], { orm: ormState, xm: xmState }, 'annual', 'sampath'));
    expect(out.hasAnyContactSales).toBe(true);
    expect(out.discountPreset).toBeNull();
  });
});

describe('engine — unknown discount id falls back gracefully', () => {
  const xmState = {
    tier: 'basic', touchpoints: 5, sensors: 1, dashboards: 1,
    brandOn: false, brandCount: 1, emosightOn: false, domainOn: false, users: 5,
  };

  it('unknown id → discountPreset null, no discount applied', () => {
    const out = calculate(makeState(['xm'], { xm: xmState }, 'annual', 'nonexistent-code'));
    expect(out.discountPreset).toBeNull();
    expect(out.discountAmount).toBe(0);
    expect(out.discountedBase).toBe(out.baseTotal);
  });
});
