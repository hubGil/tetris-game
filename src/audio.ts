export class AudioManager {
  private _ctx: AudioContext | null = null;
  muted = false;

  toggle(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  playMove(): void {
    this._tone(200, 0.03, 'square', 0.06);
  }

  playRotate(): void {
    this._tone(300, 0.04, 'square', 0.06);
  }

  playLock(): void {
    this._noise(0.08, 0.15);
  }

  playHold(): void {
    this._tone(440, 0.06, 'sine', 0.1);
  }

  playClear(lines: number): void {
    const freqs = [262, 330, 392, 523];
    for (let index = 0; index < Math.min(lines, 4); index += 1) {
      setTimeout(
        () => this._tone(freqs[index], 0.18, 'sine', 0.25),
        index * 70,
      );
    }
  }

  playGameOver(): void {
    [392, 330, 262, 196].forEach((frequency, index) => {
      setTimeout(
        () => this._tone(frequency, 0.25, 'sawtooth', 0.12),
        index * 120,
      );
    });
  }

  private _getCtx(): AudioContext {
    if (!this._ctx) this._ctx = new AudioContext();
    return this._ctx;
  }

  private _tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
  ): void {
    if (this.muted) return;

    try {
      const ctx = this._getCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration + 0.01);
    } catch {}
  }

  private _noise(duration: number, gainValue: number): void {
    if (this.muted) return;

    try {
      const ctx = this._getCtx();
      const size = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let index = 0; index < size; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.start(ctx.currentTime);
    } catch {}
  }
}
