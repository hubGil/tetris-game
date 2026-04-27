export class Arena {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = this._createGrid();
  }

  collides(matrix, pos) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (
          matrix[y][x] !== 0 &&
          (this.grid[y + pos.y] && this.grid[y + pos.y][x + pos.x]) !== 0
        ) {
          return true;
        }
      }
    }
    return false;
  }

  merge(matrix, pos) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          this.grid[y + pos.y][x + pos.x] = value;
        }
      });
    });
  }

  // Returns indices of complete rows without clearing them
  findCompleteRows() {
    return this.grid
      .map((row, y) => ({ row, y }))
      .filter(({ row }) => row.every(cell => cell !== 0))
      .map(({ y }) => y);
  }

  // Clears specific rows by index and adds empty rows at top
  clearRows(indices) {
    [...indices].sort((a, b) => b - a).forEach(y => {
      this.grid.splice(y, 1);
      this.grid.unshift(new Array(this.width).fill(0));
    });
    return indices.length;
  }

  sweep() {
    return this.clearRows(this.findCompleteRows());
  }

  reset() {
    this.grid = this._createGrid();
  }

  _createGrid() {
    return Array.from({ length: this.height }, () => new Array(this.width).fill(0));
  }
}
