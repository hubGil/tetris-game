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
      player.score = 500;
      player.totalLines = 15;
      player.resetStats();
      expect(player.score).toBe(0);
      expect(player.totalLines).toBe(0);
    });

    it('resets hold state', () => {
      player.reset();
      player.hold();
      player.resetStats();
      expect(player.holdMatrix).toBeNull();
      expect(player._holdType).toBeNull();
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

    it('emits piece:hold with null', () => {
      const handler = vi.fn();
      player.on('piece:hold', handler);
      player.resetStats();
      expect(handler).toHaveBeenCalledWith(null);
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

    it('resets canHold to true', () => {
      player.reset();
      player.hold(); // uses the hold, canHold becomes false
      player.reset(); // new piece
      expect(player.canHold).toBe(true);
    });
  });

  describe('hold', () => {
    beforeEach(() => { player.reset(); });

    it('stores current type and advances to next piece on first hold', () => {
      const originalType = player._currentType;
      const nextType     = player._nextType;
      player.hold();
      expect(player._holdType).toBe(originalType);
      expect(player._currentType).toBe(nextType);
    });

    it('sets canHold to false after hold', () => {
      player.hold();
      expect(player.canHold).toBe(false);
    });

    it('returns null when hold is blocked (canHold=false)', () => {
      player.hold();
      expect(player.hold()).toBeNull();
    });

    it('swaps current and hold on second hold', () => {
      const firstType = player._currentType;
      player.hold();
      const heldType = player._holdType; // should be firstType
      player.reset(); // new piece to allow hold again
      player.hold();  // swap
      expect(player._currentType).toBe(heldType);
    });

    it('emits piece:hold with the held matrix', () => {
      const handler = vi.fn();
      player.on('piece:hold', handler);
      player.hold();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0]).not.toBeNull();
    });

    it('emits piece:next when advancing to next (first hold)', () => {
      const handler = vi.fn();
      player.on('piece:next', handler);
      player.hold();
      expect(handler).toHaveBeenCalledOnce();
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
      player.matrix = [[1]];
      player.pos.x = arena.width - 1;
      player.move(1);
      expect(player.pos.x).toBe(arena.width - 1);
    });

    it('emits piece:moved on successful move', () => {
      const handler = vi.fn();
      player.on('piece:moved', handler);
      player.move(1);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not emit piece:moved when blocked', () => {
      const handler = vi.fn();
      player.on('piece:moved', handler);
      player.pos.x = 0;
      player.move(-1);
      expect(handler).not.toHaveBeenCalled();
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
      player.matrix = [[1]];
      player.pos.y = arena.height - 1;
      expect(player.drop().locked).toBe(true);
    });

    it('returns pendingRows when a line is completed', () => {
      arena.grid[19].fill(1);
      player.matrix = [[1]];
      player.pos = { x: 0, y: 18 };
      const { locked, pendingRows } = player.drop();
      expect(locked).toBe(true);
      expect(pendingRows).toContain(19);
    });

    it('emits piece:locked when locking', () => {
      const handler = vi.fn();
      player.on('piece:locked', handler);
      player.matrix = [[1]];
      player.pos.y = arena.height - 1;
      player.drop();
      expect(handler).toHaveBeenCalledOnce();
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

  describe('commitClear — standard scoring', () => {
    it('scores 100 × level for 1 line (level 1 = 100)', () => {
      player.commitClear([19]);
      expect(player.score).toBe(100);
    });

    it('scores 300 × level for 2 lines (level 1 = 300)', () => {
      player.commitClear([18, 19]);
      expect(player.score).toBe(300);
    });

    it('scores 500 × level for 3 lines (level 1 = 500)', () => {
      player.commitClear([17, 18, 19]);
      expect(player.score).toBe(500);
    });

    it('scores 800 × level for 4 lines — Tetris (level 1 = 800)', () => {
      player.commitClear([16, 17, 18, 19]);
      expect(player.score).toBe(800);
    });

    it('scores 1200 × level for back-to-back Tetris (level 1 = 1200)', () => {
      player.commitClear([16, 17, 18, 19]); // first Tetris
      player.totalLines = 0; // keep level 1 for assertion clarity
      player.score = 0;
      player.commitClear([16, 17, 18, 19]); // back-to-back
      expect(player.score).toBe(1200);
    });

    it('scales with level', () => {
      player.totalLines = 10; // level 2
      player.commitClear([19]);
      expect(player.score).toBe(200); // 100 × 2
    });

    it('emits score:changed with the updated score', () => {
      const handler = vi.fn();
      player.on('score:changed', handler);
      player.commitClear([19]);
      expect(handler).toHaveBeenCalledWith(100);
    });

    it('emits lines:cleared with the number of lines', () => {
      const handler = vi.fn();
      player.on('lines:cleared', handler);
      player.commitClear([18, 19]);
      expect(handler).toHaveBeenCalledWith(2);
    });

    it('emits level:changed when crossing a level threshold', () => {
      const handler = vi.fn();
      player.on('level:changed', handler);
      player.totalLines = 9;
      player.commitClear([19]);
      expect(handler).toHaveBeenCalledWith(2);
    });

    it('does not emit level:changed when level stays the same', () => {
      const handler = vi.fn();
      player.on('level:changed', handler);
      player.commitClear([19]);
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
