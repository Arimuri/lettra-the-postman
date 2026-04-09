// LETTRA the Postman — single road, 4 letter types.
// Posts (TT shaped) scroll right → left on one line.
// Each post has a colored flag = which letter it wants.
// Player presses the matching button = postman pulls that letter from bag and posts it.
// Line-art / geometric style. Black on cream, minimal fills.

const W = 960, H = 320;
const ROAD_Y = 180;            // road center line
const JUDGE_X = 180;           // where postman stands / judge point
const SCROLL_PX_PER_SEC = 300;
const JUDGE_WINDOW = 0.060;    // ±60ms

// 4 letter types: button index -> color, key, label
const LETTERS = [
  { color: '#d4a017', key: 'D', label: 'parcel',  mark: '□' }, // 0 parcel
  { color: '#2a6cdb', key: 'F', label: 'airmail', mark: '/' }, // 1 airmail
  { color: '#d63838', key: 'J', label: 'express', mark: '!' }, // 2 express
  { color: '#2aa84a', key: 'K', label: 'card',    mark: '~' }, // 3 postcard
];
const SAMPLE_NAME = ['left', 'down', 'right', 'up'];

export class Game {
  constructor(canvas, audio, input, chart) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.input = input;
    this.notes = chart.notes.map(n => ({ ...n, hit: false, missed: false, hitTime: 0 }));
    this.feedback = [];
    this.stats = { hit: 0, miss: 0, ghost: 0 };
    this.flash = [0, 0, 0, 0];
    this.bpm = chart.bpm || 120;
    this.precount = 4;
    this.precountDur = this.precount * (60 / this.bpm);
  }

  gameTime() { return this.audio.now() - this.precountDur; }

  update() {
    const now = this.gameTime();
    for (const press of this.input.drain()) {
      const pt = press.time - this.precountDur;
      let best = null, bestDt = Infinity;
      for (const n of this.notes) {
        if (n.hit || n.missed) continue;
        if (n.button !== press.button) continue;
        const dt = Math.abs(n.time - pt);
        if (dt < bestDt) { bestDt = dt; best = n; }
      }
      this.flash[press.button] = now;
      if (best && bestDt <= JUDGE_WINDOW) {
        best.hit = true;
        best.hitTime = now;
        this.audio.playOneShot(SAMPLE_NAME[press.button]);
        this.stats.hit++;
      } else {
        this.stats.ghost++;
      }
    }
    for (const n of this.notes) {
      if (!n.hit && !n.missed && now > n.time + JUDGE_WINDOW) {
        n.missed = true;
        this.stats.miss++;
      }
    }
  }

  draw() {
    const c = this.ctx;
    const now = this.gameTime();
    c.clearRect(0, 0, W, H);

    // --- precount ---
    if (now < 0) {
      const beatLen = 60 / this.bpm;
      const beatNum = Math.floor(-now / beatLen);
      const count = this.precount - beatNum;
      const phase = 1 - ((-now % beatLen) / beatLen);
      c.fillStyle = '#1a1a1a';
      c.font = `bold ${50 + phase * 16}px ui-monospace, monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.globalAlpha = 0.2 + phase * 0.8;
      c.fillText(count, W / 2, H / 2 - 20);
      c.globalAlpha = 1;
    }

    // --- ground / road (hand-drawn style) ---
    // Use seeded random from x position for consistent wobble per frame
    const seed = (x) => Math.sin(x * 127.1 + 311.7) * 0.5 + 0.5;

    // Main ground line (wobbly)
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 1.8;
    c.beginPath();
    const gy = ROAD_Y + 40;
    c.moveTo(0, gy + (seed(0) - 0.5) * 3);
    for (let x = 4; x <= W; x += 4) {
      const wobble = (seed(x * 0.07) - 0.5) * 3;
      c.lineTo(x, gy + wobble);
    }
    c.stroke();

    // Second faint line below (sketch double-stroke feel)
    c.strokeStyle = 'rgba(26,26,26,0.12)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(0, gy + 3 + (seed(0.5) - 0.5) * 2);
    for (let x = 4; x <= W; x += 4) {
      const wobble = (seed(x * 0.07 + 50) - 0.5) * 2;
      c.lineTo(x, gy + 3 + wobble);
    }
    c.stroke();

    // Scrolling hash marks (hand-drawn ground texture)
    const markSpacing = 50;
    const scrollOffset = (now * SCROLL_PX_PER_SEC * 0.3) % markSpacing;
    c.strokeStyle = 'rgba(26,26,26,0.12)';
    c.lineWidth = 1;
    for (let x = -scrollOffset; x < W; x += markSpacing) {
      const w1 = (seed(x * 0.13) - 0.5) * 4;
      const w2 = (seed(x * 0.13 + 7) - 0.5) * 4;
      const len = 6 + seed(x * 0.31) * 8;
      c.beginPath();
      c.moveTo(x + w1, gy + 6);
      c.lineTo(x + w2, gy + 6 + len);
      c.stroke();
    }

    // --- judge zone ---
    const zoneW = JUDGE_WINDOW * SCROLL_PX_PER_SEC;
    c.fillStyle = 'rgba(26,26,26,0.04)';
    c.fillRect(JUDGE_X - zoneW, ROAD_Y - 60, zoneW * 2, 120);

    // --- posts (TT shape) ---
    for (const n of this.notes) {
      const x = JUDGE_X + (n.time - now) * SCROLL_PX_PER_SEC;
      if (x < -80 || x > W + 80) continue;
      const lt = LETTERS[n.button];

      // Hit animation: letter flies up from post
      if (n.hit) {
        const age = now - n.hitTime;
        if (age > 0.6) continue; // done animating
        const a = 1 - age / 0.6;
        const fly = age * 80;
        // Flying letter
        c.save();
        c.globalAlpha = a;
        c.fillStyle = lt.color;
        c.strokeStyle = '#1a1a1a';
        c.lineWidth = 1.5;
        const lx = x, ly = ROAD_Y - 20 - fly;
        c.fillRect(lx - 8, ly - 6, 16, 12);
        c.strokeRect(lx - 8, ly - 6, 16, 12);
        // envelope flap
        c.beginPath();
        c.moveTo(lx - 8, ly - 6);
        c.lineTo(lx, ly);
        c.lineTo(lx + 8, ly - 6);
        c.stroke();
        c.restore();
        continue;
      }

      const alpha = n.missed ? 0.2 : 1;
      c.save();
      c.globalAlpha = alpha;

      // Post body: TT shape (two vertical lines + horizontal top bar)
      const postTop = ROAD_Y - 30;
      const postBottom = ROAD_Y + 38;
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 2;
      // Two T poles
      c.beginPath();
      c.moveTo(x - 5, postTop + 8);
      c.lineTo(x - 5, postBottom);
      c.moveTo(x + 5, postTop + 8);
      c.lineTo(x + 5, postBottom);
      c.stroke();
      // Top bar connecting the TT
      c.beginPath();
      c.moveTo(x - 12, postTop + 8);
      c.lineTo(x + 12, postTop + 8);
      c.stroke();

      // Flag (colored, shows which letter this post wants)
      c.fillStyle = lt.color;
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 1.5;
      // Flag as small rectangle on right side of post
      c.fillRect(x + 5, postTop, 18, 12);
      c.strokeRect(x + 5, postTop, 18, 12);

      // Letter type mark inside flag
      c.fillStyle = '#fff';
      c.font = 'bold 10px ui-monospace, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(lt.key, x + 14, postTop + 6);

      // Slot (mail opening) on the post body
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x - 8, ROAD_Y - 6);
      c.lineTo(x + 8, ROAD_Y - 6);
      c.stroke();

      c.restore();
    }

    // --- postman ---
    this.drawPostman(c, now);

    // --- bag HUD (4 letters in the bag) ---
    const bagX = 20, bagY = H - 60;
    // bag shape
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 2;
    c.fillStyle = '#f4f1ea';
    c.beginPath();
    c.moveTo(bagX, bagY);
    c.lineTo(bagX + 230, bagY);
    c.lineTo(bagX + 225, bagY + 44);
    c.lineTo(bagX + 5, bagY + 44);
    c.closePath();
    c.fill();
    c.stroke();
    // bag label
    c.fillStyle = 'rgba(26,26,26,0.3)';
    c.font = '9px ui-monospace, monospace';
    c.textAlign = 'left';
    c.fillText('BAG', bagX + 8, bagY + 12);

    // 4 letter slots inside bag
    for (let i = 0; i < 4; i++) {
      const lt = LETTERS[i];
      const lx = bagX + 16 + i * 54;
      const ly = bagY + 16;
      const flashAge = now - this.flash[i];
      const flashing = flashAge >= 0 && flashAge < 0.15;
      const held = this.input.held[i];

      // letter envelope
      c.fillStyle = (held || flashing) ? lt.color : '#f4f1ea';
      c.strokeStyle = lt.color;
      c.lineWidth = 2;
      c.fillRect(lx, ly, 40, 24);
      c.strokeRect(lx, ly, 40, 24);

      // envelope flap line
      c.strokeStyle = (held || flashing) ? '#fff' : lt.color;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx + 20, ly + 10);
      c.lineTo(lx + 40, ly);
      c.stroke();

      // key label
      c.fillStyle = (held || flashing) ? '#fff' : '#1a1a1a';
      c.font = 'bold 12px ui-monospace, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(lt.key, lx + 20, ly + 14);
    }

    // --- stats ---
    c.fillStyle = 'rgba(26,26,26,0.5)';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'right';
    c.textBaseline = 'top';
    c.fillText(`${this.stats.hit} / ${this.notes.length}`, W - 12, 8);

    document.getElementById('stat').textContent =
      `hit ${this.stats.hit} / miss ${this.stats.miss} / ghost ${this.stats.ghost}`;
  }

  drawPostman(c, now) {
    const cx = JUDGE_X;
    const groundY = ROAD_Y + 38;

    // Run cycle
    const runT = now * 5;
    const bounce = Math.abs(Math.sin(runT)) * 3;
    const legSwing = Math.sin(runT) * 7;
    const armSwing = Math.sin(runT + Math.PI) * 5;

    // Hit reaction
    let punch = 0, punchColor = null;
    for (let i = 0; i < 4; i++) {
      const age = now - this.flash[i];
      if (age >= 0 && age < 0.12) {
        const k = 1 - age / 0.12;
        if (k > punch) { punch = k; punchColor = LETTERS[i].color; }
      }
    }

    const feetY = groundY;
    const hipY = feetY - 22 - bounce;
    const shoulderY = hipY - 14;
    const headCY = shoulderY - 9;

    c.save();
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.strokeStyle = '#1a1a1a';

    // bag on back
    c.fillStyle = 'rgba(26,26,26,0.08)';
    c.beginPath();
    c.ellipse(cx + 8, hipY + 2, 8, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // legs
    c.beginPath();
    c.moveTo(cx, hipY);
    c.lineTo(cx - legSwing, feetY);
    c.moveTo(cx, hipY);
    c.lineTo(cx + legSwing, feetY);
    c.stroke();

    // body
    c.beginPath();
    c.moveTo(cx, hipY);
    c.lineTo(cx, shoulderY);
    c.stroke();

    // arms
    const reach = punch * 12;
    c.beginPath();
    c.moveTo(cx, shoulderY);
    c.lineTo(cx + armSwing + reach, shoulderY + 6 - punch * 5);
    c.moveTo(cx, shoulderY);
    c.lineTo(cx - armSwing, shoulderY + 6);
    c.stroke();

    // head (circle, empty)
    c.fillStyle = '#f4f1ea';
    c.beginPath();
    c.arc(cx, headCY, 6, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // cap
    c.beginPath();
    c.moveTo(cx - 7, headCY - 1);
    c.lineTo(cx + 9, headCY - 1);
    c.stroke();

    // letter being posted (on hit)
    if (punch > 0.3 && punchColor) {
      const lx = cx + 14 + punch * 10;
      const ly = shoulderY + 4 - punch * 8;
      c.fillStyle = punchColor;
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 1.5;
      c.fillRect(lx - 6, ly - 4, 12, 8);
      c.strokeRect(lx - 6, ly - 4, 12, 8);
      // flap
      c.beginPath();
      c.moveTo(lx - 6, ly - 4);
      c.lineTo(lx, ly);
      c.lineTo(lx + 6, ly - 4);
      c.stroke();
    }

    c.restore();
  }

  loop() {
    const now = performance.now();
    // Update logic runs every frame for tight input
    this.update();
    // Draw at 12fps
    if (!this._lastDraw || now - this._lastDraw >= 1000 / 12) {
      this._lastDraw = now;
      this.draw();
    }
    requestAnimationFrame(() => this.loop());
  }
}
