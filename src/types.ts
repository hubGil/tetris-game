export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Matrix = CellValue[][];
export type Position = {
  x: number;
  y: number;
};

export type PieceType = 'T' | 'O' | 'L' | 'J' | 'I' | 'S' | 'Z';

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

export type ScoreEntry = {
  score: number;
  date: string;
};

export type PlayerEvents = {
  'score:changed': [score: number];
  'level:changed': [level: number];
  'piece:next': [matrix: Matrix];
  'piece:hold': [matrix: Matrix | null];
  'piece:moved': [];
  'piece:rotated': [];
  'piece:locked': [{ pendingRows: number[] }];
  'lines:cleared': [lines: number];
};

export type GameEvents = {
  gameover: [{ score: number; isNewRecord: boolean }];
  'state:changed': [state: GameState];
};
