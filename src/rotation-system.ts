import type { Matrix, PieceType, RotationState } from '@/types.js';

type KickMap = Record<string, ReadonlyArray<readonly [number, number]>>;

const JLSTZ_KICKS: KickMap = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};

const I_KICKS: KickMap = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

export function rotateMatrix(matrix: Matrix, dir: number): Matrix {
  const rotated = matrix.map((row) => [...row]);

  for (let y = 0; y < rotated.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [rotated[x][y], rotated[y][x]] = [rotated[y][x], rotated[x][y]];
    }
  }

  if (dir > 0) {
    rotated.forEach((row) => row.reverse());
    return rotated;
  }

  rotated.reverse();
  return rotated;
}

export function nextRotationState(
  state: RotationState,
  dir: number,
): RotationState {
  const normalized = (state + (dir > 0 ? 1 : 3)) % 4;
  return normalized as RotationState;
}

export function getKickOffsets(
  pieceType: PieceType,
  from: RotationState,
  to: RotationState,
): ReadonlyArray<readonly [number, number]> {
  if (pieceType === 'O') return [[0, 0]];

  const key = `${from}>${to}`;
  if (pieceType === 'I') return I_KICKS[key] ?? [[0, 0]];

  return JLSTZ_KICKS[key] ?? [[0, 0]];
}
