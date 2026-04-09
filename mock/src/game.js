// Render + judge.
// 4-lane horizontal layout. Posts scroll right -> left in their lane.
// Hitting a post when it crosses LANE_X plays the corresponding sample.

const W = 960, H = 400;
const LANE_X = 200;            // judge line x
const SCROLL_PX_PER_SEC = 280;
const JUDGE_WINDOW = 0.060;    // ±60ms

// Lane area
const LANE_TOP = 40;
const LANE_BOTTOM = 240;
const LANE_H = (LANE_BOTTOM - LANE_TOP) / 4;

// Button index -> lane row, color, key label, glyph
// Lanes are ordered top→bottom = D F J K (matching keyboard left→right).
const BUTTONS = [
  { row: 0, color: '#e6b800', key: 'D', glyph: '□' }, // 0
  { row: 1, color: '#2a6cdb', key: 'F', glyph: '×' }, // 1
  { row: 2, color: '#d63838', key: 'J', glyph: '○' }, // 2
  { row: 3, color: '#2aa84a', key: 'K', glyph: '△' }, // 3
];

const SAMPLE_NAME = ['left', 'down', 'right', 'up'];

function laneY(row) { return LANE_TOP + LANE_H * row + LANE_H / 2; }

export class Game {
  constructor(canvas, audio, input, chart) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.input = input;
    this.notes = chart.notes.map(n => ({ ...n, hit: false, missed: false }));
    this.feedback = [];
    this.stats = { hit: 0, miss: 0, ghost: 0 };
    this.flash = [0, 0, 0, 0]; // pad flash timers
    this.bpm = chart.bpm || 120;
    this.precount = 4; // beats of precount
    this.precountDur = this.precount * (60 / this.bpm); // seconds
  }

  // Game time = audio time minus precount duration.
  // During precount, gameTime is negative.
  gameTime() {
    return this.audio.now() - this.precountDur;
  }

  update() {
    const now = this.gameTime();

    for (const press of this.input.drain()) {
      const pressTime = press.time - this.precountDur; // convert to game time
      let best = null, bestDt = Infinity;
      for (const n of this.notes) {
        if (n.hit || n.missed) continue;
        if (n.button !== press.button) continue;
        const dt = Math.abs(n.time - pressTime);
        if (dt < bestDt) { bestDt = dt; best = n; }
      }
      this.flash[press.button] = now;
      const b = BUTTONS[press.button];
      if (best && bestDt <= JUDGE_WINDOW) {
        best.hit = true;
        this.audio.playOneShot(SAMPLE_NAME[press.button]);
        this.stats.hit++;
        this.feedback.push({ text: 'HIT', time: now, x: LANE_X, y: laneY(b.row) - 22 });
      } else {
        this.stats.ghost++;
        this.feedback.push({ text: '—', time: now, x: LANE_X, y: laneY(b.row) - 22 });
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
    const ctx = this.ctx;
    const now = this.gameTime();
    ctx.clearRect(0, 0, W, H);

    // Precount overlay
    if (now < 0) {
      const beatLen = 60 / this.bpm;
      const beatNum = Math.floor(-now / beatLen);
      const countDisplay = this.precount - beatNum;
      const beatPhase = 1 - ((-now % beatLen) / beatLen); // 0→1 within beat

      ctx.fillStyle = '#1a1a1a';
      ctx.font = `bold ${60 + beatPhase * 20}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.3 + beatPhase * 0.7;
      ctx.fillText(countDisplay, W / 2, H / 2 - 40);
      ctx.globalAlpha = 1;
    }

    // 4 lanes
    for (let i = 0; i < 4; i++) {
      const y = LANE_TOP + LANE_H * i;
      // alternating subtle bg
      ctx.fillStyle = i % 2 === 0 ? '#ece8df' : '#f4f1ea';
      ctx.fillRect(0, y, W, LANE_H);
      // lane separator
      ctx.strokeStyle = 'rgba(26,26,26,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
    // bottom border of lanes
    ctx.strokeStyle = 'rgba(26,26,26,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, LANE_BOTTOM); ctx.lineTo(W, LANE_BOTTOM);
    ctx.stroke();

    // lane labels on the left (color block + key)
    for (let bi = 0; bi < 4; bi++) {
      const b = BUTTONS[bi];
      const y = laneY(b.row);
      // color marker
      ctx.fillStyle = b.color;
      ctx.fillRect(8, y - 14, 28, 28);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, y - 14, 28, 28);
      // key letter inside
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.key, 22, y);
      // glyph next to it
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '18px ui-monospace, monospace';
      ctx.fillText(b.glyph, 52, y);
    }

    // judge line
    ctx.strokeStyle = 'rgba(26,26,26,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LANE_X, LANE_TOP); ctx.lineTo(LANE_X, LANE_BOTTOM);
    ctx.stroke();

    // judge zone (±60ms width visualized)
    const zoneW = JUDGE_WINDOW * SCROLL_PX_PER_SEC;
    ctx.fillStyle = 'rgba(214,56,56,0.08)';
    ctx.fillRect(LANE_X - zoneW, LANE_TOP, zoneW * 2, LANE_BOTTOM - LANE_TOP);

    // postman character at the judge line
    this.drawPostman(ctx, now);

    // posts
    for (const n of this.notes) {
      const x = LANE_X + (n.time - now) * SCROLL_PX_PER_SEC;
      if (x < -60 || x > W + 60) continue;
      const b = BUTTONS[n.button];
      const y = laneY(b.row);

      if (n.hit) continue; // hide hit notes

      // big colored circle = the note
      ctx.fillStyle = n.missed ? 'rgba(26,26,26,0.15)' : b.color;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // key letter inside the note (giant readability)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.key, x, y);
    }

    // pad HUD bottom: single row D F J K matching keyboard
    const padSize = 48, padGap = 10;
    const totalW = padSize * 4 + padGap * 3;
    const padOX = W / 2 - totalW / 2;
    const padOY = 270;
    const layout = [
      { btn: 0, col: 0 }, // D
      { btn: 1, col: 1 }, // F
      { btn: 2, col: 2 }, // J
      { btn: 3, col: 3 }, // K
    ];
    for (const p of layout) {
      const b = BUTTONS[p.btn];
      const px = padOX + p.col * (padSize + padGap);
      const py = padOY;
      const isHeld = this.input.held[p.btn];
      const flashAge = now - this.flash[p.btn];
      const flashing = flashAge >= 0 && flashAge < 0.15;
      ctx.fillStyle = (isHeld || flashing) ? b.color : '#f4f1ea';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.fillRect(px, py, padSize, padSize);
      ctx.strokeRect(px, py, padSize, padSize);
      ctx.fillStyle = (isHeld || flashing) ? '#fff' : '#1a1a1a';
      ctx.font = 'bold 16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.key, px + padSize / 2, py + padSize / 2 - 8);
      ctx.font = '14px ui-monospace, monospace';
      ctx.fillText(b.glyph, px + padSize / 2, py + padSize / 2 + 10);
    }

    // feedback toasts
    this.feedback = this.feedback.filter(f => now - f.time < 0.5);
    for (const f of this.feedback) {
      const a = 1 - (now - f.time) / 0.5;
      ctx.fillStyle = `rgba(26,26,26,${a})`;
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y - (now - f.time) * 30);
    }

    document.getElementById('stat').textContent =
      `hit ${this.stats.hit} / miss ${this.stats.miss} / ghost ${this.stats.ghost}`;
  }

  drawPostman(ctx, now) {
    // Position: left side, standing below lanes
    const cx = 80;
    const groundY = LANE_BOTTOM + 100;

    // Run cycle: bounce + leg swing
    const runT = now * 6; // ~6 steps/sec
    const bounce = Math.abs(Math.sin(runT)) * 4;
    const legSwing = Math.sin(runT) * 8;
    const armSwing = Math.sin(runT + Math.PI) * 6;

    // Hit reaction: any flash within last 0.12s gives a punch forward
    let punch = 0;
    let punchColor = null;
    for (let i = 0; i < 4; i++) {
      const age = now - this.flash[i];
      if (age >= 0 && age < 0.12) {
        const k = 1 - age / 0.12;
        if (k > punch) { punch = k; punchColor = BUTTONS[i].color; }
      }
    }

    const bodyX = cx;
    const feetY = groundY;
    const hipY = feetY - 26 - bounce;
    const shoulderY = hipY - 18;
    const headCY = shoulderY - 12;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = '#1a1a1a';

    // mail bag (behind body)
    ctx.fillStyle = '#c8b48a';
    ctx.beginPath();
    ctx.ellipse(bodyX + 10, hipY + 4, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();
    // bag strap
    ctx.beginPath();
    ctx.moveTo(bodyX - 6, shoulderY);
    ctx.lineTo(bodyX + 14, hipY);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(bodyX, hipY);
    ctx.lineTo(bodyX - legSwing, feetY);
    ctx.moveTo(bodyX, hipY);
    ctx.lineTo(bodyX + legSwing, feetY);
    ctx.stroke();

    // body
    ctx.beginPath();
    ctx.moveTo(bodyX, hipY);
    ctx.lineTo(bodyX, shoulderY);
    ctx.stroke();

    // arms
    const armReach = punch * 14;
    ctx.beginPath();
    ctx.moveTo(bodyX, shoulderY);
    ctx.lineTo(bodyX + armSwing + armReach, shoulderY + 8 - punch * 6);
    ctx.moveTo(bodyX, shoulderY);
    ctx.lineTo(bodyX - armSwing, shoulderY + 8);
    ctx.stroke();

    // head
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(bodyX, headCY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // postman cap
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(bodyX, headCY - 2, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    // cap brim
    ctx.beginPath();
    ctx.moveTo(bodyX - 9, headCY - 2);
    ctx.lineTo(bodyX + 11, headCY - 2);
    ctx.lineWidth = 3;
    ctx.stroke();

    // letter on hit
    if (punch > 0.2) {
      const lx = bodyX + 18 + punch * 10;
      const ly = shoulderY + 6;
      ctx.fillStyle = punchColor || '#fff';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.fillRect(lx - 7, ly - 5, 14, 10);
      ctx.strokeRect(lx - 7, ly - 5, 14, 10);
      // envelope flap
      ctx.beginPath();
      ctx.moveTo(lx - 7, ly - 5);
      ctx.lineTo(lx, ly);
      ctx.lineTo(lx + 7, ly - 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}
