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

  it('starts in running state after a successful reset', () => {
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

    game.start();

    expect(game.state).toBe('running');
  });

  it('toggles between running and paused', () => {
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

    game.start();
    game.togglePause();
    expect(game.state).toBe('paused');

    game.togglePause();
    expect(game.state).toBe('running');
  });
});
