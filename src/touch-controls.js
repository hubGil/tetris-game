/**
 * Touch gesture handler — reusable, fires actions via a Controls instance.
 *
 * Gestures:
 *   tap            → rotateRight
 *   swipe left     → moveLeft
 *   swipe right    → moveRight
 *   swipe down     → hardDrop
 *   swipe up       → rotateLeft
 */
export class TouchControls {
  constructor(element, controls, { threshold = 30, tapMs = 200 } = {}) {
    this._element = element;
    this._controls = controls;
    this._threshold = threshold;
    this._tapMs = tapMs;
    this._startX = 0;
    this._startY = 0;
    this._startTime = 0;

    this._onStart = this._onStart.bind(this);
    this._onEnd   = this._onEnd.bind(this);
    element.addEventListener('touchstart', this._onStart, { passive: true });
    element.addEventListener('touchend',   this._onEnd,   { passive: true });
  }

  destroy() {
    this._element.removeEventListener('touchstart', this._onStart);
    this._element.removeEventListener('touchend',   this._onEnd);
  }

  _onStart(e) {
    const t = e.changedTouches[0];
    this._startX    = t.clientX;
    this._startY    = t.clientY;
    this._startTime = Date.now();
  }

  _onEnd(e) {
    const t    = e.changedTouches[0];
    const dx   = t.clientX - this._startX;
    const dy   = t.clientY - this._startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < this._threshold && absDy < this._threshold && Date.now() - this._startTime < this._tapMs) {
      this._controls.trigger('rotateRight');
      return;
    }

    if (absDx > absDy) {
      this._controls.trigger(dx > 0 ? 'moveRight' : 'moveLeft');
    } else {
      this._controls.trigger(dy > 0 ? 'hardDrop' : 'rotateLeft');
    }
  }
}
