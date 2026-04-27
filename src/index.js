import { Arena }    from './arena.js';
import { Player }   from './player.js';
import { Renderer } from './renderer.js';
import { Controls } from './controls.js';
import { Storage }  from './storage.js';
import { Game }     from './game.js';

const canvas        = document.getElementById('tetris');
const previewCanvas = document.getElementById('preview');
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const highScoreEl   = document.getElementById('highscore');
const scoresEl      = document.getElementById('scores');
const restartBtn    = document.getElementById('restart');

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

const game = new Game({ arena, player, renderer, previewRenderer, controls, storage, scoreEl, levelEl, highScoreEl, scoresEl });

restartBtn.addEventListener('click', () => game.start());

game.start();
