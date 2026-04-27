export class Game {
  constructor({ arena, player, renderer, controls, scoreEl }) {
    this.arena = arena;
    this.player = player;
    this.renderer = renderer;
    this.controls = controls;
    this.scoreEl = scoreEl;

    this._dropCounter = 0;
    this._dropInterval = 1000;
    this._lastTime = 0;
    this._animId = null;
    this._running = false;
    this._gameOver = false;

    this._bindControls();
  }

  start() {
    this._gameOver = false;
    this.arena.reset();
    this.player.score = 0;
    const ok = this.player.reset();
    this._updateScore();
    if (!ok) return;
    this._running = true;
    this._lastTime = 0;
    this._dropCounter = 0;
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  togglePause() {
    if (this._gameOver) return;
    this._running = !this._running;
    if (this._running) {
      this._lastTime = 0;
      this._animId = requestAnimationFrame(t => this._loop(t));
    }
  }

  _bindControls() {
    this.controls
      .on('moveLeft',    () => this.player.move(-1))
      .on('moveRight',   () => this.player.move(1))
      .on('drop',        () => { this._manualDrop(); })
      .on('rotateLeft',  () => this.player.rotate(-1))
      .on('rotateRight', () => this.player.rotate(1))
      .on('pause',       () => this.togglePause());
  }

  _manualDrop() {
    if (!this._running) return;
    const locked = this.player.drop();
    this._dropCounter = 0;
    if (locked) this._onPieceLocked();
  }

  _loop(time) {
    if (!this._running) return;

    const delta = this._lastTime === 0 ? 0 : time - this._lastTime;
    this._lastTime = time;
    this._dropCounter += delta;

    if (this._dropCounter >= this._dropInterval) {
      const locked = this.player.drop();
      this._dropCounter = 0;
      if (locked) {
        this._onPieceLocked();
        return;
      }
    }

    this.renderer.render(this.arena, this.player);
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  _onPieceLocked() {
    const ok = this.player.reset();
    this._updateScore();
    if (!ok) {
      this._triggerGameOver();
      return;
    }
    this.renderer.render(this.arena, this.player);
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  _triggerGameOver() {
    this._running = false;
    this._gameOver = true;
    if (this.scoreEl) {
      this.scoreEl.textContent = `GAME OVER — Score: ${this.player.score}`;
    }
  }

  _updateScore() {
    if (this.scoreEl && !this._gameOver) {
      this.scoreEl.textContent = this.player.score;
    }
  }
}
