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

  // Returns number of lines cleared
  sweep() {
    let linesCleared = 0;
    for (let y = this.grid.length - 1; y > 0; y--) {
      if (this.grid[y].every(cell => cell !== 0)) {
        const row = this.grid.splice(y, 1)[0].fill(0);
        this.grid.unshift(row);
        y++;
        linesCleared++;
      }
    }
    return linesCleared;
  }

  reset() {
    this.grid = this._createGrid();
  }

  _createGrid() {
    return Array.from({ length: this.height }, () => new Array(this.width).fill(0));
  }
}
