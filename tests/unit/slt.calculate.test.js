// Unit tests — SLT module calculate()
import { describe, it, expect } from 'vitest';
import { sltModule } from '../../js/modules/slt.js';

function state(overrides = {}) {
  return { ...sltModule.initialState(), ...overrides };
}

function calc(overrides = {}) {
  return sltModule.calculate(state(overrides));
}

// ── Baseline ────────────────────────────────────────────────────────
describe('SLT — Basic tier baseline', () => {
  it('base $130 with no excess', () => {
    const r = calc();
    expect(r.subtotal).toBe(130);
    expect(r.hasContactSales).toBe(false);
  });

  it('no excess lines when at exactly included limits', () => {
    // Basic: 5 kw, 10000 mentions, 30 profiles, 5 users
    const r = calc({ keywords: 5, mentions: 10000, profiles: 30, users: 5 });
    expect(r.lines.length).toBe(1);      // only base
  });

  it('Standard base is $225', () => {
    const r = calc({ tier: 'standard' });
    expect(r.subtotal).toBe(225);
  });

  it('Enterprise base is $600', () => {
    const r = calc({ tier: 'enterprise' });
    expect(r.subtotal).toBe(600);
  });
});

// ── Keywords ─────────────────────────────────────────────────────────
describe('SLT — Keyword overage', () => {
  it('no charge at included count (5)', () => {
    const r = calc({ keywords: 5 });
    expect(r.lines.some(l => l.label.includes('eyword'))).toBe(false);
  });

  it('2 excess keywords → 2 × $15 = $30', () => {
    const r = calc({ keywords: 7 });
    const line = r.lines.find(l => l.label.includes('eyword'));
    expect(line.amount).toBe(30);
    expect(r.subtotal).toBe(160);        // $130 + $30
  });

  it('Standard: 15 total, 10 included → 5 excess × $15 = $75', () => {
    const r = calc({ tier: 'standard', keywords: 15 });
    const line = r.lines.find(l => l.label.includes('eyword'));
    expect(line.amount).toBe(75);
    expect(r.subtotal).toBe(300);        // $225 + $75
  });
});

// ── Mentions (billed in 10k blocks) ─────────────────────────────────
describe('SLT — Mention overage (10,000-mention blocks)', () => {
  it('at included count → no charge', () => {
    const r = calc({ mentions: 10000 });
    expect(r.lines.some(l => l.label.includes('ention'))).toBe(false);
  });

  it('1 mention above → 1 block × $12 = $12', () => {
    const r = calc({ mentions: 10001 });
    const line = r.lines.find(l => l.label.includes('ention'));
    expect(line.amount).toBe(12);
  });

  it('exactly 10k excess → 1 block × $12 = $12', () => {
    const r = calc({ mentions: 20000 });
    const line = r.lines.find(l => l.label.includes('ention'));
    expect(line.amount).toBe(12);        // 1 full block
  });

  it('10001 above → 2 blocks × $12 = $24', () => {
    const r = calc({ mentions: 20001 });
    const line = r.lines.find(l => l.label.includes('ention'));
    expect(line.amount).toBe(24);        // 2 blocks (ceil(10001/10000)=2)
  });

  it('Standard: 50000 mentions, 20000 included → 30000 excess = 3 blocks × $12 = $36', () => {
    const r = calc({ tier: 'standard', mentions: 50000 });
    const line = r.lines.find(l => l.label.includes('ention'));
    expect(line.amount).toBe(36);        // 3 × $12
  });
});

// ── SM Profiles (billed in blocks of 10) ────────────────────────────
describe('SLT — Profile overage (blocks of 10)', () => {
  it('at included count → no charge', () => {
    const r = calc({ profiles: 30 });
    expect(r.lines.some(l => l.label.includes('rofile'))).toBe(false);
  });

  it('1 profile above → 1 block × $15 = $15', () => {
    const r = calc({ profiles: 31 });
    const line = r.lines.find(l => l.label.includes('rofile'));
    expect(line.amount).toBe(15);
  });

  it('10 profiles above → 1 block × $15 = $15', () => {
    const r = calc({ profiles: 40 });
    const line = r.lines.find(l => l.label.includes('rofile'));
    expect(line.amount).toBe(15);        // ceil(10/10) = 1 block
  });

  it('11 profiles above → 2 blocks × $15 = $30', () => {
    const r = calc({ profiles: 41 });
    const line = r.lines.find(l => l.label.includes('rofile'));
    expect(line.amount).toBe(30);        // ceil(11/10) = 2 blocks
  });
});

// ── Add-on: Mention Flagging ─────────────────────────────────────────
describe('SLT — Mention Flagging add-on', () => {
  it('flagging off → no charge', () => {
    const r = calc({ flaggingOn: false });
    expect(r.lines.some(l => l.label.includes('lagging'))).toBe(false);
  });

  it('Basic tier: flagging on → $50', () => {
    const r = calc({ flaggingOn: true });
    const line = r.lines.find(l => l.label.includes('lagging'));
    expect(line.amount).toBe(50);
    expect(r.subtotal).toBe(180);        // $130 + $50
  });

  it('Standard tier: flagging on (not included) → $50', () => {
    const r = calc({ tier: 'standard', flaggingOn: true });
    const line = r.lines.find(l => l.label.includes('lagging'));
    expect(line.amount).toBe(50);
  });

  it('Enterprise tier: flagging included → not charged', () => {
    const r = calc({ tier: 'enterprise', flaggingOn: true });
    expect(r.lines.some(l => l.label.includes('lagging'))).toBe(false);
  });
});

// ── Add-on: YouTube AI Search ────────────────────────────────────────
describe('SLT — YouTube AI Search add-on', () => {
  it('youtube off → no charge', () => {
    const r = calc({ youtubeOn: false });
    expect(r.lines.some(l => l.label.toLowerCase().includes('youtube'))).toBe(false);
  });

  it('youtube on → $50', () => {
    const r = calc({ youtubeOn: true });
    const line = r.lines.find(l => l.label.toLowerCase().includes('youtube'));
    expect(line.amount).toBe(50);
    expect(r.subtotal).toBe(180);
  });
});

// ── Users ────────────────────────────────────────────────────────────
describe('SLT — User overage', () => {
  it('at included count → no charge', () => {
    const r = calc({ users: 5 });
    expect(r.lines.some(l => l.label.includes('User'))).toBe(false);
  });

  it('excess at $2/user', () => {
    const r = calc({ users: 8 });        // 3 excess
    const line = r.lines.find(l => l.label.includes('User'));
    expect(line.amount).toBe(6);         // 3 × $2
  });
});

// ── Compound ─────────────────────────────────────────────────────────
describe('SLT — Compound calculation', () => {
  it('Standard + keyword excess + mention excess + youtube', () => {
    const r = calc({
      tier: 'standard',
      keywords: 15,       // 5 excess × $15 = $75
      mentions: 30000,    // 10000 excess = 1 block × $12 = $12
      profiles: 50,       // exactly included
      flaggingOn: true,   // addon → $50
      youtubeOn: true,    // $50
      users: 10,          // exactly included
    });
    // $225 + $75 + $12 + $50 + $50 = $412
    expect(r.subtotal).toBe(412);
  });
});
