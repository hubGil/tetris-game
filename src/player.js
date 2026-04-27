import { EventEmitter } from '@/event-emitter.js';
import { PIECES }       from '@/pieces.js';
import { PieceBag }     from '@/bag.js';

// Standard Tetris scoring: 1=100, 2=300, 3=500, 4(Tetris)=800 — multiplied by level
const BASE_SCORES = [0, 100, 300, 500, 800];

export class Player extends EventEmitter {
  constructor(arena) {
    super();
    this.arena      = arena;
    this.pos        = { x: 0, y: 0 };
    this.matrix     = null;
    this.nextMatrix = null;
    this.holdMatrix = null;
    this.score      = 0;
    this.totalLines = 0;
    this.canHold    = true;

    this._bag             = new PieceBag(Object.keys(PIECES));
    this._currentType     = null;
    this._nextType        = null;
    this._holdType        = null;
    this._lastClearTetris = false;
  }

  get level() {
    return Math.floor(this.totalLines / 10) + 1;
  }

  resetStats() {
    this.score      = 0;
    this.totalLines = 0;
    this.holdMatrix = null;
    this.canHold    = true;
    this._bag             = new PieceBag(Object.keys(PIECES));
    this._currentType     = null;
    this._nextType        = null;
    this._holdType        = null;
    this._lastClearTetris = false;
    this.emit('score:changed', 0);
    this.emit('level:changed', 1);
    this.emit('piece:hold', null);
  }

  // Returns false if spawn position collides (game over)
  reset() {
    this.canHold = true;
    if (!this._nextType) this._nextType = this._bag.next();
    this._currentType = this._nextType;
    this.matrix       = PIECES[this._currentType].map(row => [...row]);
    this._nextType    = this._bag.next();
    this.nextMatrix   = PIECES[this._nextType].map(row => [...row]);
    this.emit('piece:next', this.nextMatrix);
    this.pos.y = 0;
    this.pos.x = Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    return !this.arena.collides(this.matrix, this.pos);
  }

  // Returns false on game over, null if hold is blocked (already used this piece)
  hold() {
    if (!this.canHold) return null;

    if (this._holdType === null) {
      // First hold: stash current, advance to next
      this._holdType    = this._currentType;
      this._currentType = this._nextType;
      this.matrix       = PIECES[this._currentType].map(row => [...row]);
      this._nextType    = this._bag.next();
      this.nextMatrix   = PIECES[this._nextType].map(row => [...row]);
      this.emit('piece:next', this.nextMatrix);
    } else {
      // Swap current ↔ hold (both reset to spawn orientation)
      [this._holdType, this._currentType] = [this._currentType, this._holdType];
      this.matrix = PIECES[this._currentType].map(row => [...row]);
    }

    this.pos.y = 0;
    this.pos.x = Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    this.canHold    = false;
    this.holdMatrix = PIECES[this._holdType].map(row => [...row]);
    this.emit('piece:hold', this.holdMatrix);

    return !this.arena.collides(this.matrix, this.pos);
  }

  move(dir) {
    this.pos.x += dir;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.x -= dir;
    } else {
      this.emit('piece:moved');
    }
  }

  rotate(dir) {
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

  // Returns { locked, pendingRows } — rows NOT cleared yet (Game handles flash + clear)
  drop() {
    this.pos.y++;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.y--;
      this.arena.merge(this.matrix, this.pos);
      const pendingRows = this.arena.findCompleteRows();
      this.emit('piece:locked', { pendingRows });
      return { locked: true, pendingRows };
    }
    return { locked: false, pendingRows: [] };
  }

  hardDrop() {
    while (!this.arena.collides(this.matrix, { x: this.pos.x, y: this.pos.y + 1 })) {
      this.pos.y++;
    }
    this.arena.merge(this.matrix, this.pos);
    const pendingRows = this.arena.findCompleteRows();
    this.emit('piece:locked', { pendingRows });
    return { locked: true, pendingRows };
  }

  // Called by Game after the flash animation completes
  commitClear(pendingRows) {
    const lines = this.arena.clearRows(pendingRows);
    this._addScore(lines);
  }

  _addScore(lines) {
    if (lines === 0) return;
    const prevLevel = this.level;
    this.totalLines += lines;

    const isTetris   = lines >= 4;
    const multiplier = (isTetris && this._lastClearTetris) ? 1.5 : 1;
    this.score += Math.floor(BASE_SCORES[Math.min(lines, 4)] * this.level * multiplier);
    this._lastClearTetris = isTetris;

    this.emit('score:changed', this.score);
    this.emit('lines:cleared', lines);
    if (this.level !== prevLevel) this.emit('level:changed', this.level);
  }

  _rotateMatrix(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < y; x++) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if (dir > 0) {
      matrix.forEach(row => row.reverse());
    } else {
      matrix.reverse();
    }
  }
}
