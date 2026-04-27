// 7-bag randomizer: each piece appears exactly once per cycle before reshuffling
export class PieceBag {
  constructor(types) {
    this._types = [...types];
    this._bag   = [];
  }

  next() {
    if (this._bag.length === 0) this._refill();
    return this._bag.pop();
  }

  _refill() {
    this._bag = [...this._types];
    for (let i = this._bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._bag[i], this._bag[j]] = [this._bag[j], this._bag[i]];
    }
  }
}
