import type { ScoreEntry } from '@/types.js';

const KEY_HIGH_SCORE = 'tetris:highScore';
const KEY_SCORES = 'tetris:scores';
const MAX_SCORES = 5;

function normalizeScore(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function isScoreEntry(value: unknown): value is ScoreEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'score' in value &&
    'date' in value &&
    typeof (value as ScoreEntry).date === 'string'
  );
}

function sanitizeScoreEntry(value: unknown): ScoreEntry | null {
  if (!isScoreEntry(value)) return null;
  if (typeof (value as ScoreEntry).score !== 'number') return null;

  const score = normalizeScore((value as ScoreEntry).score);
  const date = (value as ScoreEntry).date.trim();
  if (date.length === 0) return null;

  return {
    score,
    date,
  };
}

export class Storage {
  getHighScore(): number {
    const value = Number.parseInt(
      localStorage.getItem(KEY_HIGH_SCORE) ?? '0',
      10,
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  saveScore(score: number): boolean {
    const normalizedScore = normalizeScore(score);
    const isNewRecord = normalizedScore > this.getHighScore();
    if (isNewRecord) {
      localStorage.setItem(KEY_HIGH_SCORE, String(normalizedScore));
    }

    const scores = this.getScores();
    scores.unshift({
      score: normalizedScore,
      date: new Date().toLocaleDateString('pt-BR'),
    });
    scores.splice(MAX_SCORES);
    localStorage.setItem(KEY_SCORES, JSON.stringify(scores));

    return isNewRecord;
  }

  getScores(): ScoreEntry[] {
    try {
      const raw = JSON.parse(
        localStorage.getItem(KEY_SCORES) ?? '[]',
      ) as unknown;
      if (!Array.isArray(raw)) return [];

      return raw
        .map((entry) => sanitizeScoreEntry(entry))
        .filter((entry): entry is ScoreEntry => entry !== null)
        .slice(0, MAX_SCORES);
    } catch {
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(KEY_HIGH_SCORE);
    localStorage.removeItem(KEY_SCORES);
  }
}
