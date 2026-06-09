// Unit tests — pricing config: slab tables, tier structure, billing cycles
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRICING_CONFIG,
  TIERS, PRICES, BILLING_CYCLES,
  TOUCHPOINT_SLABS, ENTERPRISE_TOUCHPOINT_SLABS,
  ORM_ADMIN_CONNECT_SLABS, ORM_NON_ADMIN_CONNECT_SLABS,
} from '../../js/config/pricing.js';

describe('Billing cycles', () => {
  it('annual has multiplier 1.0 (no surcharge)', () => {
    expect(BILLING_CYCLES.annual.multiplier).toBe(1.0);
    expect(BILLING_CYCLES.annual.surchargePct).toBe(0);
  });

  it('quarterly has +7.5% multiplier', () => {
    expect(BILLING_CYCLES.quarterly.multiplier).toBe(1.075);
    expect(BILLING_CYCLES.quarterly.surchargePct).toBe(7.5);
  });

  it('monthly has +10% multiplier', () => {
    expect(BILLING_CYCLES.monthly.multiplier).toBe(1.1);
    expect(BILLING_CYCLES.monthly.surchargePct).toBe(10);
  });
});

describe('XM Touchpoint slabs — monotonically decreasing rates', () => {
  it('rates decrease as volume increases', () => {
    const rates = TOUCHPOINT_SLABS.map(s => s.rate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
    }
  });

  it('slabs cover at least 1 node', () => {
    expect(TOUCHPOINT_SLABS[0].max).toBeGreaterThanOrEqual(1);
  });
});

describe('ORM Admin Connect slabs — monotonically decreasing rates', () => {
  it('rates decrease as volume increases', () => {
    const rates = ORM_ADMIN_CONNECT_SLABS.map(s => s.rate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
    }
  });

  it('starts at $25/loc for single location', () => {
    expect(ORM_ADMIN_CONNECT_SLABS[0]).toEqual({ max: 1, rate: 25 });
  });
});

describe('ORM Non-Admin Connect slabs — monotonically decreasing rates', () => {
  it('rates decrease as volume increases', () => {
    const rates = ORM_NON_ADMIN_CONNECT_SLABS.map(s => s.rate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
    }
  });

  it('starts at $150/loc for single location', () => {
    expect(ORM_NON_ADMIN_CONNECT_SLABS[0]).toEqual({ max: 1, rate: 150 });
  });
});

describe('ORM tier structure integrity', () => {
  const adminTiers = TIERS.orm.admin;
  const nonAdminTiers = TIERS.orm.nonAdmin;

  it('Admin Connect has basic / standard / enterprise', () => {
    expect(Object.keys(adminTiers)).toEqual(['basic', 'standard', 'enterprise']);
  });

  it('Non-Admin Connect has basic / standard / enterprise', () => {
    expect(Object.keys(nonAdminTiers)).toEqual(['basic', 'standard', 'enterprise']);
  });

  it('Admin tier prices: $50 / $250 / $500', () => {
    expect(adminTiers.basic.base).toBe(50);
    expect(adminTiers.standard.base).toBe(250);
    expect(adminTiers.enterprise.base).toBe(500);
  });

  it('Non-Admin tier prices: $150 / $350 / $1250', () => {
    expect(nonAdminTiers.basic.base).toBe(150);
    expect(nonAdminTiers.standard.base).toBe(350);
    expect(nonAdminTiers.enterprise.base).toBe(1250);
  });

  it('Admin Basic has competitor: unavailable', () => {
    expect(adminTiers.basic.competitor).toBe('unavailable');
  });

  it('Admin Standard has competitor: addon', () => {
    expect(adminTiers.standard.competitor).toBe('addon');
  });

  it('Admin Enterprise has competitor: included with 3 free channels', () => {
    expect(adminTiers.enterprise.competitor).toBe('included');
    expect(adminTiers.enterprise.competitorChannelsIncluded).toBe(3);
  });

  it('every admin tier has required fields', () => {
    for (const tier of Object.values(adminTiers)) {
      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('label');
      expect(tier).toHaveProperty('base');
      expect(tier).toHaveProperty('locations');
      expect(tier).toHaveProperty('users');
      expect(tier).toHaveProperty('competitor');
      expect(tier).toHaveProperty('ticket');
    }
  });

  it('every non-admin tier has required fields', () => {
    for (const tier of Object.values(nonAdminTiers)) {
      expect(tier).toHaveProperty('users');
      expect(tier).toHaveProperty('competitor');
      expect(tier).toHaveProperty('ticket');
    }
  });
});

describe('XM tier structure integrity', () => {
  it('XM has basic / standard / enterprise', () => {
    expect(Object.keys(TIERS.xm)).toEqual(['basic', 'standard', 'enterprise']);
  });

  it('XM base prices: $50 / $250 / $1000', () => {
    expect(TIERS.xm.basic.base).toBe(50);
    expect(TIERS.xm.standard.base).toBe(250);
    expect(TIERS.xm.enterprise.base).toBe(1000);
  });
});

describe('SLT tier structure integrity', () => {
  it('SLT has basic / standard / enterprise', () => {
    expect(Object.keys(TIERS.slt)).toEqual(['basic', 'standard', 'enterprise']);
  });

  it('SLT base prices: $130 / $225 / $600', () => {
    expect(TIERS.slt.basic.base).toBe(130);
    expect(TIERS.slt.standard.base).toBe(225);
    expect(TIERS.slt.enterprise.base).toBe(600);
  });

  it('SLT Enterprise includes flagging', () => {
    expect(TIERS.slt.enterprise.flagging).toBe('included');
  });
});

describe('Add-on unit prices', () => {
  it('sensor = $50', () => expect(PRICES.sensor).toBe(50));
  it('dashboard = $20', () => expect(PRICES.dashboard).toBe(20));
  it('user = $2', () => expect(PRICES.user).toBe(2));
  it('emosight = $30', () => expect(PRICES.emosight).toBe(30));
  it('brand = $10', () => expect(PRICES.brand).toBe(10));
  it('domainWhitelist = $30', () => expect(PRICES.domainWhitelist).toBe(30));
  it('ormCompetitorPerLocationChannel = $25', () => expect(PRICES.ormCompetitorPerLocationChannel).toBe(25));
  it('ormTicketBasic = $50', () => expect(PRICES.ormTicketBasic).toBe(50));
  it('sltKeyword = $15', () => expect(PRICES.sltKeyword).toBe(15));
  it('sltMentionBlock = $12', () => expect(PRICES.sltMentionBlock).toBe(12));
  it('sltProfileBlock = $15', () => expect(PRICES.sltProfileBlock).toBe(15));
  it('sltFlagging = $50', () => expect(PRICES.sltFlagging).toBe(50));
  it('sltYoutube = $50', () => expect(PRICES.sltYoutube).toBe(50));
});
