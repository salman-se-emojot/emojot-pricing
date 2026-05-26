// Unit tests — js/core/utils.js
import { describe, it, expect } from 'vitest';
import { fmt, findSlabRate, parseNum } from '../../js/core/utils.js';

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
