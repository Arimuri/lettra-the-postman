// Song manifest loader.
import { parseMidi } from './midi.js';

const NOTE_TO_BUTTON = { 60: 0, 62: 1, 64: 2, 65: 3 };

export async function loadSong(id) {
  // Resolve relative to this script's location (src/), go up one level to reach songs/
  const base = new URL(`../songs/${id}`, import.meta.url).href;
  const res = await fetch(`${base}/song.json`);
  if (!res.ok) throw new Error(`song.json not found: ${id}`);
  const manifest = await res.json();

  const urls = {
    drums: `${base}/${manifest.drums}`,
    samples: manifest.samples.map(s => `${base}/${s}`),
    chart: manifest.chart ? `${base}/${manifest.chart}` : null,
  };

  let chart = { notes: [], bpm: manifest.bpm, duration: 0 };
  if (urls.chart) {
    try {
      const cr = await fetch(urls.chart);
      if (cr.ok) {
        const arr = await cr.arrayBuffer();
        const midi = parseMidi(arr);
        const notes = [];
        for (const n of midi.notes) {
          const b = NOTE_TO_BUTTON[n.midi];
          if (b === undefined) continue;
          notes.push({ time: n.time, button: b });
        }
        notes.sort((a, b) => a.time - b.time);
        chart = {
          notes,
          bpm: midi.bpm ?? manifest.bpm,
          duration: midi.duration,
        };
      } else {
        console.warn(`chart not found: ${urls.chart} — using empty chart`);
      }
    } catch (e) {
      console.warn(`chart load failed: ${e.message} — using empty chart`);
    }
  }

  return { id, manifest, urls, chart };
}
