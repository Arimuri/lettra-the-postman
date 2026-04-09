// Chart loader. Reads a .mid file via @tonejs/midi (loaded as ES module from CDN).
// MIDI note -> button mapping:
//   C3 (60) = 0 □ left
//   D3 (62) = 1 × down
//   E3 (64) = 2 ○ right
//   F3 (65) = 3 △ up
// Note length and velocity are ignored (only onset time is used).

import { Midi } from 'https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm';

const NOTE_TO_BUTTON = { 60: 0, 62: 1, 64: 2, 65: 3 };

export async function loadChart(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`chart load failed: ${url} (${res.status})`);
  const arr = await res.arrayBuffer();
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

  const bpm = midi.header.tempos[0]?.bpm ?? 90;
  const duration = midi.duration;

  return { notes, bpm, duration };
}

// Fallback hardcoded chart (used if no MIDI file is provided).
const BPM = 90;
const beat = 60 / BPM;
const bar = beat * 4;
const t = (b, be) => (b - 1) * bar + be * beat;

export const FALLBACK_CHART = {
  bpm: BPM,
  duration: bar * 8,
  notes: [
    { time: t(1, 0),   button: 1 },
    { time: t(1, 2),   button: 2 },
    { time: t(2, 0),   button: 0 },
    { time: t(2, 1.5), button: 3 },
    { time: t(2, 3),   button: 2 },
    { time: t(3, 0),   button: 1 },
    { time: t(3, 1),   button: 1 },
    { time: t(3, 2),   button: 0 },
    { time: t(4, 0),   button: 3 },
    { time: t(4, 2),   button: 3 },
    { time: t(4, 3.5), button: 2 },
    { time: t(5, 0),   button: 1 },
    { time: t(5, 2),   button: 0 },
    { time: t(6, 0),   button: 2 },
    { time: t(6, 1),   button: 3 },
    { time: t(6, 2.5), button: 2 },
    { time: t(7, 0),   button: 1 },
    { time: t(7, 1),   button: 0 },
    { time: t(7, 2),   button: 2 },
    { time: t(7, 3),   button: 3 },
    { time: t(8, 0),   button: 1 },
    { time: t(8, 2),   button: 3 },
  ],
};
