import { COLORS } from '@/pieces.js';
import type { Arena } from '@/arena.js';
import type { Player } from '@/player.js';
import type { Matrix, Position } from '@/types.js';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly cellSize: number;

  constructor(canvas: HTMLCanvasElement, cellSize = 20) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context is not available.');
    }

    this.canvas = canvas;
    this.ctx = context;
    this.cellSize = cellSize;
    this.ctx.scale(cellSize, cellSize);
  }

  render(arena: Arena, player: Player): void {
    this._clear();
    this._drawMatrix(arena.grid, { x: 0, y: 0 });
    this._drawGhost(arena, player);
    if (player.matrix) this._drawMatrix(player.matrix, player.pos);
  }

  renderFlash(rows: number[], progress: number): void {
    const blink = Math.sin(progress * Math.PI * 6) > 0;
    if (!blink) return;

    this.ctx.globalAlpha = 0.85 * (1 - progress * 0.6);
    this.ctx.fillStyle = '#fff';
    rows.forEach((y) => {
      this.ctx.fillRect(0, y, this.canvas.width / this.cellSize, 1);
    });
    this.ctx.globalAlpha = 1;
  }

  renderPreview(matrix: Matrix | null): void {
    const logicalWidth = this.canvas.width / this.cellSize;
    const logicalHeight = this.canvas.height / this.cellSize;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    if (!matrix) return;

    const offsetX = Math.floor((logicalWidth - matrix[0].length) / 2);
    const offsetY = Math.floor((logicalHeight - matrix.length) / 2);
    this._drawMatrix(matrix, { x: offsetX, y: offsetY });
  }

  private _clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(
      0,
      0,
      this.canvas.width / this.cellSize,
      this.canvas.height / this.cellSize,
    );
  }

  private _drawGhost(arena: Arena, player: Player): void {
    if (!player.matrix) return;

    const ghostPos = { x: player.pos.x, y: player.pos.y };
    while (
      !arena.collides(player.matrix, { x: ghostPos.x, y: ghostPos.y + 1 })
    ) {
      ghostPos.y += 1;
    }

    if (ghostPos.y === player.pos.y) return;

    this.ctx.globalAlpha = 0.2;
    this._drawMatrix(player.matrix, ghostPos);
    this.ctx.globalAlpha = 1;
  }

  private _drawMatrix(matrix: number[][], offset: Position): void {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value === 0) return;

        this.ctx.fillStyle = COLORS[value] ?? '#fff';
        this.ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
      });
    });
  }
}
