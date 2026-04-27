import { Arena }         from '@/arena.js';
import { Player }        from '@/player.js';
import { Renderer }      from '@/renderer.js';
import { Controls }      from '@/controls.js';
import { TouchControls } from '@/touch-controls.js';
import { Storage }       from '@/storage.js';
import { AudioManager }  from '@/audio.js';
import { Game }          from '@/game.js';

const canvas        = document.getElementById('tetris');
const previewCanvas = document.getElementById('preview');
const holdCanvas    = document.getElementById('hold');
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const highScoreEl   = document.getElementById('highscore');
const scoresEl      = document.getElementById('scores');
const overlayEl     = document.getElementById('game-over');
const restartBtn    = document.getElementById('restart');
const playAgainBtn  = document.getElementById('play-again');
const muteBtn       = document.getElementById('mute');

const arena           = new Arena(12, 20);
const player          = new Player(arena);
const renderer        = new Renderer(canvas);
const previewRenderer = new Renderer(previewCanvas, 20);
const holdRenderer    = new Renderer(holdCanvas, 20);
const storage         = new Storage();
const audio           = new AudioManager();

const controls = new Controls({
  ArrowLeft:  'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown:  'drop',
  Space:      'hardDrop',
  KeyQ:       'rotateLeft',
  KeyW:       'rotateRight',
  KeyC:       'hold',
  KeyP:       'pause',
  KeyM:       'mute',
});

new TouchControls(canvas, controls);

// ── Player events → DOM ───────────────────────────────────────────────────────
player
  .on('score:changed', score  => { scoreEl.textContent = score; })
  .on('level:changed', level  => { levelEl.textContent = level; })
  .on('piece:next',    next   => { previewRenderer.renderPreview(next); })
  .on('piece:hold',    matrix => { holdRenderer.renderPreview(matrix); });

// ── Player events → Audio ─────────────────────────────────────────────────────
player
  .on('piece:moved',   ()      => audio.playMove())
  .on('piece:rotated', ()      => audio.playRotate())
  .on('piece:locked',  ()      => audio.playLock())
  .on('lines:cleared', lines  => audio.playClear(lines))
  .on('piece:hold',    ()      => audio.playHold());

// ── Game events → Audio ───────────────────────────────────────────────────────
const game = new Game({ arena, player, renderer, controls, storage, overlayEl, highScoreEl, scoresEl });

game.on('gameover', () => audio.playGameOver());

// ── Controls ──────────────────────────────────────────────────────────────────
controls.on('mute', () => {
  const muted = audio.toggle();
  muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
});

restartBtn.addEventListener('click',   () => game.start());
playAgainBtn.addEventListener('click', () => game.start());
muteBtn.addEventListener('click',      () => controls.trigger('mute'));

game.start();
