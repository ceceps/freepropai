import { describe, it, expect } from 'vitest';
import { formatIDR, formatCompactIDR, formatDate, formatDateTime, truncate } from './format';

describe('formatIDR', () => {
  it('returns dash for nullish or NaN', () => {
    expect(formatIDR(null)).toBe('-');
    expect(formatIDR(undefined)).toBe('-');
    expect(formatIDR(Number.NaN)).toBe('-');
  });

  it('formats whole rupiah with id-ID grouping', () => {
    expect(formatIDR(1_500_000)).toBe(`Rp ${Math.round(1_500_000).toLocaleString('id-ID')}`);
  });
});

describe('formatCompactIDR', () => {
  it('returns dash for nullish', () => {
    expect(formatCompactIDR(null)).toBe('-');
  });

  it('uses M for billions and jt for millions', () => {
    expect(formatCompactIDR(1_500_000_000)).toMatch(/M$/);
    expect(formatCompactIDR(250_000_000)).toMatch(/jt$/);
  });

  it('falls back to formatIDR below one million', () => {
    expect(formatCompactIDR(500_000)).toBe(formatIDR(500_000));
  });
});

describe('formatDate / formatDateTime', () => {
  it('returns dash for empty or invalid values', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate('not-a-date')).toBe('-');
    expect(formatDateTime('')).toBe('-');
  });

  it('formats a valid ISO date in id-ID locale', () => {
    const formatted = formatDate('2026-03-15T00:00:00.000Z');
    expect(formatted).not.toBe('-');
    expect(formatted).toMatch(/2026/);
  });
});

describe('truncate', () => {
  it('returns empty string for nullish', () => {
    expect(truncate(null)).toBe('');
  });

  it('leaves short strings intact and ellipsizes long ones', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghij...');
  });
});
