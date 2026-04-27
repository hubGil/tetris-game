import type { ScoreEntry } from '@/types.js';

const KEY_HIGH_SCORE = 'tetris:highScore';
const KEY_SCORES = 'tetris:scores';
const MAX_SCORES = 5;

function isScoreEntry(value: unknown): value is ScoreEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ScoreEntry).score === 'number' &&
    typeof (value as ScoreEntry).date === 'string'
  );
}

export class Storage {
  getHighScore(): number {
    return Number.parseInt(localStorage.getItem(KEY_HIGH_SCORE) ?? '0', 10);
  }

  saveScore(score: number): boolean {
    const isNewRecord = score > this.getHighScore();
    if (isNewRecord) {
      localStorage.setItem(KEY_HIGH_SCORE, String(score));
    }

    const scores = this.getScores();
    scores.unshift({ score, date: new Date().toLocaleDateString('pt-BR') });
    scores.splice(MAX_SCORES);
    localStorage.setItem(KEY_SCORES, JSON.stringify(scores));

    return isNewRecord;
  }

  getScores(): ScoreEntry[] {
    try {
      const raw = JSON.parse(
        localStorage.getItem(KEY_SCORES) ?? '[]',
      ) as unknown;
      return Array.isArray(raw) ? raw.filter(isScoreEntry) : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(KEY_HIGH_SCORE);
    localStorage.removeItem(KEY_SCORES);
  }
}
