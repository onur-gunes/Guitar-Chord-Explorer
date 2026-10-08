// Prototype: ukulele chord shape finder
const TUNING = [67, 60, 64, 69]; // G4 C4 E4 A4
const MAX_FRET = 12;

// [semitone, letterOffset, accidental]
const CHORDS = {
  maj:   { suffix: '',      tones: [[0,0,0],[4,2,0],[7,4,0]] },
  m:     { suffix: 'm',     tones: [[0,0,0],[3,2,-1],[7,4,0]] },
  '7':   { suffix: '7',     tones: [[0,0,0],[4,2,0],[7,4,0],[10,6,-1]] },
  maj7:  { suffix: 'maj7',  tones: [[0,0,0],[4,2,0],[7,4,0],[11,6,0]] },
  m7:    { suffix: 'm7',    tones: [[0,0,0],[3,2,-1],[7,4,0],[10,6,-1]] },
  sus4:  { suffix: 'sus4',  tones: [[0,0,0],[5,3,0],[7,4,0]] },
  sus2:  { suffix: 'sus2',  tones: [[0,0,0],[2,1,0],[7,4,0]] },
  '7sus4':{ suffix: '7sus4',tones: [[0,0,0],[5,3,0],[7,4,0],[10,6,-1]] },
  '6':    { suffix: '6',    tones: [[0,0,0],[4,2,0],[7,4,0],[9,5,0]] },
  m6:    { suffix: 'm6',    tones: [[0,0,0],[3,2,-1],[7,4,0],[9,5,0]] },
  dim:   { suffix: 'dim',   tones: [[0,0,0],[3,2,-1],[6,4,-1]] },
  dim7:  { suffix: 'dim7',  tones: [[0,0,0],[3,2,-1],[6,4,-1],[9,6,-2]] },
  aug:   { suffix: 'aug',   tones: [[0,0,0],[4,2,0],[8,4,1]] },
  add9:  { suffix: 'add9',  tones: [[0,0,0],[4,2,0],[7,4,0],[14,8,0]] },
  m7b5:  { suffix: 'm7\u266d5', tones: [[0,0,0],[3,2,-1],[6,4,-1],[10,6,-1]] },
  '9':    { suffix: '9',    tones: [[0,0,0],[4,2,0],[7,4,0],[10,6,-1],[14,8,0]] },
  m9:    { suffix: 'm9',    tones: [[0,0,0],[3,2,-1],[7,4,0],[10,6,-1],[14,8,0]] },
  maj9:  { suffix: 'maj9',  tones: [[0,0,0],[4,2,0],[7,4,0],[11,6,0],[14,8,0]] },
};

function essentialSet(tones) {
  // For 5-tone chords, drop the 5th (index 2) from what must be covered
  if (tones.length > 4) {
    const rest = tones.filter((_, i) => i !== 2);
    return new Set(rest.map(t => t[0] % 12));
  }
  return new Set(tones.map(t => t[0] % 12));
}

function playable(frets) {
  const nonZero = frets.filter(f => f > 0);
  if (nonZero.length === 0) return true;
  const uniq = [...new Set(nonZero)].sort((a, b) => a - b);
  const span = uniq[uniq.length - 1] - uniq[0];
  const hasOpen = frets.some(f => f === 0);
  const minCount = nonZero.filter(f => f === uniq[0]).length;
  if (hasOpen) return span <= 3;
  // no open strings: barre at lowest fret allowed
  if (span <= 3) return true;
  return minCount >= 2 && uniq.length <= 4 && span <= 5;
}

function findShapes(rootPc, chordId) {
  const chord = CHORDS[chordId];
  const allowed = new Set(chord.tones.map(t => t[0] % 12));
  const essential = essentialSet(chord.tones);
  const shapes = [];
  const f = [0, 0, 0, 0];
  for (f[0] = 0; f[0] <= MAX_FRET; f[0]++)
  for (f[1] = 0; f[1] <= MAX_FRET; f[1]++)
  for (f[2] = 0; f[2] <= MAX_FRET; f[2]++)
  for (f[3] = 0; f[3] <= MAX_FRET; f[3]++) {
    const pcs = f.map((fr, i) => (TUNING[i] + fr) % 12);
    let ok = true;
    for (const pc of pcs) if (!allowed.has(pc)) { ok = false; break; }
    if (!ok) continue;
    let covered = true;
    for (const e of essential) if (!pcs.includes(e)) { covered = false; break; }
    if (!covered) continue;
    if (!playable(f)) continue;
    // root position preferred? just record
    shapes.push([...f]);
  }
  // sort: fewer fingers, then lower position, then lexicographic
  shapes.sort((a, b) => {
    const fa = a.filter(x => x > 0).length, fb = b.filter(x => x > 0).length;
    if (fa !== fb) return fa - fb;
    const ma = Math.max(...a), mb = Math.max(...b);
    if (ma !== mb) return ma - mb;
    for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return shapes;
}

const roots = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const pcs = { C:0, Db:1, D:2, Eb:3, E:4, F:5, 'F#':6, G:7, Ab:8, A:9, Bb:10, B:11 };

const testCases = [
  ['C','maj'], ['F','maj'], ['G','maj'], ['A','maj'], ['A','m'], ['C','maj7'],
  ['G','7'], ['D','m7'], ['A','sus4'], ['E','7'], ['C','dim7'], ['C','aug'],
  ['Bb','maj'], ['F#','m'], ['B','m'], ['Eb','m'], ['C','9'], ['D','m9'],
  ['Ab','maj7'], ['E','m7b5'], ['Bb','add9'], ['G','6'], ['D','7sus4'],
  ['A','dim'], ['Db','m'], ['G','maj9'],
];
for (const [root, cid] of testCases) {
  const pc = pcs[root];
  const shapes = findShapes(pc, cid);
  console.log(`${root}${CHORDS[cid].suffix}: ${shapes.length} shapes`, JSON.stringify(shapes.slice(0, 8)));
}
