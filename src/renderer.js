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
    this._drawGhost(arena, player);
    this._drawMatrix(player.matrix, player.pos);
  }

  renderPreview(matrix) {
    const { ctx, canvas, cellSize } = this;
    const logicalW = canvas.width / cellSize;
    const logicalH = canvas.height / cellSize;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, logicalW, logicalH);
    const offsetX = Math.floor((logicalW - matrix[0].length) / 2);
    const offsetY = Math.floor((logicalH - matrix.length) / 2);
    this._drawMatrix(matrix, { x: offsetX, y: offsetY });
  }

  _clear() {
    const { ctx, canvas, cellSize } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width / cellSize, canvas.height / cellSize);
  }

  _drawGhost(arena, player) {
    const ghostPos = { x: player.pos.x, y: player.pos.y };
    while (!arena.collides(player.matrix, { x: ghostPos.x, y: ghostPos.y + 1 })) {
      ghostPos.y++;
    }
    if (ghostPos.y === player.pos.y) return;
    this.ctx.globalAlpha = 0.2;
    this._drawMatrix(player.matrix, ghostPos);
    this.ctx.globalAlpha = 1;
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
