import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Arena }  from '@/arena.js';
import { Player } from '@/player.js';

describe('Player', () => {
  let arena;
  let player;

  beforeEach(() => {
    arena  = new Arena(12, 20);
    player = new Player(arena);
  });

  describe('level getter', () => {
    it('starts at 1', () => {
      expect(player.level).toBe(1);
    });

    it('increases every 10 lines', () => {
      player.totalLines = 10;
      expect(player.level).toBe(2);
      player.totalLines = 29;
      expect(player.level).toBe(3);
    });
  });

  describe('resetStats', () => {
    it('resets score and totalLines to 0', () => {
      player.score = 100;
      player.totalLines = 15;
      player.resetStats();
      expect(player.score).toBe(0);
      expect(player.totalLines).toBe(0);
    });

    it('emits score:changed with 0', () => {
      const handler = vi.fn();
      player.on('score:changed', handler);
      player.resetStats();
      expect(handler).toHaveBeenCalledWith(0);
    });

    it('emits level:changed with 1', () => {
      const handler = vi.fn();
      player.on('level:changed', handler);
      player.resetStats();
      expect(handler).toHaveBeenCalledWith(1);
    });
  });

  describe('reset', () => {
    it('spawns a piece with a valid position', () => {
      player.reset();
      expect(player.matrix).not.toBeNull();
      expect(player.pos.y).toBe(0);
    });

    it('returns true on an empty arena', () => {
      expect(player.reset()).toBe(true);
    });

    it('returns false when the spawn position is fully blocked', () => {
      player.reset();
      for (let y = 0; y < arena.height; y++) arena.grid[y].fill(1);
      expect(player.reset()).toBe(false);
    });

    it('emits piece:next with the upcoming matrix', () => {
      const handler = vi.fn();
      player.on('piece:next', handler);
      player.reset();
      expect(handler).toHaveBeenCalledOnce();
      expect(player.nextMatrix).not.toBeNull();
    });
  });

  describe('move', () => {
    beforeEach(() => { player.reset(); });

    it('shifts piece right', () => {
      const startX = player.pos.x;
      player.move(1);
      expect(player.pos.x).toBe(startX + 1);
    });

    it('does not move past left wall', () => {
      player.pos.x = 0;
      player.move(-1);
      expect(player.pos.x).toBe(0);
    });

    it('does not move past right wall', () => {
      // Use a 1-wide piece for a deterministic right boundary
      player.matrix = [[1]];
      player.pos.x = arena.width - 1;
      player.move(1);
      expect(player.pos.x).toBe(arena.width - 1);
    });
  });

  describe('drop', () => {
    beforeEach(() => { player.reset(); });

    it('returns locked: false when space is available below', () => {
      player.pos.y = 0;
      expect(player.drop().locked).toBe(false);
    });

    it('increments y when not locked', () => {
      player.pos.y = 0;
      player.drop();
      expect(player.pos.y).toBe(1);
    });

    it('returns locked: true when piece hits the floor', () => {
      // Use a 1x1 piece for a deterministic floor test
      player.matrix = [[1]];
      player.pos.y = arena.height - 1;
      expect(player.drop().locked).toBe(true);
    });

    it('returns pendingRows when a line is completed', () => {
      // Fill the bottom row, place a 1x1 piece on top of it
      arena.grid[19].fill(1);
      player.matrix = [[1]];
      player.pos = { x: 0, y: 18 };
      const { locked, pendingRows } = player.drop();
      expect(locked).toBe(true);
      expect(pendingRows).toContain(19);
    });
  });

  describe('hardDrop', () => {
    it('moves the piece to the lowest valid position', () => {
      player.reset();
      const { locked } = player.hardDrop();
      expect(locked).toBe(true);
      expect(player.pos.y).toBeGreaterThan(0);
    });
  });

  describe('commitClear', () => {
    it('scores 10 points for 1 line', () => {
      player.commitClear([19]);
      expect(player.score).toBe(10);
    });

    it('uses exponential multiplier for multiple lines (1+2 = 30 for 2 lines)', () => {
      player.commitClear([18, 19]);
      expect(player.score).toBe(30);
    });

    it('emits score:changed with the updated score', () => {
      const handler = vi.fn();
      player.on('score:changed', handler);
      player.commitClear([19]);
      expect(handler).toHaveBeenCalledWith(10);
    });

    it('emits level:changed when crossing a level threshold', () => {
      const handler = vi.fn();
      player.on('level:changed', handler);
      player.totalLines = 9;
      player.commitClear([19]); // totalLines becomes 10 → level 2
      expect(handler).toHaveBeenCalledWith(2);
    });

    it('does not emit level:changed when level stays the same', () => {
      const handler = vi.fn();
      player.on('level:changed', handler);
      player.commitClear([19]); // totalLines: 0 → 1, still level 1
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('EventEmitter integration', () => {
    it('on() registers a listener', () => {
      const handler = vi.fn();
      player.on('score:changed', handler);
      player.commitClear([19]);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('off() removes a listener', () => {
      const handler = vi.fn();
      player.on('score:changed', handler);
      player.off('score:changed', handler);
      player.commitClear([19]);
      expect(handler).not.toHaveBeenCalled();
    });

    it('once() fires only one time', () => {
      const handler = vi.fn();
      player.once('score:changed', handler);
      player.commitClear([19]);
      player.commitClear([18]);
      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
