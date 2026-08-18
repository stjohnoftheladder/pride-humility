// Tiny WebAudio synthesizer: all SFX generated procedurally, no audio files.
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() { this.ensure(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _t(freq, dur, type = 'square', vol = 0.2, when = 0, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol = 0.2, freq = 800, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  cast() { this._t(620, 0.12, 'triangle', 0.22, 0, 260); this._t(1240, 0.08, 'sine', 0.12, 0.02); }
  blast() { this._t(180, 0.35, 'sawtooth', 0.3, 0, -100); this._noise(0.3, 0.25, 500); }
  hit() { this._noise(0.12, 0.3, 1400); this._t(300, 0.1, 'square', 0.12, 0, -120); }
  explode() { this._noise(0.5, 0.4, 400); this._t(90, 0.5, 'sine', 0.3, 0, -40); }
  hurt() { this._t(220, 0.2, 'sawtooth', 0.25, 0, -90); }
  pickup() { this._t(660, 0.09, 'triangle', 0.18); this._t(880, 0.09, 'triangle', 0.18, 0.07); this._t(1320, 0.14, 'triangle', 0.18, 0.14); }
  gem() { this._t(880, 0.08, 'sine', 0.2); this._t(1174, 0.08, 'sine', 0.2, 0.06); this._t(1568, 0.16, 'sine', 0.2, 0.12); }
  portal() { this._t(440, 0.3, 'sine', 0.2, 0, 220); this._t(660, 0.4, 'sine', 0.15, 0.15, 330); }
  enemyDie() { this._t(400, 0.3, 'sawtooth', 0.2, 0, -320); this._noise(0.25, 0.2, 900); }
  win() {
    for (const [f, t] of [[523, 0], [659, 0.15], [784, 0.3], [1046, 0.5]]) this._t(f, 0.35, 'triangle', 0.2, t);
  }
  lose() { for (const [f, t] of [[392, 0], [330, 0.25], [262, 0.5], [196, 0.8]]) this._t(f, 0.4, 'sawtooth', 0.18, t); }

  // ---- Pride & Humility additions -----------------------------------------
  /** Quiet Jesus-Prayer chime — used when the pilgrim prays. */
  pray() {
    this._t(784, 0.3, 'sine', 0.12, 0, 40);
    this._t(1174, 0.45, 'sine', 0.08, 0.12);
    this._noise(0.5, 0.03, 2400, 0.05);
  }

  /** Warm mercy chime on a successful spare. */
  mercy() {
    for (const [f, t] of [[587, 0], [880, 0.12], [1174, 0.24]]) this._t(f, 0.4, 'triangle', 0.16, t);
    this._t(1568, 0.7, 'sine', 0.1, 0.36);
  }

  /** Dark sting when the pilgrim falls. */
  fallSting() {
    for (const [f, t] of [[311, 0], [233, 0.3], [155, 0.6]]) this._t(f, 0.7, 'sawtooth', 0.14, t, -30);
    this._noise(1.2, 0.1, 300, 0.1);
  }

  /** Low chapel drone + candle crackle; call once, loops forever. */
  startAmbient() {
    if (!this.ctx || this.ambientOn) return;
    this.ambientOn = true;
    const t0 = this.ctx.currentTime;
    // drone: two detuned sines through a lowpass
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.connect(this.master);
    for (const f of [55, 82.4, 110]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 4);
      o.connect(g).connect(lp);
      o.start(t0);
      this._ambientNodes = this._ambientNodes || [];
      this._ambientNodes.push(o, g);
    }
    // candle crackle: sparse filtered-noise ticks
    const crackle = () => {
      if (!this.ambientOn) return;
      this._noise(0.08, 0.05, 1600 + Math.random() * 1200);
      setTimeout(crackle, 120 + Math.random() * 500);
    };
    setTimeout(crackle, 800);
  }

  stopAmbient() {
    this.ambientOn = false;
    if (this._ambientNodes) {
      for (const n of this._ambientNodes) { try { n.stop(); } catch { /* */ } }
      this._ambientNodes = [];
    }
  }
}
