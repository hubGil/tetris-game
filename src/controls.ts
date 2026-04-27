import type { ControlAction } from '@/types.js';

type ControlHandler = (event?: KeyboardEvent) => void;

export class Controls {
  private _bindings: Partial<Record<string, ControlAction>>;
  private _handlers: Partial<Record<ControlAction, ControlHandler>> = {};
  private readonly _listener: (event: KeyboardEvent) => void;

  constructor(bindings: Partial<Record<string, ControlAction>> = {}) {
    this._bindings = bindings;
    this._listener = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._listener);
  }

  on(action: ControlAction, callback: ControlHandler): this {
    this._handlers[action] = callback;
    return this;
  }

  off(action: ControlAction): this {
    delete this._handlers[action];
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

  destroy(): void {
    document.removeEventListener('keydown', this._listener);
    this._handlers = {};
  }

  private _onKeyDown(event: KeyboardEvent): void {
    const action = this._bindings[event.code] ?? this._bindings[event.key];
    if (!action || !this._handlers[action]) return;

    event.preventDefault();
    this._handlers[action]?.(event);
  }
}
