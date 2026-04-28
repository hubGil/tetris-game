export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Matrix = CellValue[][];
export type Position = {
  x: number;
  y: number;
};

export type PieceType = 'T' | 'O' | 'L' | 'J' | 'I' | 'S' | 'Z';
export type RotationState = 0 | 1 | 2 | 3;

export type ControlAction =
  | 'moveLeft'
  | 'moveRight'
  | 'drop'
  | 'hardDrop'
  | 'hold'
  | 'rotateLeft'
  | 'rotateRight'
  | 'pause'
  | 'mute';

export type GameState = 'idle' | 'running' | 'paused' | 'flashing' | 'gameover';
export type GameMode = 'marathon' | 'sprint' | 'ultra' | 'zen';
export type AppTheme = 'neon' | 'sunset';

export type ScoreEntry = {
  score: number;
  date: string;
};

export type ActionBindings = Record<ControlAction, string>;

export type AppSettings = {
  volume: number;
  touchThreshold: number;
  tapMs: number;
  theme: AppTheme;
  bindings: ActionBindings;
};

export type PlayerEvents = {
  'score:changed': [score: number];
  'level:changed': [level: number];
  'combo:changed': [combo: number];
  'piece:next': [matrix: Matrix];
  'piece:hold': [matrix: Matrix | null];
  'piece:moved': [];
  'piece:rotated': [];
  'piece:locked': [{ pendingRows: number[] }];
  'lines:cleared': [lines: number];
};

export type LastClearKind =
  | 'none'
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 'tspin';

export type LockResult = {
  pendingRows: number[];
};

export type ClearResult = {
  lines: number;
  scoreDelta: number;
  combo: number;
  isBackToBack: boolean;
  isTSpin: boolean;
  clearKind: LastClearKind;
};

export type SessionStats = {
  mode: GameMode;
  elapsedMs: number;
  remainingMs: number | null;
  totalLines: number;
};

export type GameEvents = {
  gameover: [
    {
      score: number;
      isNewRecord: boolean;
      title?: string;
      subtitle?: string;
      mode: GameMode;
    },
  ];
  'state:changed': [state: GameState];
  'mode:changed': [mode: GameMode];
  'session:changed': [stats: SessionStats];
};
