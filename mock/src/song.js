// Song manifest loader.
// A "song" lives at /songs/<id>/ and contains:
//   song.json   - { title, bpm, drums, samples[4], chart }
//   drums.mp3
//   sample1..4.mp3
//   chart.mid   (optional)

import { Midi } from 'https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm';

const NOTE_TO_BUTTON = { 60: 0, 62: 1, 64: 2, 65: 3 };

export async function loadSong(id) {
  const base = `./songs/${id}`;
  const res = await fetch(`${base}/song.json`);
  if (!res.ok) throw new Error(`song.json not found: ${id}`);
  const manifest = await res.json();

  // Resolve URLs relative to song folder
  const urls = {
    drums: `${base}/${manifest.drums}`,
    samples: manifest.samples.map(s => `${base}/${s}`),
    chart: manifest.chart ? `${base}/${manifest.chart}` : null,
  };

  // Load chart (MIDI). Falls back to empty notes if missing.
  let chart = { notes: [], bpm: manifest.bpm, duration: 0 };
  if (urls.chart) {
    try {
      const cr = await fetch(urls.chart);
      if (cr.ok) {
        const arr = await cr.arrayBuffer();
        const midi = new Midi(arr);
        const notes = [];
        for (const track of midi.tracks) {
          for (const n of track.notes) {
            const b = NOTE_TO_BUTTON[n.midi];
            if (b === undefined) continue;
            notes.push({ time: n.time, button: b });
          }
        }
        notes.sort((a, b) => a.time - b.time);
        chart = {
          notes,
          bpm: midi.header.tempos[0]?.bpm ?? manifest.bpm,
          duration: midi.duration,
        };
      } else {
        console.warn(`chart not found: ${urls.chart} — empty chart`);
      }
    } catch (e) {
      console.warn(`chart load failed: ${e.message}`);
    }
  }

  return { id, manifest, urls, chart };
}
