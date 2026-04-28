import { EventEmitter } from '@/event-emitter.js';
import { GAME_MODES } from '@/game-modes.js';
import type { Arena } from '@/arena.js';
import type { Controls } from '@/controls.js';
import type { Player } from '@/player.js';
import type { Renderer } from '@/renderer.js';
import type { Storage } from '@/storage.js';
import type {
  GameEvents,
  GameMode,
  GameState,
  LockResult,
  SessionStats,
} from '@/types.js';

type GameConfig = {
  arena: Arena;
  player: Player;
  renderer: Renderer;
  controls: Controls;
  storage: Storage | null;
  overlayEl: HTMLElement | null;
  highScoreEl: HTMLElement | null;
  scoresEl: HTMLElement | null;
};

type HorizontalAction = 'moveLeft' | 'moveRight';

const DROP_INTERVAL_STEP = 100;
const FLASH_DURATION_MS = 400;
const LOCK_DELAY_MS = 500;
const LOCK_RESET_LIMIT = 15;
const DAS_MS = 140;
const ARR_MS = 30;
const SOFT_DROP_INTERVAL_MS = 35;

export class Game extends EventEmitter<GameEvents> {
  readonly arena: Arena;
  readonly player: Player;
  readonly renderer: Renderer;
  readonly controls: Controls;
  readonly storage: Storage | null;
  readonly overlayEl: HTMLElement | null;
  readonly highScoreEl: HTMLElement | null;
  readonly scoresEl: HTMLElement | null;

  private _dropCounter = 0;
  private _dropInterval = GAME_MODES.marathon.startDropInterval;
  private _softDropCounter = 0;
  private _lastTime = 0;
  private _elapsedMs = 0;
  private _frameRequest: number | null = null;
  private _flashRequest: number | null = null;
  private _state: GameState = 'idle';
  private _flashRows: number[] = [];
  private _flashStart = 0;
  private _mode: GameMode = 'marathon';
  private _horizontalAction: HorizontalAction | null = null;
  private _horizontalDelay = 0;
  private _horizontalRepeat = 0;
  private _lockTimer = 0;
  private _lockResets = 0;
  private _grounded = false;

  constructor({
    arena,
    player,
    renderer,
    controls,
    storage,
    overlayEl,
    highScoreEl,
    scoresEl,
  }: GameConfig) {
    super();
    this.arena = arena;
    this.player = player;
    this.renderer = renderer;
    this.controls = controls;
    this.storage = storage;
    this.overlayEl = overlayEl;
    this.highScoreEl = highScoreEl;
    this.scoresEl = scoresEl;

    this._bindControls();
    this._updateHighScore();
    this._renderScores();
  }

  get state(): GameState {
    return this._state;
  }

  get mode(): GameMode {
    return this._mode;
  }

  start(mode: GameMode = this._mode): void {
    this._cancelFrames();
    this._setMode(mode);
    this._hideOverlay();
    this.arena.reset();
    this.player.resetStats();
    this._dropInterval = this._getDropInterval();
    this._dropCounter = 0;
    this._softDropCounter = 0;
    this._lastTime = 0;
    this._elapsedMs = 0;
    this._flashRows = [];
    this._horizontalAction = null;
    this._horizontalDelay = 0;
    this._horizontalRepeat = 0;
    this._clearLockDelay();

    const ok = this.player.reset();
    if (!ok) {
      this._triggerGameOver();
      return;
    }

    this._grounded = this.player.isGrounded();
    this.renderer.render(this.arena, this.player);
    this._setState('running');
    this._emitSessionStats();
    this._scheduleMainLoop();
  }

  togglePause(): void {
    if (this._state === 'running') {
      this._setState('paused');
      this._cancelMainFrame();
      return;
    }

    if (this._state === 'paused') {
      this._lastTime = 0;
      this._setState('running');
      this._scheduleMainLoop();
    }
  }

  private _bindControls(): void {
    this.controls
      .on('moveLeft', (event) => this._handleHorizontalInput('moveLeft', event))
      .on('moveRight', (event) =>
        this._handleHorizontalInput('moveRight', event),
      )
      .onRelease('moveLeft', () => this._handleHorizontalRelease('moveLeft'))
      .onRelease('moveRight', () => this._handleHorizontalRelease('moveRight'))
      .on('drop', (event) => this._handleSoftDropInput(event))
      .on('hardDrop', () => this._doHardDrop())
      .on('hold', () => this._doHold())
      .on('rotateLeft', () => this._tryRotate(-1))
      .on('rotateRight', () => this._tryRotate(1))
      .on('pause', () => this.togglePause());
  }

  private _handleHorizontalInput(
    action: HorizontalAction,
    event?: KeyboardEvent,
  ): void {
    if (this._state !== 'running') return;

    const moved = this.player.move(action === 'moveLeft' ? -1 : 1);
    if (moved) this._afterPieceAdjustment();

    if (!event) return;

    this._horizontalAction = action;
    this._horizontalDelay = 0;
    this._horizontalRepeat = 0;
  }

  private _handleHorizontalRelease(action: HorizontalAction): void {
    if (this._horizontalAction !== action) return;

    const fallback = action === 'moveLeft' ? 'moveRight' : 'moveLeft';
    if (this.controls.isPressed(fallback)) {
      this._horizontalAction = fallback;
      this._horizontalDelay = 0;
      this._horizontalRepeat = 0;
      const moved = this.player.move(fallback === 'moveLeft' ? -1 : 1);
      if (moved) this._afterPieceAdjustment();
      return;
    }

    this._horizontalAction = null;
    this._horizontalDelay = 0;
    this._horizontalRepeat = 0;
  }

  private _handleSoftDropInput(event?: KeyboardEvent): void {
    if (this._state !== 'running') return;

    this._softDropStep(true);
    if (event) this._softDropCounter = 0;
  }

  private _tryRotate(dir: number): void {
    if (this._state !== 'running') return;

    const rotated = this.player.rotate(dir);
    if (rotated) this._afterPieceAdjustment();
  }

  private _doHold(): void {
    if (this._state !== 'running') return;

    const ok = this.player.hold();
    if (ok === false) {
      this._triggerGameOver();
      return;
    }

    this._clearLockDelay();
    this._grounded = this.player.isGrounded();
  }

  private _doHardDrop(): void {
    if (this._state !== 'running') return;

    const result = this.player.hardDrop();
    this.player.addHardDropScore(result.distance);
    this._dropCounter = 0;
    this._onPieceLocked(result);
  }

  private _loop(time: number): void {
    if (this._state !== 'running') return;

    const delta = this._lastTime === 0 ? 0 : time - this._lastTime;
    this._lastTime = time;
    this._elapsedMs += delta;

    if (this._shouldEndByTimer()) {
      this._triggerGameOver(
        'ULTRA FINALIZADO',
        `${this.player.score} pontos em 2:00`,
      );
      return;
    }

    this._updateHorizontal(delta);
    this._updateSoftDrop(delta);

    this._dropCounter += delta;
    if (this._dropCounter >= this._dropInterval) {
      const moved = this.player.softDrop();
      this._dropCounter = 0;
      if (moved) {
        this._afterVerticalAdvance();
      }
    }

    this._updateLockDelay(delta);
    this._emitSessionStats();
    this.renderer.render(this.arena, this.player);
    this._scheduleMainLoop();
  }

  private _updateHorizontal(delta: number): void {
    if (!this._horizontalAction) return;
    if (!this.controls.isPressed(this._horizontalAction)) return;

    this._horizontalDelay += delta;
    if (this._horizontalDelay < DAS_MS) return;

    this._horizontalRepeat += delta;
    while (this._horizontalRepeat >= ARR_MS) {
      const moved = this.player.move(
        this._horizontalAction === 'moveLeft' ? -1 : 1,
      );
      this._horizontalRepeat -= ARR_MS;
      if (!moved) break;
      this._afterPieceAdjustment();
    }
  }

  private _updateSoftDrop(delta: number): void {
    if (!this.controls.isPressed('drop')) return;

    this._softDropCounter += delta;
    while (this._softDropCounter >= SOFT_DROP_INTERVAL_MS) {
      this._softDropCounter -= SOFT_DROP_INTERVAL_MS;
      if (!this._softDropStep(true)) break;
    }
  }

  private _softDropStep(awardScore: boolean): boolean {
    const moved = this.player.softDrop();
    if (!moved) return false;

    if (awardScore) this.player.addSoftDropScore(1);
    this._dropCounter = 0;
    this._afterVerticalAdvance();
    return true;
  }

  private _afterVerticalAdvance(): void {
    if (this.player.isGrounded()) {
      this._grounded = true;
      return;
    }

    this._clearLockDelay();
    this._grounded = false;
  }

  private _updateLockDelay(delta: number): void {
    if (!this.player.isGrounded()) {
      this._grounded = false;
      this._clearLockDelay();
      return;
    }

    this._grounded = true;
    this._lockTimer += delta;

    if (this._lockTimer < LOCK_DELAY_MS) return;

    this._onPieceLocked(this.player.lock());
  }

  private _afterPieceAdjustment(): void {
    const grounded = this.player.isGrounded();
    if (!grounded) {
      this._grounded = false;
      this._clearLockDelay();
      return;
    }

    if (this._grounded && this._lockResets < LOCK_RESET_LIMIT) {
      this._lockTimer = 0;
      this._lockResets += 1;
    }

    this._grounded = true;
  }

  private _onPieceLocked({ pendingRows }: LockResult): void {
    this._cancelMainFrame();

    if (pendingRows.length > 0) {
      this._startFlash(pendingRows);
      return;
    }

    this._finalizeLock([]);
  }

  private _startFlash(rows: number[]): void {
    this._flashRows = rows;
    this._flashStart = performance.now();
    this._setState('flashing');
    this._scheduleFlashLoop();
  }

  private _flashLoop(time: number): void {
    if (this._state !== 'flashing') return;

    const progress = Math.min((time - this._flashStart) / FLASH_DURATION_MS, 1);
    this.renderer.render(this.arena, this.player);
    this.renderer.renderFlash(this._flashRows, progress);

    if (progress < 1) {
      this._scheduleFlashLoop();
      return;
    }

    this._flashRequest = null;
    this._finalizeLock(this._flashRows);
  }

  private _finalizeLock(pendingRows: number[]): void {
    this.player.commitClear(pendingRows);
    this._dropInterval = this._getDropInterval();

    const targetLines = GAME_MODES[this._mode].targetLines;
    if (targetLines && this.player.totalLines >= targetLines) {
      this._triggerGameOver(
        'SPRINT COMPLETO',
        `40 linhas em ${this.player.score} pontos`,
      );
      return;
    }

    const ok = this.player.reset();
    if (!ok) {
      this._triggerGameOver();
      return;
    }

    this._dropCounter = 0;
    this._softDropCounter = 0;
    this._lastTime = 0;
    this._clearLockDelay();
    this._grounded = this.player.isGrounded();
    this.renderer.render(this.arena, this.player);
    this._setState('running');
    this._emitSessionStats();
    this._scheduleMainLoop();
  }

  private _triggerGameOver(title = 'FIM DE JOGO', subtitle = ''): void {
    this._cancelFrames();
    this._setState('gameover');

    let isNewRecord = false;
    if (this.storage) {
      isNewRecord = this.storage.saveScore(this.player.score);
      this._updateHighScore();
      this._renderScores();
    }

    this._showOverlay(isNewRecord, title, subtitle);
    this.emit('gameover', {
      score: this.player.score,
      isNewRecord,
      title,
      subtitle,
      mode: this._mode,
    });
  }

  private _showOverlay(
    isNewRecord: boolean,
    title: string,
    subtitle: string,
  ): void {
    if (!this.overlayEl) return;

    const titleEl = this.overlayEl.querySelector<HTMLElement>(
      '[data-overlay-title]',
    );
    const subtitleEl = this.overlayEl.querySelector<HTMLElement>(
      '[data-overlay-subtitle]',
    );
    const finalScoreEl =
      this.overlayEl.querySelector<HTMLElement>('[data-final-score]');
    const recordMsgEl =
      this.overlayEl.querySelector<HTMLElement>('[data-record-msg]');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
    if (finalScoreEl) finalScoreEl.textContent = String(this.player.score);
    if (recordMsgEl)
      recordMsgEl.textContent = isNewRecord ? 'NOVO RECORDE!' : '';
    this.overlayEl.classList.remove('hidden');
  }

  private _hideOverlay(): void {
    this.overlayEl?.classList.add('hidden');
  }

  private _updateHighScore(): void {
    if (this.highScoreEl && this.storage) {
      this.highScoreEl.textContent = String(this.storage.getHighScore());
    }
  }

  private _renderScores(): void {
    if (!this.scoresEl || !this.storage) return;

    const scores = this.storage.getScores();
    this.scoresEl.replaceChildren();

    scores.forEach((score, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = `${index + 1}.`;

      const date = document.createElement('span');
      date.className = 'date';
      date.textContent = score.date;

      item.append(rank, ` ${score.score} `, date);
      this.scoresEl?.append(item);
    });
  }

  private _setState(state: GameState): void {
    if (this._state === state) return;
    this._state = state;
    this.emit('state:changed', state);
  }

  private _setMode(mode: GameMode): void {
    if (this._mode === mode) return;
    this._mode = mode;
    this.emit('mode:changed', mode);
  }

  private _emitSessionStats(): void {
    this.emit('session:changed', this._getSessionStats());
  }

  private _shouldEndByTimer(): boolean {
    const durationMs = GAME_MODES[this._mode].durationMs;
    return typeof durationMs === 'number' && this._elapsedMs >= durationMs;
  }

  private _getDropInterval(): number {
    const config = GAME_MODES[this._mode];
    return Math.max(
      config.minDropInterval,
      config.startDropInterval - (this.player.level - 1) * DROP_INTERVAL_STEP,
    );
  }

  private _getSessionStats(): SessionStats {
    const durationMs = GAME_MODES[this._mode].durationMs;
    return {
      mode: this._mode,
      elapsedMs: this._elapsedMs,
      remainingMs:
        typeof durationMs === 'number'
          ? Math.max(durationMs - this._elapsedMs, 0)
          : null,
      totalLines: this.player.totalLines,
    };
  }

  private _clearLockDelay(): void {
    this._lockTimer = 0;
    this._lockResets = 0;
  }

  private _scheduleMainLoop(): void {
    this._frameRequest = requestAnimationFrame((time) => this._loop(time));
  }

  private _scheduleFlashLoop(): void {
    this._flashRequest = requestAnimationFrame((time) => this._flashLoop(time));
  }

  private _cancelMainFrame(): void {
    if (this._frameRequest !== null) {
      cancelAnimationFrame(this._frameRequest);
      this._frameRequest = null;
    }
  }

  private _cancelFlashFrame(): void {
    if (this._flashRequest !== null) {
      cancelAnimationFrame(this._flashRequest);
      this._flashRequest = null;
    }
  }

  private _cancelFrames(): void {
    this._cancelMainFrame();
    this._cancelFlashFrame();
  }
}
