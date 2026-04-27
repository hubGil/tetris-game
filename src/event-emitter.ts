type EventMap = Record<string, unknown[]>;
type Listener<Args extends unknown[]> = (...args: Args) => void;

export class EventEmitter<Events extends EventMap> {
  private readonly _listeners = new Map<
    keyof Events,
    Array<Listener<Events[keyof Events]>>
  >();

  on<EventName extends keyof Events>(
    event: EventName,
    listener: Listener<Events[EventName]>,
  ): this {
    const listeners = this._listeners.get(event) ?? [];
    listeners.push(listener as Listener<Events[keyof Events]>);
    this._listeners.set(event, listeners);
    return this;
  }

  off<EventName extends keyof Events>(
    event: EventName,
    listener: Listener<Events[EventName]>,
  ): this {
    const listeners = this._listeners.get(event);
    if (!listeners) return this;

    const index = listeners.indexOf(listener as Listener<Events[keyof Events]>);
    if (index !== -1) listeners.splice(index, 1);
    return this;
  }

  once<EventName extends keyof Events>(
    event: EventName,
    listener: Listener<Events[EventName]>,
  ): this {
    const wrapper = (...args: Events[EventName]): void => {
      listener(...args);
      this.off(event, wrapper);
    };

    return this.on(event, wrapper);
  }

  emit<EventName extends keyof Events>(
    event: EventName,
    ...args: Events[EventName]
  ): this {
    this._listeners
      .get(event)
      ?.slice()
      .forEach((listener) => listener(...args));
    return this;
  }
}
