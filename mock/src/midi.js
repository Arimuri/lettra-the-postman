// Minimal MIDI parser. Only extracts note-on events with timing.
// No external dependencies.

export function parseMidi(buffer) {
  const data = new DataView(buffer);
  let pos = 0;

  function readUint16() { const v = data.getUint16(pos); pos += 2; return v; }
  function readUint32() { const v = data.getUint32(pos); pos += 4; return v; }
  function readVarLen() {
    let v = 0;
    for (;;) {
      const b = data.getUint8(pos++);
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
  }

  // Header
  const headerTag = String.fromCharCode(data.getUint8(pos), data.getUint8(pos+1), data.getUint8(pos+2), data.getUint8(pos+3));
  pos += 4;
  if (headerTag !== 'MThd') throw new Error('Not a MIDI file');
  const headerLen = readUint32();
  const format = readUint16();
  const numTracks = readUint16();
  const timeDivision = readUint16();
  const ticksPerBeat = timeDivision & 0x7fff;

  // Tempo map (default 120 BPM)
  const tempoChanges = [{ tick: 0, usPerBeat: 500000 }]; // 120 BPM default
  const notes = [];

  for (let t = 0; t < numTracks; t++) {
    const trackTag = String.fromCharCode(data.getUint8(pos), data.getUint8(pos+1), data.getUint8(pos+2), data.getUint8(pos+3));
    pos += 4;
    if (trackTag !== 'MTrk') throw new Error('Expected MTrk');
    const trackLen = readUint32();
    const trackEnd = pos + trackLen;
    let tick = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      tick += readVarLen();
      let status = data.getUint8(pos);

      if (status < 0x80) {
        // Running status
        status = runningStatus;
      } else {
        pos++;
        runningStatus = status;
      }

      const type = status & 0xf0;

      if (type === 0x90) {
        // Note on
        const note = data.getUint8(pos++);
        const vel = data.getUint8(pos++);
        if (vel > 0) {
          notes.push({ tick, midi: note, velocity: vel });
        }
      } else if (type === 0x80) {
        // Note off — skip
        pos += 2;
      } else if (type === 0xa0) {
        // Aftertouch
        pos += 2;
      } else if (type === 0xb0) {
        // Control change
        pos += 2;
      } else if (type === 0xc0) {
        // Program change
        pos += 1;
      } else if (type === 0xd0) {
        // Channel pressure
        pos += 1;
      } else if (type === 0xe0) {
        // Pitch bend
        pos += 2;
      } else if (status === 0xff) {
        // Meta event
        const metaType = data.getUint8(pos++);
        const metaLen = readVarLen();
        if (metaType === 0x51 && metaLen === 3) {
          // Tempo
          const usPerBeat = (data.getUint8(pos) << 16) | (data.getUint8(pos+1) << 8) | data.getUint8(pos+2);
          tempoChanges.push({ tick, usPerBeat });
        }
        pos += metaLen;
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        const len = readVarLen();
        pos += len;
      } else {
        // Unknown, skip
        break;
      }
    }
    pos = trackEnd;
  }

  // Sort tempo changes
  tempoChanges.sort((a, b) => a.tick - b.tick);

  // Convert ticks to seconds
  function tickToSec(tick) {
    let sec = 0;
    let prevTick = 0;
    let usPerBeat = tempoChanges[0].usPerBeat;
    for (let i = 1; i < tempoChanges.length; i++) {
      if (tempoChanges[i].tick >= tick) break;
      sec += ((tempoChanges[i].tick - prevTick) / ticksPerBeat) * (usPerBeat / 1000000);
      prevTick = tempoChanges[i].tick;
      usPerBeat = tempoChanges[i].usPerBeat;
    }
    sec += ((tick - prevTick) / ticksPerBeat) * (usPerBeat / 1000000);
    return sec;
  }

  const bpm = 60000000 / tempoChanges[0].usPerBeat;

  return {
    bpm,
    notes: notes.map(n => ({ time: tickToSec(n.tick), midi: n.midi, velocity: n.velocity })),
    duration: notes.length > 0 ? tickToSec(notes[notes.length - 1].tick) + 1 : 0,
  };
}
