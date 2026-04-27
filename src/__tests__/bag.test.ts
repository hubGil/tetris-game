import { describe, expect, it } from 'vitest';

import { PieceBag } from '@/bag.js';
import type { PieceType } from '@/types.js';

describe('PieceBag', () => {
  const TYPES: PieceType[] = ['I', 'L', 'J', 'O', 'T', 'S', 'Z'];

  it('returns only valid types', () => {
    const bag = new PieceBag(TYPES);
    for (let index = 0; index < 21; index += 1) {
      expect(TYPES).toContain(bag.next());
    }
  });

  it('each type appears exactly once per 7 draws', () => {
    const bag = new PieceBag(TYPES);
    const drawn = Array.from({ length: 7 }, () => bag.next());
    const unique = new Set(drawn);
    expect(unique.size).toBe(7);
    TYPES.forEach((type) => expect(unique).toContain(type));
  });

  it('refills automatically after a full cycle', () => {
    const bag = new PieceBag(TYPES);
    for (let index = 0; index < 7; index += 1) bag.next();
    const secondCycle = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(secondCycle).size).toBe(7);
  });

  it('produces different orderings across bags', () => {
    const orders = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      const bag = new PieceBag(TYPES);
      orders.add(Array.from({ length: 7 }, () => bag.next()).join(''));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});
