import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Arena } from '@/arena.js';
import { Game } from '@/game.js';
import { Player } from '@/player.js';

describe('Game', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: vi.fn(() => 0) });
  });

  function createControlsStub() {
    return {
      on: vi.fn().mockReturnThis(),
      onRelease: vi.fn().mockReturnThis(),
      isPressed: vi.fn(() => false),
    };
  }

  function createGame() {
    const arena = new Arena(12, 20);
    const player = new Player(arena);
    const controls = createControlsStub();
    const renderer = {
      render: vi.fn(),
      renderFlash: vi.fn(),
    };

    const game = new Game({
      arena,
      player,
      renderer: renderer as never,
      controls: controls as never,
      storage: null,
      overlayEl: null,
      highScoreEl: null,
      scoresEl: null,
    });

    return { arena, player, controls, game };
  }

  it('starts in running state after a successful reset', () => {
    const { game } = createGame();
    game.start();

    expect(game.state).toBe('running');
  });

  it('toggles between running and paused', () => {
    const { game } = createGame();
    game.start();
    game.togglePause();
    expect(game.state).toBe('paused');

    game.togglePause();
    expect(game.state).toBe('running');
  });

  it('starts in the selected mode', () => {
    const { game } = createGame();

    game.start('zen');

    expect(game.mode).toBe('zen');
  });

  it('emits session stats when a game starts', () => {
    const { game } = createGame();
    const handler = vi.fn();
    game.on('session:changed', handler);

    game.start('ultra');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'ultra',
        totalLines: 0,
        remainingMs: 120000,
      }),
    );
  });

  it('ends sprint when the line target is reached', () => {
    const { game, player } = createGame();
    const handler = vi.fn();
    game.on('gameover', handler);

    game.start('sprint');
    player.totalLines = 39;
    player.commitClear = vi.fn(() => {
      player.totalLines = 40;
      return {
        lines: 1,
        scoreDelta: 100,
        combo: 1,
        isBackToBack: false,
        isTSpin: false,
        clearKind: 'single' as const,
      };
    });
    player.reset = vi.fn(() => true);

    (
      game as unknown as { _finalizeLock: (rows: number[]) => void }
    )._finalizeLock([19]);

    expect(game.state).toBe('gameover');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'sprint',
        title: 'SPRINT COMPLETO',
      }),
    );
  });

  it('ends ultra when the timer expires', () => {
    const { game } = createGame();
    const handler = vi.fn();
    game.on('gameover', handler);

    game.start('ultra');
    (
      game as unknown as { _lastTime: number; _loop: (time: number) => void }
    )._lastTime = 1;
    (
      game as unknown as { _elapsedMs: number; _loop: (time: number) => void }
    )._elapsedMs = 119999;

    (game as unknown as { _loop: (time: number) => void })._loop(2);

    expect(game.state).toBe('gameover');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'ultra',
        title: 'ULTRA FINALIZADO',
      }),
    );
  });
});
