// Unit tests — ORM module calculate()
import { describe, it, expect } from 'vitest';
import { ormModule } from '../../js/modules/orm.js';

function state(overrides = {}) {
  return { ...ormModule.initialState(), ...overrides };
}

function calc(overrides = {}) {
  return ormModule.calculate(state(overrides));
}

// ── Admin Connect — base tiers ──────────────────────────────────────
describe('ORM — Admin Connect baseline', () => {
  it('Admin Basic: $50 base, 5 locations included → no excess', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', adminLocations: 5 });
    expect(r.subtotal).toBe(50);
    expect(r.hasContactSales).toBe(false);
    const baseLine = r.lines.find(l => l.label.includes('Admin Connect'));
    expect(baseLine.amount).toBe(50);
  });

  it('Admin Standard: $250 base, 25 locations included → no excess', () => {
    const r = calc({ packageType: 'admin', adminTier: 'standard', adminLocations: 25 });
    expect(r.subtotal).toBe(250);
  });

  it('Admin Premium: $500 base, 100 locations included → no excess', () => {
    const r = calc({ packageType: 'admin', adminTier: 'premium', adminLocations: 100 });
    expect(r.subtotal).toBe(500);
  });
});

// ── Admin Connect — slab-based excess (excess-only × rate) ──────────
describe('ORM — Admin Connect excess locations', () => {
  it('Basic: 10 total, 5 included → 5 excess × $10.00 = $50', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', adminLocations: 10 });
    const excess = r.lines.find(l => l.label.includes('excess'));
    expect(excess.amount).toBe(50);      // 5 excess × $10
    expect(r.subtotal).toBe(100);        // $50 + $50
  });

  it('Basic: 30 total, 5 included → 25 excess × $8.33 = $208.25', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', adminLocations: 30 });
    const excess = r.lines.find(l => l.label.includes('excess'));
    expect(excess.amount).toBeCloseTo(208.25, 2); // 25 × $8.33
  });

  it('Basic: 1 location (included = 5) → no excess', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', adminLocations: 1 });
    expect(r.lines.some(l => l.label.includes('excess'))).toBe(false);
    expect(r.subtotal).toBe(50);
  });

  it('Standard: 30 total, 25 included → 5 excess × $8.33 = $41.65', () => {
    const r = calc({ packageType: 'admin', adminTier: 'standard', adminLocations: 30 });
    const excess = r.lines.find(l => l.label.includes('excess'));
    expect(excess.amount).toBeCloseTo(41.65, 2);  // 5 × $8.33
    expect(r.subtotal).toBeCloseTo(291.65, 2);
  });
});

// ── Non-Admin Connect — base tiers ──────────────────────────────────
describe('ORM — Non-Admin Connect baseline', () => {
  it('Non-Admin Basic: $150 base, 1 location included → no excess', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'basic', nonAdminLocations: 1 });
    expect(r.subtotal).toBe(150);
    expect(r.hasContactSales).toBe(false);
  });

  it('Non-Admin Standard: $350 base, 3 locations included → no excess', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'standard', nonAdminLocations: 3 });
    expect(r.subtotal).toBe(350);
  });

  it('Non-Admin Premium: $1250 base, 15 locations included → no excess', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'premium', nonAdminLocations: 15 });
    expect(r.subtotal).toBe(1250);
  });
});

// ── Non-Admin Connect — slab-based excess ───────────────────────────
describe('ORM — Non-Admin Connect excess locations', () => {
  it('Basic: 3 total, 1 included → 2 excess × $116.67 = $233.34', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'basic', nonAdminLocations: 3 });
    const excess = r.lines.find(l => l.label.includes('excess'));
    expect(excess.amount).toBeCloseTo(233.34, 1); // 2 × $116.67
    expect(r.subtotal).toBeCloseTo(383.34, 1);
  });

  it('Standard: 15 total, 3 included → 12 excess × $83.33 = $999.96', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'standard', nonAdminLocations: 15 });
    const excess = r.lines.find(l => l.label.includes('excess'));
    expect(excess.amount).toBeCloseTo(999.96, 1); // 12 × $83.33
  });

  it('No excess when at included count', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'standard', nonAdminLocations: 3 });
    expect(r.lines.some(l => l.label.includes('excess'))).toBe(false);
    expect(r.subtotal).toBe(350);
  });
});

// ── Both packages ───────────────────────────────────────────────────
describe('ORM — Both Admin + Non-Admin', () => {
  it('sums both base prices with no excess', () => {
    const r = calc({
      packageType: 'both',
      adminTier: 'basic',      adminLocations: 5,
      nonAdminTier: 'basic',   nonAdminLocations: 1,
    });
    // Admin Basic $50 + Non-Admin Basic $150 = $200
    expect(r.subtotal).toBe(200);
    expect(r.lines.filter(l => l.amount != null).map(l => l.amount)).toContain(50);
    expect(r.lines.filter(l => l.amount != null).map(l => l.amount)).toContain(150);
  });

  it('excess on both sides is summed correctly', () => {
    const r = calc({
      packageType: 'both',
      adminTier: 'basic',      adminLocations: 10,   // 5 excess × $10 = $50
      nonAdminTier: 'basic',   nonAdminLocations: 3, // 2 excess × $116.67 = $233.34
    });
    expect(r.subtotal).toBeCloseTo(50 + 50 + 150 + 233.34, 1);
  });
});

// ── Add-ons — Competitor Analysis ───────────────────────────────────
describe('ORM — Competitor Analysis add-on', () => {
  it('unavailable on Admin Basic → not charged even if on', () => {
    // Admin Basic has competitor: 'unavailable'
    const r = calc({ packageType: 'admin', adminTier: 'basic', competitorOn: true, competitorLocationChannels: 5 });
    expect(r.lines.some(l => l.label.includes('ompetitor'))).toBe(false);
  });

  it('Admin Standard (addon): 3 location-channels × $25 = $75', () => {
    const r = calc({
      packageType: 'admin', adminTier: 'standard',
      competitorOn: true, competitorLocationChannels: 3,
    });
    const line = r.lines.find(l => l.label.includes('ompetitor'));
    expect(line.amount).toBe(75);        // 3 × $25
  });

  it('Admin Premium (included): not charged', () => {
    const r = calc({
      packageType: 'admin', adminTier: 'premium',
      competitorOn: true, competitorLocationChannels: 5,
    });
    expect(r.lines.some(l => l.label.includes('ompetitor'))).toBe(false);
  });

  it('competitorOn: false → not charged even when status is addon', () => {
    const r = calc({ packageType: 'admin', adminTier: 'standard', competitorOn: false });
    expect(r.lines.some(l => l.label.includes('ompetitor'))).toBe(false);
  });

  it('Non-Admin Standard: competitor addon → 4 channels × $25 = $100', () => {
    const r = calc({
      packageType: 'nonAdmin', nonAdminTier: 'standard',
      competitorOn: true, competitorLocationChannels: 4,
    });
    const line = r.lines.find(l => l.label.includes('ompetitor'));
    expect(line.amount).toBe(100);
  });
});

// ── Add-ons — Ticket Management ─────────────────────────────────────
describe('ORM — Ticket Management add-on', () => {
  it('Admin Basic (addon): ticketOn → $50', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', ticketOn: true });
    const line = r.lines.find(l => l.label.includes('icket'));
    expect(line.amount).toBe(50);
  });

  it('Admin Standard (included): ticketOn → not charged', () => {
    const r = calc({ packageType: 'admin', adminTier: 'standard', ticketOn: true });
    expect(r.lines.some(l => l.label.includes('icket'))).toBe(false);
  });

  it('ticketOn: false → not charged', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', ticketOn: false });
    expect(r.lines.some(l => l.label.includes('icket'))).toBe(false);
  });
});

// ── Add-ons — Users ─────────────────────────────────────────────────
describe('ORM — User overage (driven by active tier)', () => {
  it('Admin Basic (2 included): 5 users → 3 excess × $2 = $6', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', users: 5 });
    const line = r.lines.find(l => l.label.includes('User'));
    expect(line.amount).toBe(6);         // 3 excess × $2
  });

  it('Admin Standard (5 included): 5 users → no excess', () => {
    const r = calc({ packageType: 'admin', adminTier: 'standard', users: 5 });
    expect(r.lines.some(l => l.label.includes('User'))).toBe(false);
  });

  it('Non-Admin Basic (2 included): 4 users → 2 excess × $2 = $4', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'basic', users: 4 });
    const line = r.lines.find(l => l.label.includes('User'));
    expect(line.amount).toBe(4);
  });

  it('Both (admin drives): Admin Standard (5 included): 5 users → no excess', () => {
    const r = calc({
      packageType: 'both',
      adminTier: 'standard', adminLocations: 25,
      nonAdminTier: 'basic', nonAdminLocations: 1,
      users: 5,
    });
    expect(r.lines.some(l => l.label.includes('User'))).toBe(false);
  });
});

// ── Contact Sales ────────────────────────────────────────────────────
describe('ORM — Contact Sales trigger', () => {
  it('admin locations > 99999 → contact sales', () => {
    const r = calc({ packageType: 'admin', adminTier: 'basic', adminLocations: 100000 });
    expect(r.hasContactSales).toBe(true);
    expect(r.contactSalesReason).toMatch(/Admin Connect location count/);
  });

  it('non-admin locations > 99999 → contact sales', () => {
    const r = calc({ packageType: 'nonAdmin', nonAdminTier: 'basic', nonAdminLocations: 100000 });
    expect(r.hasContactSales).toBe(true);
  });
});

// ── Compound ─────────────────────────────────────────────────────────
describe('ORM — Compound calculation', () => {
  it('Admin Standard + competitor addon + excess users', () => {
    const r = calc({
      packageType: 'admin',
      adminTier: 'standard',
      adminLocations: 25,        // no excess
      competitorOn: true,
      competitorLocationChannels: 2, // 2 × $25 = $50
      ticketOn: false,           // ticket included
      users: 8,                  // 3 excess × $2 = $6
    });
    // $250 + $50 + $6 = $306
    expect(r.subtotal).toBe(306);
  });
});
