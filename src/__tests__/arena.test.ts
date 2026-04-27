import { beforeEach, describe, expect, it } from 'vitest';

import { Arena } from '@/arena.js';

describe('Arena', () => {
  let arena: Arena;

  beforeEach(() => {
    arena = new Arena(10, 20);
  });

  describe('collides', () => {
    it('returns false on empty arena', () => {
      expect(
        arena.collides(
          [
            [1, 1],
            [1, 0],
          ],
          { x: 0, y: 0 },
        ),
      ).toBe(false);
    });

    it('detects left wall collision', () => {
      expect(arena.collides([[1, 1]], { x: -1, y: 0 })).toBe(true);
    });

    it('detects right wall collision', () => {
      expect(arena.collides([[1, 1]], { x: 9, y: 0 })).toBe(true);
    });

    it('detects floor collision', () => {
      expect(arena.collides([[1]], { x: 0, y: 20 })).toBe(true);
    });

    it('detects collision with placed piece', () => {
      arena.grid[19][5] = 1;
      expect(arena.collides([[1]], { x: 5, y: 19 })).toBe(true);
    });

    it('ignores zero cells in matrix', () => {
      arena.grid[19][4] = 1;
      expect(arena.collides([[0, 1]], { x: 4, y: 19 })).toBe(false);
    });
  });

  describe('merge', () => {
    it('writes non-zero values into the grid', () => {
      arena.merge(
        [
          [1, 2],
          [0, 3],
        ],
        { x: 2, y: 3 },
      );
      expect(arena.grid[3][2]).toBe(1);
      expect(arena.grid[3][3]).toBe(2);
      expect(arena.grid[4][3]).toBe(3);
    });

    it('does not overwrite existing cells with zero', () => {
      arena.grid[0][0] = 5;
      arena.merge([[0]], { x: 0, y: 0 });
      expect(arena.grid[0][0]).toBe(5);
    });
  });

  describe('findCompleteRows', () => {
    it('returns empty array when no rows are complete', () => {
      expect(arena.findCompleteRows()).toEqual([]);
    });

    it('returns the index of a complete row', () => {
      arena.grid[19] = new Array(10).fill(1);
      expect(arena.findCompleteRows()).toEqual([19]);
    });

    it('returns multiple complete row indices', () => {
      arena.grid[18] = new Array(10).fill(1);
      arena.grid[19] = new Array(10).fill(1);
      const rows = arena.findCompleteRows();
      expect(rows).toContain(18);
      expect(rows).toContain(19);
      expect(rows).toHaveLength(2);
    });

    it('ignores rows with at least one empty cell', () => {
      arena.grid[19] = new Array(10).fill(1);
      arena.grid[19][0] = 0;
      expect(arena.findCompleteRows()).toEqual([]);
    });
  });

  describe('clearRows', () => {
    it('removes specified rows and maintains grid height', () => {
      arena.grid[19] = new Array(10).fill(1);
      arena.clearRows([19]);
      expect(arena.grid).toHaveLength(20);
      expect(arena.grid[19].every((cell) => cell === 0)).toBe(true);
    });

    it('returns the number of rows cleared', () => {
      expect(arena.clearRows([18, 19])).toBe(2);
    });

    it('clears all targeted rows when multiple adjacent lines are removed', () => {
      arena.grid[16] = new Array(10).fill(4);
      arena.grid[17] = new Array(10).fill(1);
      arena.grid[18] = new Array(10).fill(2);
      arena.grid[19] = new Array(10).fill(3);

      arena.clearRows([17, 18, 19]);

      expect(arena.grid[0].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[1].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[2].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[19]).toEqual(new Array(10).fill(4));
    });

    it('clears all targeted rows when multiple non-adjacent lines are removed', () => {
      arena.grid[14] = new Array(10).fill(9);
      arena.grid[16] = new Array(10).fill(1);
      arena.grid[18] = new Array(10).fill(2);
      arena.grid[19] = new Array(10).fill(3);

      arena.clearRows([16, 18, 19]);

      expect(arena.grid[0].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[1].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[2].every((cell) => cell === 0)).toBe(true);
      expect(arena.grid[17]).toEqual(new Array(10).fill(9));
    });

    it('shifts rows above the cleared row downward', () => {
      arena.grid[10] = new Array(10).fill(7);
      arena.clearRows([19]);
      expect(arena.grid[11]).toEqual(new Array(10).fill(7));
    });

    it('adds empty rows at the top', () => {
      arena.grid[19] = new Array(10).fill(1);
      arena.clearRows([19]);
      expect(arena.grid[0].every((cell) => cell === 0)).toBe(true);
    });
  });

  describe('sweep', () => {
    it('clears complete rows and returns the count', () => {
      arena.grid[19] = new Array(10).fill(1);
      expect(arena.sweep()).toBe(1);
      expect(arena.grid[19].every((cell) => cell === 0)).toBe(true);
    });

    it('returns 0 when no rows are complete', () => {
      expect(arena.sweep()).toBe(0);
    });
  });

  describe('reset', () => {
    it('clears all cells', () => {
      arena.grid[5][5] = 3;
      arena.reset();
      expect(arena.grid[5][5]).toBe(0);
    });

    it('preserves grid dimensions', () => {
      arena.reset();
      expect(arena.grid).toHaveLength(20);
      expect(arena.grid[0]).toHaveLength(10);
    });
  });
});
