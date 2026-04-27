export class Game {
  constructor({ arena, player, renderer, previewRenderer, controls, storage, scoreEl, levelEl, highScoreEl, scoresEl, overlayEl }) {
    this.arena = arena;
    this.player = player;
    this.renderer = renderer;
    this.previewRenderer = previewRenderer;
    this.controls = controls;
    this.storage = storage;
    this.scoreEl = scoreEl;
    this.levelEl = levelEl;
    this.highScoreEl = highScoreEl;
    this.scoresEl = scoresEl;
    this.overlayEl = overlayEl;

    this._dropCounter = 0;
    this._dropInterval = 1000;
    this._lastTime = 0;
    this._animId = null;
    this._running = false;
    this._gameOver = false;
    this._flashing = false;
    this._flashRows = [];
    this._flashStart = 0;
    this._flashDuration = 400;

    this._bindControls();
    this._updateHighScore();
    this._renderScores();
  }

  start() {
    this._hideOverlay();
    this._gameOver = false;
    this._flashing = false;
    this.arena.reset();
    this.player.score = 0;
    this.player.totalLines = 0;
    this.player.nextMatrix = null;
    const ok = this.player.reset();
    this._dropInterval = 1000;
    this._updateHUD();
    this._renderPreview();
    if (!ok) return;
    this._running = true;
    this._lastTime = 0;
    this._dropCounter = 0;
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  togglePause() {
    if (this._gameOver || this._flashing) return;
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
      .on('drop',        () => this._manualDrop())
      .on('hardDrop',    () => this._doHardDrop())
      .on('rotateLeft',  () => this.player.rotate(-1))
      .on('rotateRight', () => this.player.rotate(1))
      .on('pause',       () => this.togglePause());
  }

  _manualDrop() {
    if (!this._running) return;
    const { locked, pendingRows } = this.player.drop();
    this._dropCounter = 0;
    if (locked) this._onPieceLocked(pendingRows);
  }

  _doHardDrop() {
    if (!this._running) return;
    const { pendingRows } = this.player.hardDrop();
    this._dropCounter = 0;
    this._onPieceLocked(pendingRows);
  }

  _loop(time) {
    if (!this._running) return;

    const delta = this._lastTime === 0 ? 0 : time - this._lastTime;
    this._lastTime = time;
    this._dropCounter += delta;

    if (this._dropCounter >= this._dropInterval) {
      const { locked, pendingRows } = this.player.drop();
      this._dropCounter = 0;
      if (locked) {
        this._running = false;
        this._onPieceLocked(pendingRows);
        return;
      }
    }

    this.renderer.render(this.arena, this.player);
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  _onPieceLocked(pendingRows) {
    this._running = false;
    if (pendingRows.length > 0) {
      this._startFlash(pendingRows);
    } else {
      this._finalizeLock([]);
    }
  }

  _startFlash(rows) {
    this._flashing = true;
    this._flashRows = rows;
    this._flashStart = performance.now();
    requestAnimationFrame(t => this._flashLoop(t));
  }

  _flashLoop(time) {
    const progress = Math.min((time - this._flashStart) / this._flashDuration, 1);
    this.renderer.render(this.arena, this.player);
    this.renderer.renderFlash(this._flashRows, progress);
    if (progress < 1) {
      requestAnimationFrame(t => this._flashLoop(t));
    } else {
      this._flashing = false;
      this._finalizeLock(this._flashRows);
    }
  }

  _finalizeLock(pendingRows) {
    this.player.commitClear(pendingRows);
    this._dropInterval = Math.max(100, 1000 - (this.player.level - 1) * 100);

    const ok = this.player.reset();
    this._updateHUD();
    this._renderPreview();

    if (!ok) {
      this._triggerGameOver();
      return;
    }

    this._running = true;
    this._lastTime = 0;
    this._dropCounter = 0;
    this.renderer.render(this.arena, this.player);
    this._animId = requestAnimationFrame(t => this._loop(t));
  }

  _triggerGameOver() {
    this._running = false;
    this._gameOver = true;

    let isNewRecord = false;
    if (this.storage) {
      isNewRecord = this.storage.saveScore(this.player.score);
      this._updateHighScore();
      this._renderScores();
    }

    if (this.scoreEl) {
      this.scoreEl.textContent = this.player.score;
    }

    this._showOverlay(isNewRecord);
  }

  _showOverlay(isNewRecord) {
    if (!this.overlayEl) return;
    const finalScoreEl = this.overlayEl.querySelector('[data-final-score]');
    const recordMsgEl  = this.overlayEl.querySelector('[data-record-msg]');
    if (finalScoreEl) finalScoreEl.textContent = this.player.score;
    if (recordMsgEl)  recordMsgEl.textContent  = isNewRecord ? 'NOVO RECORDE!' : '';
    this.overlayEl.classList.remove('hidden');
  }

  _hideOverlay() {
    this.overlayEl?.classList.add('hidden');
  }

  _renderPreview() {
    if (this.previewRenderer && this.player.nextMatrix) {
      this.previewRenderer.renderPreview(this.player.nextMatrix);
    }
  }

  _updateHighScore() {
    if (this.highScoreEl && this.storage) {
      this.highScoreEl.textContent = this.storage.getHighScore();
    }
  }

  _renderScores() {
    if (!this.scoresEl || !this.storage) return;
    const scores = this.storage.getScores();
    this.scoresEl.innerHTML = scores
      .map((s, i) => `<li><span class="rank">${i + 1}.</span> ${s.score} <span class="date">${s.date}</span></li>`)
      .join('');
  }

  _updateHUD() {
    if (this.scoreEl && !this._gameOver) {
      this.scoreEl.textContent = this.player.score;
    }
    if (this.levelEl) {
      this.levelEl.textContent = this.player.level;
    }
  }
}
