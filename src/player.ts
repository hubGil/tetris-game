import { PieceBag } from '@/bag.js';
import { EventEmitter } from '@/event-emitter.js';
import { clonePiece, PIECES } from '@/pieces.js';
import {
  getKickOffsets,
  nextRotationState,
  rotateMatrix,
} from '@/rotation-system.js';
import type { Arena } from '@/arena.js';
import type {
  ClearResult,
  LastClearKind,
  LockResult,
  Matrix,
  PieceType,
  PlayerEvents,
  RotationState,
} from '@/types.js';

const BASE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [400, 800, 1200, 1600];
const COMBO_BONUS = 50;

type LastAction = 'spawn' | 'move' | 'rotate' | 'drop' | 'hold' | 'none';

export class Player extends EventEmitter<PlayerEvents> {
  readonly arena: Arena;
  pos = { x: 0, y: 0 };
  matrix: Matrix | null = null;
  nextMatrix: Matrix | null = null;
  holdMatrix: Matrix | null = null;
  score = 0;
  totalLines = 0;
  combo = 0;
  canHold = true;

  _bag: PieceBag;
  _currentType: PieceType | null = null;
  _nextType: PieceType | null = null;
  _holdType: PieceType | null = null;
  _rotationState: RotationState = 0;
  _lastAction: LastAction = 'none';
  _lastLockWasTSpin = false;
  _backToBackActive = false;

  constructor(arena: Arena) {
    super();
    this.arena = arena;
    this._bag = new PieceBag(Object.keys(PIECES) as PieceType[]);
  }

  get level(): number {
    return Math.floor(this.totalLines / 10) + 1;
  }

  resetStats(): void {
    this.score = 0;
    this.totalLines = 0;
    this.combo = 0;
    this.holdMatrix = null;
    this.canHold = true;
    this._bag = new PieceBag(Object.keys(PIECES) as PieceType[]);
    this._currentType = null;
    this._nextType = null;
    this._holdType = null;
    this._rotationState = 0;
    this._lastAction = 'none';
    this._lastLockWasTSpin = false;
    this._backToBackActive = false;
    this.emit('score:changed', 0);
    this.emit('level:changed', 1);
    this.emit('combo:changed', 0);
    this.emit('piece:hold', null);
  }

  reset(): boolean {
    this.canHold = true;
    if (!this._nextType) this._nextType = this._bag.next();

    const currentType = this._nextType;
    this._currentType = currentType;
    this.matrix = clonePiece(currentType);
    this._rotationState = 0;
    this._lastAction = 'spawn';
    this._lastLockWasTSpin = false;

    this._nextType = this._bag.next();
    this.nextMatrix = clonePiece(this._nextType);
    this.emit('piece:next', this.nextMatrix);

    this.pos.y = 0;
    this.pos.x =
      Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    return !this.arena.collides(this.matrix, this.pos);
  }

  hold(): boolean | null {
    if (!this.canHold || !this.matrix || !this._currentType) return null;

    if (this._holdType === null) {
      this._holdType = this._currentType;
      this._currentType = this._nextType;
      this.matrix = clonePiece(this._currentType as PieceType);
      this._nextType = this._bag.next();
      this.nextMatrix = clonePiece(this._nextType);
      this.emit('piece:next', this.nextMatrix);
    } else {
      [this._holdType, this._currentType] = [this._currentType, this._holdType];
      this.matrix = clonePiece(this._currentType);
    }

    this._rotationState = 0;
    this._lastAction = 'hold';
    this.pos.y = 0;
    this.pos.x =
      Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    this.canHold = false;
    this.holdMatrix = clonePiece(this._holdType);
    this.emit('piece:hold', this.holdMatrix);

    return !this.arena.collides(this.matrix, this.pos);
  }

  move(dir: number): boolean {
    if (!this.matrix) return false;

    this.pos.x += dir;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.x -= dir;
      return false;
    }

    this._lastAction = 'move';
    this.emit('piece:moved');
    return true;
  }

  rotate(dir: number): boolean {
    if (!this.matrix || !this._currentType) return false;

    const rotated = rotateMatrix(this.matrix, dir);
    const from = this._rotationState;
    const to = nextRotationState(from, dir);
    const kickOffsets = getKickOffsets(this._currentType, from, to);

    for (const [dx, dy] of kickOffsets) {
      const nextPos = {
        x: this.pos.x + dx,
        y: this.pos.y + dy,
      };

      if (this.arena.collides(rotated, nextPos)) continue;

      this.matrix = rotated;
      this.pos = nextPos;
      this._rotationState = to;
      this._lastAction = 'rotate';
      this.emit('piece:rotated');
      return true;
    }

    return false;
  }

  softDrop(): boolean {
    if (!this.matrix) return false;

    const nextPos = { x: this.pos.x, y: this.pos.y + 1 };
    if (this.arena.collides(this.matrix, nextPos)) return false;

    this.pos = nextPos;
    this._lastAction = 'drop';
    return true;
  }

  hardDrop(): LockResult & { distance: number } {
    if (!this.matrix) return { pendingRows: [], distance: 0 };

    let distance = 0;
    while (this.softDrop()) {
      distance += 1;
    }

    return {
      ...this.lock(),
      distance,
    };
  }

  lock(): LockResult {
    if (!this.matrix) return { pendingRows: [] };

    this._lastLockWasTSpin = this._detectTSpin();
    this.arena.merge(this.matrix, this.pos);
    const pendingRows = this.arena.findCompleteRows();
    this._lastAction = 'none';
    this.emit('piece:locked', { pendingRows });
    return { pendingRows };
  }

  isGrounded(): boolean {
    if (!this.matrix) return false;

    return this.arena.collides(this.matrix, {
      x: this.pos.x,
      y: this.pos.y + 1,
    });
  }

  addSoftDropScore(cells = 1): void {
    if (cells <= 0) return;

    this.score += cells;
    this.emit('score:changed', this.score);
  }

  addHardDropScore(cells = 1): void {
    if (cells <= 0) return;

    this.score += cells * 2;
    this.emit('score:changed', this.score);
  }

  commitClear(pendingRows: number[]): ClearResult {
    const lines = this.arena.clearRows(pendingRows);
    return this._addScore(lines);
  }

  private _addScore(lines: number): ClearResult {
    const prevLevel = this.level;
    const isTSpin = this._lastLockWasTSpin;
    const clearKind = this._getClearKind(lines, isTSpin);
    const difficultClear = lines > 0 && (isTSpin || lines === 4);
    const isBackToBack = difficultClear && this._backToBackActive;
    let scoreDelta = 0;

    if (lines === 0) {
      if (isTSpin) {
        scoreDelta += TSPIN_SCORES[0] * this.level;
      }

      if (this.combo !== 0) {
        this.combo = 0;
        this.emit('combo:changed', 0);
      }

      if (scoreDelta > 0) {
        this.score += scoreDelta;
        this.emit('score:changed', this.score);
      }

      return {
        lines,
        scoreDelta,
        combo: this.combo,
        isBackToBack: false,
        isTSpin,
        clearKind,
      };
    }

    this.totalLines += lines;
    this.combo += 1;

    if (isTSpin) {
      scoreDelta += TSPIN_SCORES[Math.min(lines, 3)] * this.level;
    } else {
      scoreDelta += BASE_SCORES[Math.min(lines, 4)] * this.level;
    }

    if (isBackToBack) {
      scoreDelta = Math.floor(scoreDelta * 1.5);
    }

    if (this.combo > 1) {
      scoreDelta += (this.combo - 1) * COMBO_BONUS * this.level;
    }

    this.score += scoreDelta;

    if (difficultClear) {
      this._backToBackActive = true;
    } else {
      this._backToBackActive = false;
    }

    this.emit('score:changed', this.score);
    this.emit('combo:changed', this.combo);
    this.emit('lines:cleared', lines);
    if (this.level !== prevLevel) this.emit('level:changed', this.level);

    return {
      lines,
      scoreDelta,
      combo: this.combo,
      isBackToBack,
      isTSpin,
      clearKind,
    };
  }

  private _getClearKind(lines: number, isTSpin: boolean): LastClearKind {
    if (isTSpin) return 'tspin';
    if (lines === 4) return 'tetris';
    if (lines === 3) return 'triple';
    if (lines === 2) return 'double';
    if (lines === 1) return 'single';
    return 'none';
  }

  private _detectTSpin(): boolean {
    if (this._currentType !== 'T' || this._lastAction !== 'rotate') {
      return false;
    }

    const centerX = this.pos.x + 1;
    const centerY = this.pos.y + 1;
    const corners = [
      { x: centerX - 1, y: centerY - 1 },
      { x: centerX + 1, y: centerY - 1 },
      { x: centerX - 1, y: centerY + 1 },
      { x: centerX + 1, y: centerY + 1 },
    ];

    let occupiedCorners = 0;
    corners.forEach(({ x, y }) => {
      if (
        x < 0 ||
        x >= this.arena.width ||
        y < 0 ||
        y >= this.arena.height ||
        this.arena.grid[y][x] !== 0
      ) {
        occupiedCorners += 1;
      }
    });

    return occupiedCorners >= 3;
  }
}
