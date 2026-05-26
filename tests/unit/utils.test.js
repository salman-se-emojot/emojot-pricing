// Unit tests — js/core/utils.js
import { describe, it, expect } from 'vitest';
import { fmt, findSlabRate, parseNum, round2, centSum } from '../../js/core/utils.js';

describe('fmt()', () => {
  it('formats whole dollars', () => {
    expect(fmt(50)).toBe('$50.00');
  });
  it('formats dollars with cents', () => {
    expect(fmt(8.33)).toBe('$8.33');
  });
  it('formats zero', () => {
    expect(fmt(0)).toBe('$0.00');
  });
  it('adds thousands separator', () => {
    expect(fmt(1250)).toBe('$1,250.00');
    expect(fmt(10000)).toBe('$10,000.00');
  });
  it('formats large values correctly', () => {
    expect(fmt(12345.67)).toBe('$12,345.67');
  });
});

describe('findSlabRate()', () => {
  const slabs = [
    { max: 10,    rate: 5.00 },
    { max: 50,    rate: 3.00 },
    { max: 99999, rate: 2.00 },
  ];

  it('returns rate for first slab (exact match)', () => {
    expect(findSlabRate(slabs, 10)).toBe(5.00);
  });
  it('returns rate for first slab (below max)', () => {
    expect(findSlabRate(slabs, 1)).toBe(5.00);
    expect(findSlabRate(slabs, 7)).toBe(5.00);
  });
  it('returns rate for mid slab', () => {
    expect(findSlabRate(slabs, 11)).toBe(3.00);
    expect(findSlabRate(slabs, 50)).toBe(3.00);
  });
  it('returns rate for last slab', () => {
    expect(findSlabRate(slabs, 51)).toBe(2.00);
    expect(findSlabRate(slabs, 99999)).toBe(2.00);
  });
  it('returns null when total exceeds all slabs', () => {
    expect(findSlabRate(slabs, 100000)).toBeNull();
  });
});

describe('parseNum()', () => {
  it('parses valid integer string', () => {
    expect(parseNum('42')).toBe(42);
  });
  it('returns min for NaN', () => {
    expect(parseNum('abc')).toBe(0);
    expect(parseNum('')).toBe(0);
  });
  it('clamps to min', () => {
    expect(parseNum('-5', 0)).toBe(0);
    expect(parseNum('2', 5)).toBe(5);
  });
  it('passes through values above min', () => {
    expect(parseNum('10', 5)).toBe(10);
  });
});

describe('round2()', () => {
  it('leaves clean integers unchanged', () => {
    expect(round2(50)).toBe(50);
    expect(round2(300)).toBe(300);
  });

  it('leaves clean two-decimal values unchanged', () => {
    expect(round2(8.33)).toBe(8.33);
    expect(round2(116.67)).toBe(116.67);
  });

  it('eliminates floating-point drift — the 116.67 × 2 case', () => {
    // Raw JS: 2 * 116.67 may produce 233.34000000000002 on some engines
    expect(round2(2 * 116.67)).toBe(233.34);
  });

  it('rounds billing-multiplier drift', () => {
    // 393.34 × 1.075 = 422.84049... without rounding
    expect(round2(393.34 * 1.075)).toBe(422.84);
  });

  it('rounds down correctly', () => {
    expect(round2(1.234)).toBe(1.23);
  });

  it('rounds up correctly', () => {
    expect(round2(1.235)).toBe(1.24);
  });

  it('handles zero', () => {
    expect(round2(0)).toBe(0);
  });
});

describe('centSum()', () => {
  it('sums integers without drift', () => {
    expect(centSum([50, 100, 30])).toBe(180);
  });

  it('sums decimal amounts correctly', () => {
    expect(centSum([8.33, 8.33, 8.34])).toBe(25.00);
  });

  it('handles undefined/null entries via ?? 0', () => {
    expect(centSum([100, null, undefined, 50])).toBe(150);
  });

  it('returns 0 for empty array', () => {
    expect(centSum([])).toBe(0);
  });

  it('eliminates accumulated drift across many small amounts', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in plain JS
    expect(centSum([0.1, 0.2])).toBe(0.3);
  });

  it('matches the ORM non-admin 116.67 × 2 + base scenario', () => {
    // Non-admin basic: $150 base + 2 excess locations × $116.67 = $383.34
    const base = 150;
    const excess = round2(2 * 116.67); // 233.34
    expect(centSum([base, excess])).toBe(383.34);
  });
});
