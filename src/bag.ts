import type { PieceType } from '@/types.js';

export class PieceBag {
  private readonly _types: PieceType[];
  private _bag: PieceType[] = [];

  constructor(types: PieceType[]) {
    this._types = [...types];
  }

  next(): PieceType {
    if (this._bag.length === 0) this._refill();
    return this._bag.pop() as PieceType;
  }

  private _refill(): void {
    this._bag = [...this._types];
    for (let index = this._bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this._bag[index], this._bag[swapIndex]] = [
        this._bag[swapIndex],
        this._bag[index],
      ];
    }
  }
}
