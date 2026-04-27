import { Arena } from '@/arena.js';
import { AudioManager } from '@/audio.js';
import { Controls } from '@/controls.js';
import { Game } from '@/game.js';
import { GAME_MODES } from '@/game-modes.js';
import { Player } from '@/player.js';
import { registerServiceWorker } from '@/pwa.js';
import { Renderer } from '@/renderer.js';
import { Storage } from '@/storage.js';
import { TouchControls } from '@/touch-controls.js';
import type {
  AppSettings,
  ControlAction,
  GameMode,
  GameState,
} from '@/types.js';

const ACTION_LABELS: Record<ControlAction, string> = {
  moveLeft: 'mover esquerda',
  moveRight: 'mover direita',
  drop: 'soft drop',
  hardDrop: 'hard drop',
  hold: 'hold',
  rotateLeft: 'rotacao anti-horaria',
  rotateRight: 'rotacao horaria',
  pause: 'pause',
  mute: 'mute',
};

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element as T;
}

function invertBindings(
  bindings: AppSettings['bindings'],
): Partial<Record<string, ControlAction>> {
  const map: Partial<Record<string, ControlAction>> = {};

  (Object.entries(bindings) as Array<[ControlAction, string]>).forEach(
    ([action, code]) => {
      map[code] = action;
    },
  );

  return map;
}

function formatKey(code: string): string {
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.replace('Arrow', '');
  if (code === 'Space') return 'Space';
  return code;
}

const canvas = getRequiredElement<HTMLCanvasElement>('tetris');
const previewCanvas = getRequiredElement<HTMLCanvasElement>('preview');
const holdCanvas = getRequiredElement<HTMLCanvasElement>('hold');
const scoreEl = getRequiredElement<HTMLElement>('score');
const levelEl = getRequiredElement<HTMLElement>('level');
const highScoreEl = getRequiredElement<HTMLElement>('highscore');
const scoresEl = getRequiredElement<HTMLOListElement>('scores');
const comboValueEl = getRequiredElement<HTMLElement>('combo-value');
const comboCounterEl = getRequiredElement<HTMLElement>('combo-counter');
const levelSplashEl = getRequiredElement<HTMLElement>('level-splash');
const modeBadgeEl = getRequiredElement<HTMLElement>('mode-badge');
const modeTitleEl = getRequiredElement<HTMLElement>('mode-title');
const modeDescriptionEl = getRequiredElement<HTMLElement>('mode-description');
const controlsListEl = getRequiredElement<HTMLUListElement>('controls-list');
const overlayEl = getRequiredElement<HTMLElement>('game-over');
const gameFrameEl = getRequiredElement<HTMLElement>('game-frame');
const menuScreenEl = getRequiredElement<HTMLElement>('menu-screen');
const settingsPanelEl = getRequiredElement<HTMLElement>('settings-panel');
const restartBtn = getRequiredElement<HTMLButtonElement>('restart');
const playAgainBtn = getRequiredElement<HTMLButtonElement>('play-again');
const backToMenuBtn = getRequiredElement<HTMLButtonElement>('back-to-menu');
const openMenuBtn = getRequiredElement<HTMLButtonElement>('open-menu');
const menuSettingsBtn = getRequiredElement<HTMLButtonElement>('menu-settings');
const muteBtn = getRequiredElement<HTMLButtonElement>('mute');
const openSettingsBtn = getRequiredElement<HTMLButtonElement>('open-settings');
const closeSettingsBtn =
  getRequiredElement<HTMLButtonElement>('close-settings');
const volumeInput = getRequiredElement<HTMLInputElement>('volume');
const touchThresholdInput =
  getRequiredElement<HTMLInputElement>('touch-threshold');
const tapMsInput = getRequiredElement<HTMLInputElement>('tap-ms');
const themeSelect = getRequiredElement<HTMLSelectElement>('theme');
const bindingButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-bind-action]'),
);
const modeCards = Array.from(
  document.querySelectorAll<HTMLElement>('[data-mode-card]'),
);
const startModeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-start-mode]'),
);
const touchButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-touch-action]'),
);

const arena = new Arena(12, 20);
const player = new Player(arena);
const renderer = new Renderer(canvas);
const previewRenderer = new Renderer(previewCanvas, 20);
const holdRenderer = new Renderer(holdCanvas, 20);
const storage = new Storage();
const settings = storage.getSettings();
const audio = new AudioManager();
audio.setVolume(settings.volume);

const controls = new Controls(invertBindings(settings.bindings));
const touchControls = new TouchControls(canvas, controls, {
  threshold: settings.touchThreshold,
  tapMs: settings.tapMs,
});

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

let selectedMode: GameMode = 'marathon';
let activeRebind: ControlAction | null = null;
let levelSplashTimer: number | null = null;
let comboTimer: number | null = null;
let lockPulseTimer: number | null = null;

function persistSettings(): void {
  storage.saveSettings(settings);
}

function applyTheme(theme: AppSettings['theme']): void {
  document.documentElement.dataset.theme = theme;
  const themeColor = theme === 'sunset' ? '#ff7b54' : '#55f3ff';
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor);
}

function updateMuteButton(): void {
  muteBtn.textContent = audio.muted ? 'unmute' : 'mute';
}

function updateModeUI(mode: GameMode): void {
  selectedMode = mode;
  modeBadgeEl.textContent = mode;
  modeTitleEl.textContent = mode;
  modeDescriptionEl.textContent = GAME_MODES[mode].description;

  modeCards.forEach((card) => {
    card.classList.toggle('active', card.dataset.modeCard === mode);
  });
}

function renderBindings(): void {
  bindingButtons.forEach((button) => {
    const action = button.dataset.bindAction as ControlAction;
    const key = settings.bindings[action];
    const waiting = activeRebind === action;
    button.classList.toggle('is-listening', waiting);
    button.replaceChildren();

    const label = document.createElement('span');
    label.textContent = ACTION_LABELS[action];

    const keyLabel = document.createElement('span');
    keyLabel.textContent = waiting ? 'pressione...' : formatKey(key);

    button.append(label, keyLabel);
  });

  controls.setBindings(invertBindings(settings.bindings));
  renderControlsList();
  document
    .querySelectorAll<HTMLElement>('[data-key-for]')
    .forEach((element) => {
      const action = element.dataset.keyFor as ControlAction;
      element.textContent = formatKey(settings.bindings[action]);
    });
}

function renderControlsList(): void {
  controlsListEl.replaceChildren();

  (Object.keys(ACTION_LABELS) as ControlAction[]).forEach((action) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    const key = document.createElement('strong');
    label.textContent = ACTION_LABELS[action];
    key.textContent = formatKey(settings.bindings[action]);
    item.append(label, key);
    controlsListEl.append(item);
  });
}

function syncSettingsUI(): void {
  volumeInput.value = String(Math.round(settings.volume * 100));
  touchThresholdInput.value = String(settings.touchThreshold);
  tapMsInput.value = String(settings.tapMs);
  themeSelect.value = settings.theme;
  renderBindings();
}

function openSettings(): void {
  settingsPanelEl.classList.remove('hidden');
}

function closeSettings(): void {
  settingsPanelEl.classList.add('hidden');
  activeRebind = null;
  renderBindings();
}

function showMenu(): void {
  if (game.state === 'running') game.togglePause();
  menuScreenEl.classList.remove('hidden');
}

function hideMenu(): void {
  menuScreenEl.classList.add('hidden');
}

function flashLevel(level: number): void {
  if (levelSplashTimer !== null) window.clearTimeout(levelSplashTimer);
  levelSplashEl.textContent = `level ${level}`;
  levelSplashEl.classList.remove('hidden');
  levelSplashEl.classList.add('is-visible');

  levelSplashTimer = window.setTimeout(() => {
    levelSplashEl.classList.remove('is-visible');
    levelSplashEl.classList.add('hidden');
  }, 1200);
}

function flashCombo(combo: number): void {
  comboValueEl.textContent = `x${combo}`;

  if (combo < 2) {
    comboCounterEl.classList.remove('is-visible');
    comboCounterEl.classList.add('hidden');
    return;
  }

  if (comboTimer !== null) window.clearTimeout(comboTimer);
  comboCounterEl.textContent = `${combo} combo`;
  comboCounterEl.classList.remove('hidden');
  comboCounterEl.classList.add('is-visible');

  comboTimer = window.setTimeout(() => {
    comboCounterEl.classList.remove('is-visible');
    comboCounterEl.classList.add('hidden');
  }, 900);
}

function pulseLockFrame(): void {
  gameFrameEl.classList.add('is-locking');
  if (lockPulseTimer !== null) window.clearTimeout(lockPulseTimer);

  lockPulseTimer = window.setTimeout(() => {
    gameFrameEl.classList.remove('is-locking');
  }, 180);
}

function startGame(mode: GameMode): void {
  updateModeUI(mode);
  hideMenu();
  overlayEl.classList.add('hidden');
  game.start(mode);
}

function updateStateUI(state: GameState): void {
  document.body.dataset.gameState = state;
}

function handleRebindKey(event: KeyboardEvent): void {
  if (!activeRebind) return;

  event.preventDefault();
  event.stopPropagation();

  const action = activeRebind;
  if (event.code === 'Escape') {
    activeRebind = null;
    renderBindings();
    return;
  }

  settings.bindings[action] = event.code;
  persistSettings();
  activeRebind = null;
  renderBindings();
}

player
  .on('score:changed', (score) => {
    scoreEl.textContent = String(score);
  })
  .on('level:changed', (level) => {
    levelEl.textContent = String(level);
    if (game.state !== 'idle' && game.state !== 'gameover') {
      flashLevel(level);
    }
  })
  .on('combo:changed', (combo) => {
    flashCombo(combo);
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
  .on('piece:locked', () => {
    audio.playLock();
    pulseLockFrame();
  })
  .on('lines:cleared', (lines) => audio.playClear(lines))
  .on('piece:hold', () => audio.playHold());

game
  .on('gameover', () => {
    audio.playGameOver();
  })
  .on('state:changed', (state) => {
    updateStateUI(state);
  })
  .on('mode:changed', (mode) => {
    updateModeUI(mode);
  });

controls.on('mute', () => {
  const muted = audio.toggle();
  if (!muted && settings.volume === 0) {
    settings.volume = 0.7;
    volumeInput.value = '70';
    audio.setVolume(settings.volume);
    persistSettings();
  }
  updateMuteButton();
});

restartBtn.addEventListener('click', () => game.start(game.mode));
playAgainBtn.addEventListener('click', () => game.start(game.mode));
backToMenuBtn.addEventListener('click', () => showMenu());
openMenuBtn.addEventListener('click', () => showMenu());
muteBtn.addEventListener('click', () => controls.trigger('mute'));
openSettingsBtn.addEventListener('click', () => openSettings());
menuSettingsBtn.addEventListener('click', () => openSettings());
closeSettingsBtn.addEventListener('click', () => closeSettings());

startModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.startMode as GameMode;
    startGame(mode);
  });
});

modeCards.forEach((card) => {
  card.addEventListener('click', () => {
    const mode = card.dataset.modeCard as GameMode;
    updateModeUI(mode);
  });
});

bindingButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeRebind = button.dataset.bindAction as ControlAction;
    renderBindings();
  });
});

touchButtons.forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const action = button.dataset.touchAction as ControlAction;
    controls.trigger(action);
  });
});

volumeInput.addEventListener('input', () => {
  settings.volume = Number(volumeInput.value) / 100;
  audio.setVolume(settings.volume);
  persistSettings();
  updateMuteButton();
});

touchThresholdInput.addEventListener('input', () => {
  settings.touchThreshold = Number(touchThresholdInput.value);
  touchControls.updateSettings({ threshold: settings.touchThreshold });
  persistSettings();
});

tapMsInput.addEventListener('input', () => {
  settings.tapMs = Number(tapMsInput.value);
  touchControls.updateSettings({ tapMs: settings.tapMs });
  persistSettings();
});

themeSelect.addEventListener('change', () => {
  settings.theme = themeSelect.value as AppSettings['theme'];
  applyTheme(settings.theme);
  persistSettings();
});

document.addEventListener('keydown', handleRebindKey, true);

applyTheme(settings.theme);
syncSettingsUI();
updateMuteButton();
updateModeUI(selectedMode);
updateStateUI('idle');
comboValueEl.textContent = 'x0';
registerServiceWorker();
