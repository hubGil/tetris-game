import { PIECES } from './pieces.js';

export class Player {
  constructor(arena) {
    this.arena = arena;
    this.pos = { x: 0, y: 0 };
    this.matrix = null;
    this.nextMatrix = null;
    this.score = 0;
    this.totalLines = 0;
  }

  get level() {
    return Math.floor(this.totalLines / 10) + 1;
  }

  // Returns false if spawn position collides (game over)
  reset() {
    if (!this.nextMatrix) {
      this.nextMatrix = this._randomPiece();
    }
    this.matrix = this.nextMatrix;
    this.nextMatrix = this._randomPiece();
    this.pos.y = 0;
    this.pos.x = Math.floor(this.arena.width / 2) - Math.floor(this.matrix[0].length / 2);
    return !this.arena.collides(this.matrix, this.pos);
  }

  move(dir) {
    this.pos.x += dir;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.x -= dir;
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
  }

  // Returns { locked, pendingRows } — rows NOT cleared yet (Game handles flash + clear)
  drop() {
    this.pos.y++;
    if (this.arena.collides(this.matrix, this.pos)) {
      this.pos.y--;
      this.arena.merge(this.matrix, this.pos);
      return { locked: true, pendingRows: this.arena.findCompleteRows() };
    }
    return { locked: false, pendingRows: [] };
  }

  hardDrop() {
    while (!this.arena.collides(this.matrix, { x: this.pos.x, y: this.pos.y + 1 })) {
      this.pos.y++;
    }
    this.arena.merge(this.matrix, this.pos);
    return { locked: true, pendingRows: this.arena.findCompleteRows() };
  }

  // Called by Game after the flash animation completes
  commitClear(pendingRows) {
    const lines = this.arena.clearRows(pendingRows);
    this._addScore(lines);
  }

  trigger(action) {
    if (this._handlers?.[action]) this._handlers[action]();
  }

  _randomPiece() {
    const types = Object.keys(PIECES);
    const type = types[Math.floor(Math.random() * types.length)];
    return PIECES[type].map(row => [...row]);
  }

  _addScore(lines) {
    this.totalLines += lines;
    let multiplier = 1;
    for (let i = 0; i < lines; i++) {
      this.score += multiplier * 10;
      multiplier *= 2;
    }
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
