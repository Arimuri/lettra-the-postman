import { Audio } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { loadSong } from './song.js';

const canvas = document.getElementById('c');
const startBtn = document.getElementById('start');

const audio = new Audio();
const input = new Input(audio);

// URL: ?song=stage01
const params = new URLSearchParams(location.search);
const songId = params.get('song') || 'stage01';

(async () => {
  const song = await loadSong(songId);
  console.log(`song: ${song.manifest.title} @ ${song.chart.bpm} BPM, ${song.chart.notes.length} notes`);

  await Promise.all([
    audio.load('drums', song.urls.drums),
    audio.load('left',  song.urls.samples[0]),
    audio.load('down',  song.urls.samples[1]),
    audio.load('right', song.urls.samples[2]),
    audio.load('up',    song.urls.samples[3]),
  ]);

  startBtn.addEventListener('click', async () => {
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
    audio.startLoop('drums');
    const game = new Game(canvas, audio, input, song.chart);
    game.loop();
    startBtn.disabled = true;
    startBtn.textContent = 'PLAYING';
  }, { once: false });
})();
