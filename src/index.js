import { Arena }    from './arena.js';
import { Player }   from './player.js';
import { Renderer } from './renderer.js';
import { Controls } from './controls.js';
import { Game }     from './game.js';

const canvas      = document.getElementById('tetris');
const previewCanvas = document.getElementById('preview');
const scoreEl     = document.getElementById('score');
const levelEl     = document.getElementById('level');
const restartBtn  = document.getElementById('restart');

const arena    = new Arena(12, 20);
const player   = new Player(arena);
const renderer = new Renderer(canvas);
const previewRenderer = new Renderer(previewCanvas, 20);

const controls = new Controls({
  ArrowLeft:  'moveLeft',
  ArrowRight: 'moveRight',
  ArrowDown:  'drop',
  Space:      'hardDrop',
  KeyQ:       'rotateLeft',
  KeyW:       'rotateRight',
  KeyP:       'pause',
});

const game = new Game({ arena, player, renderer, previewRenderer, controls, scoreEl, levelEl });

restartBtn.addEventListener('click', () => game.start());

game.start();
