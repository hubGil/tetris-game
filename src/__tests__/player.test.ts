import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Arena } from '@/arena.js';
import { Player } from '@/player.js';

describe('Player', () => {
  let arena: Arena;
  let player: Player;

  beforeEach(() => {
    arena = new Arena(12, 20);
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
    it('resets score, combo and totalLines', () => {
      player.score = 500;
      player.combo = 3;
      player.totalLines = 15;
      player.resetStats();
      expect(player.score).toBe(0);
      expect(player.combo).toBe(0);
      expect(player.totalLines).toBe(0);
    });

    it('emits the reset events', () => {
      const scoreHandler = vi.fn();
      const levelHandler = vi.fn();
      const comboHandler = vi.fn();
      player.on('score:changed', scoreHandler);
      player.on('level:changed', levelHandler);
      player.on('combo:changed', comboHandler);

      player.resetStats();

      expect(scoreHandler).toHaveBeenCalledWith(0);
      expect(levelHandler).toHaveBeenCalledWith(1);
      expect(comboHandler).toHaveBeenCalledWith(0);
    });
  });

  describe('reset', () => {
    it('spawns a piece with a valid position', () => {
      player.reset();
      expect(player.matrix).not.toBeNull();
      expect(player.pos.y).toBe(0);
    });

    it('returns false when the spawn position is blocked', () => {
      player.reset();
      for (let y = 0; y < arena.height; y += 1) arena.grid[y].fill(1);
      expect(player.reset()).toBe(false);
    });
  });

  describe('hold', () => {
    beforeEach(() => {
      player.reset();
    });

    it('stores current type and advances to next piece on first hold', () => {
      const originalType = player._currentType;
      const nextType = player._nextType;
      player.hold();
      expect(player._holdType).toBe(originalType);
      expect(player._currentType).toBe(nextType);
    });

    it('resets rotation state on hold', () => {
      player._rotationState = 2;
      player.hold();
      expect(player._rotationState).toBe(0);
    });
  });

  describe('move', () => {
    beforeEach(() => {
      player.reset();
    });

    it('moves right when the path is clear', () => {
      const startX = player.pos.x;
      expect(player.move(1)).toBe(true);
      expect(player.pos.x).toBe(startX + 1);
    });

    it('returns false when blocked by a wall', () => {
      player.matrix = [[1]];
      player.pos.x = 0;
      expect(player.move(-1)).toBe(false);
      expect(player.pos.x).toBe(0);
    });
  });

  describe('rotate', () => {
    it('uses SRS wall kicks for the I piece near the wall', () => {
      player.matrix = [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
      player._currentType = 'I';
      player.pos = { x: -1, y: 1 };

      expect(player.rotate(1)).toBe(true);
      expect(player._rotationState).toBe(1);
      expect(player.pos.x).toBeGreaterThanOrEqual(0);
    });
  });

  describe('softDrop', () => {
    beforeEach(() => {
      player.reset();
    });

    it('moves the piece down one cell when possible', () => {
      const startY = player.pos.y;
      expect(player.softDrop()).toBe(true);
      expect(player.pos.y).toBe(startY + 1);
    });

    it('returns false when the piece is grounded', () => {
      player.matrix = [[1]];
      player.pos = { x: 0, y: arena.height - 1 };
      expect(player.softDrop()).toBe(false);
    });

    it('adds score for manual soft drop', () => {
      player.addSoftDropScore(3);
      expect(player.score).toBe(3);
    });

    it('adds double score for hard drop distance', () => {
      player.addHardDropScore(4);
      expect(player.score).toBe(8);
    });
  });

  describe('lock and hardDrop', () => {
    it('hardDrop moves to the floor and locks', () => {
      player.reset();
      const result = player.hardDrop();
      expect(result.distance).toBeGreaterThan(0);
      expect(result.pendingRows).toEqual(expect.any(Array));
    });

    it('detects a T-Spin when three corners are occupied after rotation', () => {
      player.matrix = [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
      player._currentType = 'T';
      player._lastAction = 'rotate';
      player.pos = { x: 4, y: 0 };

      arena.grid[0][4] = 9;
      arena.grid[0][6] = 9;
      arena.grid[2][4] = 9;

      player.lock();

      expect(player._lastLockWasTSpin).toBe(true);
    });
  });

  describe('commitClear', () => {
    it('scores a single line clear', () => {
      player.commitClear([19]);
      expect(player.score).toBe(100);
    });

    it('applies back-to-back bonus on consecutive tetrises', () => {
      player.commitClear([16, 17, 18, 19]);
      player.totalLines = 0;
      player.score = 0;
      player.commitClear([16, 17, 18, 19]);
      expect(player.score).toBe(1250);
    });

    it('adds combo bonus on consecutive clears', () => {
      player.commitClear([19]);
      player.commitClear([18]);
      expect(player.score).toBe(250);
      expect(player.combo).toBe(2);
    });

    it('resets combo on a lock with no clear', () => {
      player.commitClear([19]);
      player.commitClear([]);
      expect(player.combo).toBe(0);
    });

    it('scores T-Spins with the guideline table', () => {
      player._lastLockWasTSpin = true;
      player.commitClear([19]);
      expect(player.score).toBe(800);
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
  });
});
