import { COLORS } from './pieces.js';

export class Renderer {
  constructor(canvas, cellSize = 20) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = cellSize;
    this.ctx.scale(cellSize, cellSize);
  }

  render(arena, player) {
    this._clear();
    this._drawMatrix(arena.grid, { x: 0, y: 0 });
    this._drawMatrix(player.matrix, player.pos);
  }

  _clear() {
    const { ctx, canvas, cellSize } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width / cellSize, canvas.height / cellSize);
  }

  _drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          this.ctx.fillStyle = COLORS[value];
          this.ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
        }
      });
    });
  }
}
