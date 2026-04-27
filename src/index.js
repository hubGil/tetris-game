import { Arena }         from '@/arena.js';
import { Player }        from '@/player.js';
import { Renderer }      from '@/renderer.js';
import { Controls }      from '@/controls.js';
import { TouchControls } from '@/touch-controls.js';
import { Storage }       from '@/storage.js';
import { Game }          from '@/game.js';

const canvas        = document.getElementById('tetris');
const previewCanvas = document.getElementById('preview');
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const highScoreEl   = document.getElementById('highscore');
const scoresEl      = document.getElementById('scores');
const overlayEl     = document.getElementById('game-over');
const restartBtn    = document.getElementById('restart');
const playAgainBtn  = document.getElementById('play-again');

const arena           = new Arena(12, 20);
const player          = new Player(arena);
const renderer        = new Renderer(canvas);
const previewRenderer = new Renderer(previewCanvas, 20);
const storage         = new Storage();

const controls = new Controls({
  ArrowLeft:  'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown:  'drop',
  Space:      'hardDrop',
  KeyQ:       'rotateLeft',
  KeyW:       'rotateRight',
  KeyP:       'pause',
});

new TouchControls(canvas, controls);

// Wire Player events → DOM (decoupled from Game)
player
  .on('score:changed', score => { scoreEl.textContent = score; })
  .on('level:changed', level => { levelEl.textContent = level; })
  .on('piece:next',    next  => { previewRenderer.renderPreview(next); });

const game = new Game({ arena, player, renderer, controls, storage, overlayEl, highScoreEl, scoresEl });

restartBtn.addEventListener('click',   () => game.start());
playAgainBtn.addEventListener('click', () => game.start());

game.start();
