import type { Controls } from '@/controls.js';

type TouchOptions = {
  threshold?: number;
  tapMs?: number;
};

export class TouchControls {
  private readonly _element: HTMLElement;
  private readonly _controls: Controls;
  private _threshold: number;
  private _tapMs: number;
  private _startX = 0;
  private _startY = 0;
  private _startTime = 0;
  private readonly _onStart: (event: TouchEvent) => void;
  private readonly _onEnd: (event: TouchEvent) => void;

  constructor(
    element: HTMLElement,
    controls: Controls,
    { threshold = 30, tapMs = 200 }: TouchOptions = {},
  ) {
    this._element = element;
    this._controls = controls;
    this._threshold = threshold;
    this._tapMs = tapMs;

    this._onStart = this._handleStart.bind(this);
    this._onEnd = this._handleEnd.bind(this);

    element.addEventListener('touchstart', this._onStart, { passive: true });
    element.addEventListener('touchend', this._onEnd, { passive: true });
  }

  destroy(): void {
    this._element.removeEventListener('touchstart', this._onStart);
    this._element.removeEventListener('touchend', this._onEnd);
  }

  updateSettings({ threshold, tapMs }: TouchOptions): void {
    if (typeof threshold === 'number') this._threshold = threshold;
    if (typeof tapMs === 'number') this._tapMs = tapMs;
  }

  private _handleStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this._startX = touch.clientX;
    this._startY = touch.clientY;
    this._startTime = Date.now();
  }

  private _handleEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this._startX;
    const dy = touch.clientY - this._startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (
      absDx < this._threshold &&
      absDy < this._threshold &&
      Date.now() - this._startTime < this._tapMs
    ) {
      this._controls.trigger('rotateRight');
      return;
    }

    if (absDx > absDy) {
      this._controls.trigger(dx > 0 ? 'moveRight' : 'moveLeft');
      return;
    }

    this._controls.trigger(dy > 0 ? 'hardDrop' : 'rotateLeft');
  }
}
