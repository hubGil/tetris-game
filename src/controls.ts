import type { ControlAction } from '@/types.js';

type ControlHandler = (event?: KeyboardEvent) => void;

export class Controls {
  private _bindings: Partial<Record<string, ControlAction>>;
  private _handlers: Partial<Record<ControlAction, ControlHandler>> = {};
  private _releaseHandlers: Partial<Record<ControlAction, ControlHandler>> = {};
  private readonly _pressedActions = new Set<ControlAction>();
  private readonly _listener: (event: KeyboardEvent) => void;
  private readonly _releaseListener: (event: KeyboardEvent) => void;

  constructor(bindings: Partial<Record<string, ControlAction>> = {}) {
    this._bindings = bindings;
    this._listener = this._onKeyDown.bind(this);
    this._releaseListener = this._onKeyUp.bind(this);
    document.addEventListener('keydown', this._listener);
    document.addEventListener('keyup', this._releaseListener);
  }

  on(action: ControlAction, callback: ControlHandler): this {
    this._handlers[action] = callback;
    return this;
  }

  off(action: ControlAction): this {
    delete this._handlers[action];
    return this;
  }

  onRelease(action: ControlAction, callback: ControlHandler): this {
    this._releaseHandlers[action] = callback;
    return this;
  }

  offRelease(action: ControlAction): this {
    delete this._releaseHandlers[action];
    return this;
  }

  trigger(action: ControlAction): this {
    this._handlers[action]?.();
    return this;
  }

  setBindings(bindings: Partial<Record<string, ControlAction>>): this {
    this._bindings = { ...bindings };
    return this;
  }

  getBindings(): Partial<Record<string, ControlAction>> {
    return { ...this._bindings };
  }

  isPressed(action: ControlAction): boolean {
    return this._pressedActions.has(action);
  }

  destroy(): void {
    document.removeEventListener('keydown', this._listener);
    document.removeEventListener('keyup', this._releaseListener);
    this._handlers = {};
    this._releaseHandlers = {};
    this._pressedActions.clear();
  }

  private _onKeyDown(event: KeyboardEvent): void {
    const action = this._bindings[event.code] ?? this._bindings[event.key];
    if (!action || !this._handlers[action]) return;

    if (this._pressedActions.has(action)) {
      event.preventDefault();
      return;
    }

    this._pressedActions.add(action);
    event.preventDefault();
    this._handlers[action]?.(event);
  }

  private _onKeyUp(event: KeyboardEvent): void {
    const action = this._bindings[event.code] ?? this._bindings[event.key];
    if (!action) return;

    this._pressedActions.delete(action);
    this._releaseHandlers[action]?.(event);
  }
}
