import { PieceBag } from '@/bag.js';
import { EventEmitter } from '@/event-emitter.js';
import { clonePiece, PIECES } from '@/pieces.js';
import type { Arena } from '@/arena.js';
import type { Matrix, PieceType, PlayerEvents } from '@/types.js';

const BASE_SCORES = [0, 100, 300, 500, 800];

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
  _lastClearTetris = false;

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
    this._lastClearTetris = false;
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

    this.pos.y = 0;
    this.pos.x =
      Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    this.canHold = false;
    this.holdMatrix = clonePiece(this._holdType);
    this.emit('piece:hold', this.holdMatrix);

    return !this.arena.collides(this.matrix, this.pos);
  }

  move(dir: number): void {
    if (!this.matrix) return;

    this.pos.x += dir;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.x -= dir;
      return;
    }

    this.emit('piece:moved');
  }

  rotate(dir: number): void {
    if (!this.matrix) return;

    const savedX = this.pos.x;
    this._rotateMatrix(this.matrix, dir);
    let offset = 1;

    while (this.arena.collides(this.matrix, this.pos)) {
      this.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));

      if (Math.abs(offset) > this.matrix[0].length) {
        this._rotateMatrix(this.matrix, -dir);
        this.pos.x = savedX;
        return;
      }
    }

    this.emit('piece:rotated');
  }

  drop(): { locked: boolean; pendingRows: number[] } {
    if (!this.matrix) return { locked: false, pendingRows: [] };

    this.pos.y += 1;
    if (!this.arena.collides(this.matrix, this.pos)) {
      return { locked: false, pendingRows: [] };
    }

    this.pos.y -= 1;
    this.arena.merge(this.matrix, this.pos);
    const pendingRows = this.arena.findCompleteRows();
    this.emit('piece:locked', { pendingRows });
    return { locked: true, pendingRows };
  }

  hardDrop(): { locked: true; pendingRows: number[] } {
    if (!this.matrix) return { locked: true, pendingRows: [] };

    while (
      !this.arena.collides(this.matrix, { x: this.pos.x, y: this.pos.y + 1 })
    ) {
      this.pos.y += 1;
    }

    this.arena.merge(this.matrix, this.pos);
    const pendingRows = this.arena.findCompleteRows();
    this.emit('piece:locked', { pendingRows });
    return { locked: true, pendingRows };
  }

  commitClear(pendingRows: number[]): void {
    const lines = this.arena.clearRows(pendingRows);
    this._addScore(lines);
  }

  private _addScore(lines: number): void {
    if (lines === 0) {
      this._lastClearTetris = false;
      if (this.combo !== 0) {
        this.combo = 0;
        this.emit('combo:changed', 0);
      }
      return;
    }

    const prevLevel = this.level;
    this.totalLines += lines;
    this.combo += 1;

    const isTetris = lines >= 4;
    const multiplier = isTetris && this._lastClearTetris ? 1.5 : 1;
    this.score += Math.floor(
      BASE_SCORES[Math.min(lines, 4)] * this.level * multiplier,
    );
    this._lastClearTetris = isTetris;

    this.emit('score:changed', this.score);
    this.emit('combo:changed', this.combo);
    this.emit('lines:cleared', lines);
    if (this.level !== prevLevel) this.emit('level:changed', this.level);
  }

  private _rotateMatrix(matrix: Matrix, dir: number): void {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < y; x += 1) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }

    if (dir > 0) {
      matrix.forEach((row) => row.reverse());
      return;
    }

    matrix.reverse();
  }
}
