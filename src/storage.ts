import type {
  AppSettings,
  AppTheme,
  ControlAction,
  ScoreEntry,
} from '@/types.js';

const KEY_HIGH_SCORE = 'tetris:highScore';
const KEY_SCORES = 'tetris:scores';
const KEY_SETTINGS = 'tetris:settings';
const MAX_SCORES = 5;
const DEFAULT_BINDINGS: Record<ControlAction, string> = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  drop: 'ArrowDown',
  hardDrop: 'Space',
  hold: 'KeyC',
  rotateLeft: 'KeyQ',
  rotateRight: 'KeyW',
  pause: 'KeyP',
  mute: 'KeyM',
};
const DEFAULT_SETTINGS: AppSettings = {
  volume: 0.7,
  touchThreshold: 30,
  tapMs: 200,
  theme: 'neon',
  bindings: DEFAULT_BINDINGS,
};

function createDefaultSettings(): AppSettings {
  return {
    volume: DEFAULT_SETTINGS.volume,
    touchThreshold: DEFAULT_SETTINGS.touchThreshold,
    tapMs: DEFAULT_SETTINGS.tapMs,
    theme: DEFAULT_SETTINGS.theme,
    bindings: { ...DEFAULT_BINDINGS },
  };
}

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

function sanitizeTheme(value: unknown): AppTheme {
  return value === 'sunset' ? 'sunset' : 'neon';
}

function sanitizeBindings(value: unknown): Record<ControlAction, string> {
  const bindings = { ...DEFAULT_BINDINGS };
  if (typeof value !== 'object' || value === null) return bindings;

  (Object.keys(DEFAULT_BINDINGS) as ControlAction[]).forEach((action) => {
    const raw = (value as Record<string, unknown>)[action];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      bindings[action] = raw.trim();
    }
  });

  return bindings;
}

function sanitizeSettings(value: unknown): AppSettings {
  if (typeof value !== 'object' || value === null)
    return createDefaultSettings();

  const raw = value as Record<string, unknown>;
  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.max(0, Math.min(raw.volume, 1))
      : DEFAULT_SETTINGS.volume;
  const touchThreshold =
    typeof raw.touchThreshold === 'number' &&
    Number.isFinite(raw.touchThreshold) &&
    raw.touchThreshold >= 10 &&
    raw.touchThreshold <= 120
      ? Math.round(raw.touchThreshold)
      : DEFAULT_SETTINGS.touchThreshold;
  const tapMs =
    typeof raw.tapMs === 'number' &&
    Number.isFinite(raw.tapMs) &&
    raw.tapMs >= 80 &&
    raw.tapMs <= 400
      ? Math.round(raw.tapMs)
      : DEFAULT_SETTINGS.tapMs;

  return {
    volume,
    touchThreshold,
    tapMs,
    theme: sanitizeTheme(raw.theme),
    bindings: sanitizeBindings(raw.bindings),
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
    localStorage.removeItem(KEY_SETTINGS);
  }

  getSettings(): AppSettings {
    try {
      const raw = JSON.parse(
        localStorage.getItem(KEY_SETTINGS) ?? 'null',
      ) as unknown;
      return sanitizeSettings(raw);
    } catch {
      return createDefaultSettings();
    }
  }

  saveSettings(settings: AppSettings): AppSettings {
    const sanitized = sanitizeSettings(settings);
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(sanitized));
    return sanitized;
  }
}
