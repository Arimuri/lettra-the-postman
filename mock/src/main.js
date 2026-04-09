import { Audio } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { loadChart, FALLBACK_CHART } from './chart.js';

const canvas = document.getElementById('c');
const startBtn = document.getElementById('start');

const audio = new Audio();
const input = new Input(audio);

// URL param ?chart=stage01 to switch (defaults to stage01).
const params = new URLSearchParams(location.search);
const chartName = params.get('chart') || 'stage01';

(async () => {
  let chart;
  try {
    chart = await loadChart(`../charts/${chartName}.mid`);
    console.log(`chart: ${chartName}.mid loaded — ${chart.notes.length} notes, ${chart.bpm} BPM`);
  } catch (e) {
    console.warn(`chart: ${e.message} — using fallback`);
    chart = FALLBACK_CHART;
  }

  await Promise.all([
    audio.load('drums', '../assets/Drums.mp3'),
    audio.load('left',  '../assets/Sample1.mp3'),
    audio.load('down',  '../assets/Sample2.mp3'),
    audio.load('right', '../assets/Sample3.mp3'),
    audio.load('up',    '../assets/Sample4.mp3'),
  ]);

  startBtn.addEventListener('click', async () => {
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
    audio.startLoop('drums');
    const game = new Game(canvas, audio, input, chart);
    game.loop();
    startBtn.disabled = true;
    startBtn.textContent = 'PLAYING';
  }, { once: false });
})();
