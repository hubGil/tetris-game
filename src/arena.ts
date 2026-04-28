import type { Matrix, Position } from '@/types.js';

export class Arena {
  readonly width: number;
  readonly height: number;
  grid: number[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = this._createGrid();
  }

  collides(matrix: Matrix, pos: Position): boolean {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (
          matrix[y][x] !== 0 &&
          (this.grid[y + pos.y]?.[x + pos.x] ?? 0) !== 0
        ) {
          return true;
        }
      }
    }
    return false;
  }

  merge(matrix: Matrix, pos: Position): void {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          this.grid[y + pos.y][x + pos.x] = value;
        }
      });
    });
  }

  findCompleteRows(): number[] {
    return this.grid
      .map((row, y) => ({ row, y }))
      .filter(({ row }) => row.every((cell) => cell !== 0))
      .map(({ y }) => y);
  }

  clearRows(indices: number[]): number {
    const sortedIndices = [...indices].sort((left, right) => right - left);

    sortedIndices.forEach((y) => {
      this.grid.splice(y, 1);
    });

    sortedIndices.forEach(() => {
      this.grid.unshift(new Array(this.width).fill(0));
    });

    return indices.length;
  }

  sweep(): number {
    return this.clearRows(this.findCompleteRows());
  }

  reset(): void {
    this.grid = this._createGrid();
  }

  private _createGrid(): number[][] {
    return Array.from({ length: this.height }, () =>
      new Array(this.width).fill(0),
    );
  }
}
