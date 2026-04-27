import { describe, it, expect } from 'vitest';
import { PieceBag } from '@/bag.js';

describe('PieceBag', () => {
  const TYPES = ['I', 'L', 'J', 'O', 'T', 'S', 'Z'];

  it('returns only valid types', () => {
    const bag = new PieceBag(TYPES);
    for (let i = 0; i < 21; i++) {
      expect(TYPES).toContain(bag.next());
    }
  });

  it('each type appears exactly once per 7 draws', () => {
    const bag = new PieceBag(TYPES);
    const drawn = Array.from({ length: 7 }, () => bag.next());
    const unique = new Set(drawn);
    expect(unique.size).toBe(7);
    TYPES.forEach(t => expect(unique).toContain(t));
  });

  it('refills automatically after a full cycle', () => {
    const bag = new PieceBag(TYPES);
    // Draw 7 (one full cycle)
    for (let i = 0; i < 7; i++) bag.next();
    // Draw another 7 — should still work and return valid types
    const second = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(second).size).toBe(7);
  });

  it('produces different orderings across bags (probabilistic)', () => {
    const orders = new Set();
    for (let i = 0; i < 20; i++) {
      const bag = new PieceBag(TYPES);
      orders.add(Array.from({ length: 7 }, () => bag.next()).join(''));
    }
    // Very unlikely to get the same order 20 times (1/7! ≈ 0.02%)
    expect(orders.size).toBeGreaterThan(1);
  });
});
