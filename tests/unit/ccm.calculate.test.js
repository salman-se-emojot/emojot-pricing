// Unit tests — CCM module calculate()
import { describe, it, expect } from 'vitest';
import { ccmModule } from '../../js/modules/ccm.js';

function state(overrides = {}) {
  return { ...ccmModule.initialState(), ...overrides };
}

function calc(overrides = {}) {
  return ccmModule.calculate(state(overrides));
}

// ── Baseline ────────────────────────────────────────────────────────
describe('CCM — Basic tier baseline', () => {
  it('base $80 with no excess', () => {
    const r = calc();
    expect(r.subtotal).toBe(80);
    expect(r.hasContactSales).toBe(false);
    expect(r.lines[0].amount).toBe(80);
    expect(r.lines[0].label).toMatch(/Basic/);
  });

  it('no excess lines when all at included counts', () => {
    // Basic: 5 tp, 1 sensor, 1 workflow, 1 dashboard, 5 users
    const r = calc({ touchpoints: 5, sensors: 1, workflows: 1, dashboards: 1, users: 5 });
    expect(r.lines.length).toBe(1); // only base line
  });
});

// ── Touchpoints ──────────────────────────────────────────────────────
describe('CCM — Touchpoint pricing', () => {
  it('Basic: 30 nodes → all 30 × $10.00 = $300', () => {
    const r = calc({ tier: 'basic', touchpoints: 30 });
    const tp = r.lines.find(l => l.label.includes('Touchpoint'));
    expect(tp.amount).toBe(300);
    expect(r.subtotal).toBe(380);        // $80 + $300
  });

  it('Standard: at included (25) → no touchpoint charge', () => {
    const r = calc({ tier: 'standard', touchpoints: 25 });
    expect(r.lines.some(l => l.label.includes('Touchpoint'))).toBe(false);
    expect(r.subtotal).toBe(300);
  });

  it('Enterprise: 200 nodes → 100 excess × $2.00 = $200', () => {
    const r = calc({ tier: 'enterprise', touchpoints: 200 });
    const tp = r.lines.find(l => l.label.includes('Touchpoint'));
    expect(tp.amount).toBe(200);         // 100 excess × $2.00
    expect(r.subtotal).toBe(1200);       // $1000 + $200
  });

  it('Enterprise: exactly 100 included → no excess', () => {
    const r = calc({ tier: 'enterprise', touchpoints: 100 });
    expect(r.lines.some(l => l.label.includes('Touchpoint'))).toBe(false);
    expect(r.subtotal).toBe(1000);
  });
});

// ── Workflows ────────────────────────────────────────────────────────
describe('CCM — Workflow add-on', () => {
  it('no charge at included count (1 for Basic)', () => {
    const r = calc({ workflows: 1 });
    expect(r.lines.some(l => l.label.includes('Workflow'))).toBe(false);
  });

  it('excess workflows at $30/workflow', () => {
    const r = calc({ workflows: 4 }); // 3 excess
    const line = r.lines.find(l => l.label.includes('Workflow'));
    expect(line.amount).toBe(90);        // 3 × $30
  });

  it('Standard tier: 5 workflows, 2 included → 3 excess × $30 = $90', () => {
    const r = calc({ tier: 'standard', workflows: 5 });
    const line = r.lines.find(l => l.label.includes('Workflow'));
    expect(line.amount).toBe(90);
  });
});

// ── Sensors ──────────────────────────────────────────────────────────
describe('CCM — Sensor add-on', () => {
  it('excess sensors at $50/sensor', () => {
    const r = calc({ sensors: 3 });     // 2 excess
    const line = r.lines.find(l => l.label.includes('Sensor'));
    expect(line.amount).toBe(100);       // 2 × $50
  });
});

// ── Dashboards ───────────────────────────────────────────────────────
describe('CCM — Dashboard add-on', () => {
  it('excess dashboards at $20/dashboard', () => {
    const r = calc({ dashboards: 3 });  // 2 excess
    const line = r.lines.find(l => l.label.includes('Dashboard'));
    expect(line.amount).toBe(40);        // 2 × $20
  });
});

// ── Brand ────────────────────────────────────────────────────────────
describe('CCM — Brand Personalization', () => {
  it('brand on, Basic tier → charged at $10/brand', () => {
    const r = calc({ brandOn: true, brandCount: 3 });
    const line = r.lines.find(l => l.label.includes('Brand'));
    expect(line.amount).toBe(30);        // 3 × $10
  });

  it('brand not charged in Enterprise (included)', () => {
    const r = calc({ tier: 'enterprise', brandOn: true, brandCount: 5 });
    expect(r.lines.some(l => l.label.includes('Brand'))).toBe(false);
  });
});

// ── Emosight ─────────────────────────────────────────────────────────
describe('CCM — Emosight AI', () => {
  it('emosight on, Basic tier → $30', () => {
    const r = calc({ emosightOn: true });
    const line = r.lines.find(l => l.label.includes('Emosight'));
    expect(line.amount).toBe(30);
  });

  it('emosight on, Standard tier (included) → $0 extra', () => {
    const r = calc({ tier: 'standard', emosightOn: true });
    expect(r.lines.some(l => l.label.includes('Emosight'))).toBe(false);
  });
});

// ── SMS Domain ───────────────────────────────────────────────────────
describe('CCM — SMS Domain Whitelisting', () => {
  it('domain on → $30', () => {
    const r = calc({ domainOn: true });
    const line = r.lines.find(l => l.label.includes('Domain'));
    expect(line.amount).toBe(30);
  });
});

// ── Users ────────────────────────────────────────────────────────────
describe('CCM — User overage', () => {
  it('no charge at included count', () => {
    const r = calc({ users: 5 });
    expect(r.lines.some(l => l.label.includes('User'))).toBe(false);
  });

  it('excess users at $2/user', () => {
    const r = calc({ users: 10 });      // 5 excess
    const line = r.lines.find(l => l.label.includes('User'));
    expect(line.amount).toBe(10);        // 5 × $2
  });
});

// ── Compound ─────────────────────────────────────────────────────────
describe('CCM — Compound calculation', () => {
  it('Standard tier with multiple add-ons', () => {
    const r = calc({
      tier: 'standard',
      touchpoints: 25,   // included
      sensors: 3,        // exactly included
      workflows: 2,      // exactly included
      dashboards: 2,     // exactly included
      domainOn: true,    // +$30
      emosightOn: true,  // included in standard
      users: 25,         // exactly included
    });
    expect(r.subtotal).toBe(330);        // $300 + $30
  });
});
