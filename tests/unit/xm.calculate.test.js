// Unit tests — XM module calculate()
import { describe, it, expect, beforeEach } from 'vitest';
import { xmModule } from '../../js/modules/xm.js';

// Helper: build state starting from defaults and merging overrides
function state(overrides = {}) {
  return { ...xmModule.initialState(), ...overrides };
}

function calc(overrides = {}) {
  return xmModule.calculate(state(overrides));
}

// ── Baseline ────────────────────────────────────────────────────────
describe('XM — Basic tier baseline', () => {
  it('returns base $50 with no add-ons and included touchpoints', () => {
    const r = calc();
    expect(r.subtotal).toBe(50);
    expect(r.hasContactSales).toBe(false);
    expect(r.lines[0].amount).toBe(50);
    expect(r.lines[0].label).toMatch(/Basic/);
  });

  it('no excess lines when at exactly the included touchpoint count', () => {
    const r = calc({ touchpoints: 5 });
    expect(r.lines.length).toBe(1);
  });
});

// ── Touchpoints — Basic/Standard (excess-only × rate) ───────────────
describe('XM — Touchpoint slab pricing (Basic/Standard)', () => {
  it('Basic: 30 nodes (5 included) → 25 excess × $10.00 = $250', () => {
    const r = calc({ tier: 'basic', touchpoints: 30 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(250);     // 25 excess × $10
    expect(r.subtotal).toBe(300);        // $50 base + $250
  });

  it('Basic: 56 nodes (5 included) → 51 excess × $5.00 = $255', () => {
    const r = calc({ tier: 'basic', touchpoints: 56 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(255);     // 51 excess × $5 (rate band ≤105)
  });

  it('Standard ($250 base): 50 nodes (25 included) → 25 excess × $10.00 = $250', () => {
    const r = calc({ tier: 'standard', touchpoints: 50 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(250);     // 25 excess × $10
    expect(r.subtotal).toBe(500);        // $250 + $250
  });

  it('Standard: at included count (25) → no touchpoint charge', () => {
    const r = calc({ tier: 'standard', touchpoints: 25 });
    expect(r.lines.some(l => l.label.includes('Touchpoints'))).toBe(false);
    expect(r.subtotal).toBe(250);
  });

  it('Basic: exactly 5 nodes → no touchpoint charge', () => {
    const r = calc({ tier: 'basic', touchpoints: 5 });
    expect(r.lines.some(l => l.label.includes('Touchpoints'))).toBe(false);
  });

  it('Basic: 1 excess node → 1 × $10.00 = $10 (no cliff)', () => {
    // Critical: adding a single node above included should cost $10, not 6×$10=$60
    const r = calc({ tier: 'basic', touchpoints: 6 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(10);      // only 1 excess × $10
    expect(r.subtotal).toBe(60);         // $50 + $10
  });
});

// ── Touchpoints — Enterprise (excess-only) ──────────────────────────
describe('XM — Enterprise touchpoint pricing (excess-only)', () => {
  it('Enterprise: exactly 100 included → no excess charge', () => {
    const r = calc({ tier: 'enterprise', touchpoints: 100 });
    expect(r.lines.some(l => l.label.includes('Touchpoints'))).toBe(false);
    expect(r.subtotal).toBe(1000);
  });

  it('Enterprise: 150 nodes → 50 excess × $2.00 = $100', () => {
    const r = calc({ tier: 'enterprise', touchpoints: 150 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(100);     // 50 excess × $2.00 (≤200 band)
    expect(r.subtotal).toBe(1100);
  });

  it('Enterprise: 250 nodes → 150 excess × $1.50 = $225', () => {
    const r = calc({ tier: 'enterprise', touchpoints: 250 });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBeCloseTo(225, 2); // 150 excess × $1.50
  });
});

// ── Add-on: Sensors ──────────────────────────────────────────────────
describe('XM — Sensor add-on', () => {
  it('no charge at included count (1 for Basic)', () => {
    const r = calc({ sensors: 1 });
    expect(r.lines.some(l => l.label.includes('Sensor'))).toBe(false);
  });

  it('excess sensor charged at $50/sensor', () => {
    const r = calc({ sensors: 3 });
    const line = r.lines.find(l => l.label.includes('Sensor'));
    expect(line.amount).toBe(100);       // 2 excess × $50
  });
});

// ── Add-on: Dashboards ───────────────────────────────────────────────
describe('XM — Dashboard add-on', () => {
  it('no charge at included count (1 for Basic)', () => {
    const r = calc({ dashboards: 1 });
    expect(r.lines.some(l => l.label.includes('Dashboard'))).toBe(false);
  });

  it('excess dashboard charged at $20/dashboard', () => {
    const r = calc({ dashboards: 4 });
    const line = r.lines.find(l => l.label.includes('Dashboard'));
    expect(line.amount).toBe(60);        // 3 excess × $20
  });
});

// ── Add-on: Brand Personalization ───────────────────────────────────
describe('XM — Brand Personalization add-on', () => {
  it('brand toggle off → no charge', () => {
    const r = calc({ brandOn: false });
    expect(r.lines.some(l => l.label.includes('Brand'))).toBe(false);
  });

  it('brand toggle on, 2 brands → 2 × $10 = $20', () => {
    const r = calc({ brandOn: true, brandCount: 2 });
    const line = r.lines.find(l => l.label.includes('Brand'));
    expect(line.amount).toBe(20);
  });

  it('brand included in Enterprise → no charge even when on', () => {
    const r = calc({ tier: 'enterprise', brandOn: true, brandCount: 3 });
    expect(r.lines.some(l => l.label.includes('Brand'))).toBe(false);
  });
});

// ── Add-on: Emosight AI ──────────────────────────────────────────────
describe('XM — Emosight AI add-on', () => {
  it('emosight off → no charge', () => {
    const r = calc({ emosightOn: false });
    expect(r.lines.some(l => l.label.includes('Emosight'))).toBe(false);
  });

  it('emosight on, Basic tier (not included) → $30', () => {
    const r = calc({ emosightOn: true });
    const line = r.lines.find(l => l.label.includes('Emosight'));
    expect(line.amount).toBe(30);
  });

  it('emosight included in Standard → no extra charge even when on', () => {
    const r = calc({ tier: 'standard', emosightOn: true });
    expect(r.lines.some(l => l.label.includes('Emosight'))).toBe(false);
  });
});

// ── Add-on: SMS Domain Whitelisting ─────────────────────────────────
describe('XM — SMS Domain Whitelisting add-on', () => {
  it('domain off → no charge', () => {
    const r = calc({ domainOn: false });
    expect(r.lines.some(l => l.label.includes('Domain'))).toBe(false);
  });

  it('domain on → $30', () => {
    const r = calc({ domainOn: true });
    const line = r.lines.find(l => l.label.includes('Domain'));
    expect(line.amount).toBe(30);
  });
});

// ── Add-on: Users ────────────────────────────────────────────────────
describe('XM — User overage', () => {
  it('no excess when at included count (5 for Basic)', () => {
    const r = calc({ users: 5 });
    expect(r.lines.some(l => l.label.includes('User'))).toBe(false);
  });

  it('2 excess users → 2 × $2 = $4', () => {
    const r = calc({ users: 7 });
    const line = r.lines.find(l => l.label.includes('User'));
    expect(line.amount).toBe(4);
  });
});

// ── Compound scenario ────────────────────────────────────────────────
describe('XM — Compound calculation', () => {
  it('Standard tier + excess sensors + emosight included + domain on', () => {
    const r = calc({
      tier: 'standard',
      touchpoints: 25,   // exactly included, no tp charge
      sensors: 5,        // 2 excess × $50 = $100
      dashboards: 2,     // exactly included
      emosightOn: true,  // included in standard → $0
      domainOn: true,    // $30
      users: 30,         // 5 excess × $2 = $10
    });
    // $250 + $100 + $30 + $10 = $390
    expect(r.subtotal).toBe(390);
    expect(r.hasContactSales).toBe(false);
  });

  it('Standard tier + 10 excess touchpoints → only 10 billed, not 35', () => {
    const r = calc({
      tier: 'standard',
      touchpoints: 35,   // 10 excess × $10 = $100
    });
    const tpLine = r.lines.find(l => l.label.includes('Touchpoints'));
    expect(tpLine.amount).toBe(100);     // 10 excess × $10, not 35 × $10
    expect(r.subtotal).toBe(350);        // $250 + $100
  });
});
