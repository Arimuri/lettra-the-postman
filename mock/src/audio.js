// AudioContext wrapper. All game time is derived from ctx.currentTime.

export class Audio {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = {};
    this.startTime = 0;   // ctx.currentTime when the loop started
    this.loopDuration = 0;
    this.started = false;
    this.activeSample = null; // currently playing one-shot (choke group)
  }

  async load(name, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const arr = await res.arrayBuffer();
      this.buffers[name] = await this.ctx.decodeAudioData(arr);
    } catch (e) {
      // Fallback: synthesize a placeholder so the mock still runs without assets.
      this.buffers[name] = this._placeholder(name);
      console.warn(`audio: using placeholder for ${name} (${e.message})`);
    }
  }

  _placeholder(name) {
    // 8 sec drum-ish loop or 0.2s blip depending on name
    const sr = this.ctx.sampleRate;
    if (name === 'drums') {
      const dur = 8;
      const buf = this.ctx.createBuffer(1, sr * dur, sr);
      const d = buf.getChannelData(0);
      const bpm = 90;
      const beat = 60 / bpm;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const phase = (t % beat) / beat;
        // kick on every beat
        if (phase < 0.05) d[i] += Math.sin(2 * Math.PI * 60 * t) * (1 - phase / 0.05);
        // hat offbeat
        const hphase = ((t + beat / 2) % beat) / beat;
        if (hphase < 0.02) d[i] += (Math.random() * 2 - 1) * 0.2;
        // bass walking
        d[i] += Math.sin(2 * Math.PI * 80 * t) * 0.1;
      }
      return buf;
    }
    // pad blip
    const dur = 0.25;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    const freqMap = { up: 880, down: 220, left: 440, right: 660 };
    const f = freqMap[name] || 440;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 8);
    }
    return buf;
  }

  startLoop(name, delay = 0) {
    const buf = this.buffers[name];
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.ctx.destination);
    this.startTime = this.ctx.currentTime + 0.1; // small offset for stable scheduling
    this.loopDuration = buf.duration;
    src.start(this.startTime + delay);
    this.started = true;
  }

  playOneShot(name) {
    const buf = this.buffers[name];
    if (!buf) return;
    // Choke: stop any currently playing sample before starting new one.
    if (this.activeSample) {
      try {
        this.activeSample.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.005);
        this.activeSample.src.stop(this.ctx.currentTime + 0.03);
      } catch (e) {}
    }
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.connect(gain).connect(this.ctx.destination);
    src.start();
    const handle = { src, gain };
    this.activeSample = handle;
    src.onended = () => { if (this.activeSample === handle) this.activeSample = null; };
  }

  // Current song time in seconds since loop start. Negative before start.
  now() {
    return this.ctx.currentTime - this.startTime;
  }
}
