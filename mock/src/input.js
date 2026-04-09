// Keyboard input -> button index. D=0(□) F=1(×) J=2(○) K=3(△)
// Returns press events with the audio time captured at the moment of keydown.

export class Input {
  constructor(audio) {
    this.audio = audio;
    this.queue = [];
    this.held = [false, false, false, false];
    const map = { d: 0, f: 1, j: 2, k: 3 };
    window.addEventListener('keydown', (e) => {
      const b = map[e.key.toLowerCase()];
      if (b === undefined || e.repeat) return;
      this.held[b] = true;
      this.queue.push({ button: b, time: this.audio.now() });
    });
    window.addEventListener('keyup', (e) => {
      const b = map[e.key.toLowerCase()];
      if (b === undefined) return;
      this.held[b] = false;
    });
  }

  drain() {
    const q = this.queue;
    this.queue = [];
    return q;
  }
}
