import { Arena } from '@/arena.js';
import { AudioManager } from '@/audio.js';
import { Controls } from '@/controls.js';
import { Game } from '@/game.js';
import { Player } from '@/player.js';
import { registerServiceWorker } from '@/pwa.js';
import { Renderer } from '@/renderer.js';
import { Storage } from '@/storage.js';
import { TouchControls } from '@/touch-controls.js';

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element as T;
}

const canvas = getRequiredElement<HTMLCanvasElement>('tetris');
const previewCanvas = getRequiredElement<HTMLCanvasElement>('preview');
const holdCanvas = getRequiredElement<HTMLCanvasElement>('hold');
const scoreEl = getRequiredElement<HTMLElement>('score');
const levelEl = getRequiredElement<HTMLElement>('level');
const highScoreEl = getRequiredElement<HTMLElement>('highscore');
const scoresEl = getRequiredElement<HTMLElement>('scores');
const overlayEl = getRequiredElement<HTMLElement>('game-over');
const restartBtn = getRequiredElement<HTMLButtonElement>('restart');
const playAgainBtn = getRequiredElement<HTMLButtonElement>('play-again');
const muteBtn = getRequiredElement<HTMLButtonElement>('mute');

const arena = new Arena(12, 20);
const player = new Player(arena);
const renderer = new Renderer(canvas);
const previewRenderer = new Renderer(previewCanvas, 20);
const holdRenderer = new Renderer(holdCanvas, 20);
const storage = new Storage();
const audio = new AudioManager();

const controls = new Controls({
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown: 'drop',
  Space: 'hardDrop',
  KeyQ: 'rotateLeft',
  KeyW: 'rotateRight',
  KeyC: 'hold',
  KeyP: 'pause',
  KeyM: 'mute',
});

new TouchControls(canvas, controls);

player
  .on('score:changed', (score) => {
    scoreEl.textContent = String(score);
  })
  .on('level:changed', (level) => {
    levelEl.textContent = String(level);
  })
  .on('piece:next', (next) => {
    previewRenderer.renderPreview(next);
  })
  .on('piece:hold', (matrix) => {
    holdRenderer.renderPreview(matrix);
  });

player
  .on('piece:moved', () => audio.playMove())
  .on('piece:rotated', () => audio.playRotate())
  .on('piece:locked', () => audio.playLock())
  .on('lines:cleared', (lines) => audio.playClear(lines))
  .on('piece:hold', () => audio.playHold());

const game = new Game({
  arena,
  player,
  renderer,
  controls,
  storage,
  overlayEl,
  highScoreEl,
  scoresEl,
});

game.on('gameover', () => audio.playGameOver());

controls.on('mute', () => {
  const muted = audio.toggle();
  muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
});

restartBtn.addEventListener('click', () => game.start());
playAgainBtn.addEventListener('click', () => game.start());
muteBtn.addEventListener('click', () => controls.trigger('mute'));

game.start();
registerServiceWorker();
