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

    return { arena, player, game };
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

  it('ends sprint when the line target is reached', () => {
    const { game, player } = createGame();
    const handler = vi.fn();
    game.on('gameover', handler);

    game.start('sprint');
    player.totalLines = 39;
    player.commitClear = vi.fn(() => {
      player.totalLines = 40;
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
});
