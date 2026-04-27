/**
 * Reusable keyboard input handler.
 *
 * Usage:
 *   const controls = new Controls({ ArrowLeft: 'moveLeft', ArrowRight: 'moveRight' });
 *   controls.on('moveLeft', () => player.move(-1));
 *   controls.destroy(); // remove listeners
 */
export class Controls {
  constructor(bindings = {}) {
    this._bindings = bindings;
    this._handlers = {};
    this._listener = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._listener);
  }

  on(action, callback) {
    this._handlers[action] = callback;
    return this;
  }

  off(action) {
    delete this._handlers[action];
    return this;
  }

  destroy() {
    document.removeEventListener('keydown', this._listener);
    this._handlers = {};
  }

  _onKeyDown(e) {
    const action = this._bindings[e.code] ?? this._bindings[e.key];
    if (action && this._handlers[action]) {
      e.preventDefault();
      this._handlers[action](e);
    }
  }
}
