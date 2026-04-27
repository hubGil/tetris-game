import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Storage } from '@/storage.js';

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe('Storage', () => {
  let storage: Storage;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storage = new Storage();
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('returns 0 when high score storage is invalid', () => {
    localStorageMock.setItem('tetris:highScore', 'invalid');
    expect(storage.getHighScore()).toBe(0);
  });

  it('filters malformed score entries from persisted scores', () => {
    localStorageMock.setItem(
      'tetris:scores',
      JSON.stringify([
        { score: 1200, date: '01/01/2026' },
        { score: 'bad', date: '02/01/2026' },
        { score: 500, date: '' },
      ]),
    );

    expect(storage.getScores()).toEqual([{ score: 1200, date: '01/01/2026' }]);
  });

  it('normalizes persisted scores before saving new ones', () => {
    localStorageMock.setItem(
      'tetris:scores',
      JSON.stringify([
        { score: Number.NaN, date: '01/01/2026' },
        { score: 10.8, date: '02/01/2026' },
      ]),
    );

    storage.saveScore(25.9);

    const saved = JSON.parse(
      localStorageMock.setItem.mock.calls.at(-1)?.[1] as string,
    ) as Array<{ score: number; date: string }>;

    expect(saved[0].score).toBe(25);
    expect(saved[1].score).toBe(10);
  });
});
