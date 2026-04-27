// Procedural audio via Web Audio API — no external files needed.
// AudioContext is created lazily on first sound call (requires a user gesture).
export class AudioManager {
  constructor() {
    this._ctx   = null;
    this.muted  = false;
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }

  playMove()   { this._tone(200, 0.03, 'square',   0.06); }
  playRotate() { this._tone(300, 0.04, 'square',   0.06); }
  playLock()   { this._noise(0.08, 0.15); }
  playHold()   { this._tone(440, 0.06, 'sine',     0.10); }

  playClear(lines) {
    const freqs = [262, 330, 392, 523];
    for (let i = 0; i < Math.min(lines, 4); i++) {
      setTimeout(() => this._tone(freqs[i], 0.18, 'sine', 0.25), i * 70);
    }
  }

  playGameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.25, 'sawtooth', 0.12), i * 120)
    );
  }

  _getCtx() {
    if (!this._ctx) this._ctx = new AudioContext();
    return this._ctx;
  }

  _tone(freq, duration, type, gain) {
    if (this.muted) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch {}
  }

  _noise(duration, gain) {
    if (this.muted) return;
    try {
      const ctx  = this._getCtx();
      const size = Math.floor(ctx.sampleRate * duration);
      const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      src.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.start(ctx.currentTime);
    } catch {}
  }
}
