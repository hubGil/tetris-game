import { EventEmitter } from '@/event-emitter.js';
import type { Arena } from '@/arena.js';
import type { Controls } from '@/controls.js';
import type { Player } from '@/player.js';
import type { Renderer } from '@/renderer.js';
import type { Storage } from '@/storage.js';
import type { GameEvents, GameState } from '@/types.js';

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

const DROP_INTERVAL_START = 1000;
const DROP_INTERVAL_MIN = 100;
const DROP_INTERVAL_STEP = 100;
const FLASH_DURATION_MS = 400;

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
  private _dropInterval = DROP_INTERVAL_START;
  private _lastTime = 0;
  private _frameRequest: number | null = null;
  private _flashRequest: number | null = null;
  private _state: GameState = 'idle';
  private _flashRows: number[] = [];
  private _flashStart = 0;

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

  start(): void {
    this._cancelFrames();
    this._hideOverlay();
    this.arena.reset();
    this.player.resetStats();
    this._dropInterval = DROP_INTERVAL_START;
    this._dropCounter = 0;
    this._lastTime = 0;
    this._flashRows = [];

    const ok = this.player.reset();
    if (!ok) {
      this._triggerGameOver();
      return;
    }

    this.renderer.render(this.arena, this.player);
    this._setState('running');
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
      .on('moveLeft', () => this.player.move(-1))
      .on('moveRight', () => this.player.move(1))
      .on('drop', () => this._manualDrop())
      .on('hardDrop', () => this._doHardDrop())
      .on('hold', () => this._doHold())
      .on('rotateLeft', () => this.player.rotate(-1))
      .on('rotateRight', () => this.player.rotate(1))
      .on('pause', () => this.togglePause());
  }

  private _doHold(): void {
    if (this._state !== 'running') return;

    const ok = this.player.hold();
    if (ok === false) this._triggerGameOver();
  }

  private _manualDrop(): void {
    if (this._state !== 'running') return;

    const { locked, pendingRows } = this.player.drop();
    this._dropCounter = 0;
    if (locked) this._onPieceLocked(pendingRows);
  }

  private _doHardDrop(): void {
    if (this._state !== 'running') return;

    const { pendingRows } = this.player.hardDrop();
    this._dropCounter = 0;
    this._onPieceLocked(pendingRows);
  }

  private _loop(time: number): void {
    if (this._state !== 'running') return;

    const delta = this._lastTime === 0 ? 0 : time - this._lastTime;
    this._lastTime = time;
    this._dropCounter += delta;

    if (this._dropCounter >= this._dropInterval) {
      const { locked, pendingRows } = this.player.drop();
      this._dropCounter = 0;
      if (locked) {
        this._onPieceLocked(pendingRows);
        return;
      }
    }

    this.renderer.render(this.arena, this.player);
    this._scheduleMainLoop();
  }

  private _onPieceLocked(pendingRows: number[]): void {
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
    this._dropInterval = Math.max(
      DROP_INTERVAL_MIN,
      DROP_INTERVAL_START - (this.player.level - 1) * DROP_INTERVAL_STEP,
    );

    const ok = this.player.reset();
    if (!ok) {
      this._triggerGameOver();
      return;
    }

    this._dropCounter = 0;
    this._lastTime = 0;
    this.renderer.render(this.arena, this.player);
    this._setState('running');
    this._scheduleMainLoop();
  }

  private _triggerGameOver(): void {
    this._cancelFrames();
    this._setState('gameover');

    let isNewRecord = false;
    if (this.storage) {
      isNewRecord = this.storage.saveScore(this.player.score);
      this._updateHighScore();
      this._renderScores();
    }

    this._showOverlay(isNewRecord);
    this.emit('gameover', { score: this.player.score, isNewRecord });
  }

  private _showOverlay(isNewRecord: boolean): void {
    if (!this.overlayEl) return;

    const finalScoreEl =
      this.overlayEl.querySelector<HTMLElement>('[data-final-score]');
    const recordMsgEl =
      this.overlayEl.querySelector<HTMLElement>('[data-record-msg]');
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
