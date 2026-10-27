/*
 * Laminor Pro — guitar chord shapes.
 * A small hand-written table of open-position chords plus movable barre
 * templates (E-shape and A-shape) that cover every root. Each shape has a
 * difficulty score that drives capo simplification and chord simplifying.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { mod12, noteToPc } = LP.music;

  // Standard tuning, low E → high e.
  const OPEN_STRINGS = [4, 9, 2, 7, 11, 4];

  // [root, quality, frets (low E → high e, x = muted), fingers, difficulty, bass]
  // Difficulty: 1 = first-lesson chord … 3 = full barre … 4+ = awkward.
  const OPEN_SHAPES = [
    // major
    ['C', 'maj', 'x32010', '032010', 1],
    ['D', 'maj', 'xx0232', '000132', 1],
    ['E', 'maj', '022100', '023100', 1],
    ['G', 'maj', '320003', '210003', 1],
    ['G', 'maj', '320033', '210034', 1.2],
    ['A', 'maj', 'x02220', '001230', 1],
    ['F', 'maj', 'xx3211', '003211', 2],
    // minor
    ['A', 'm', 'x02210', '002310', 1],
    ['E', 'm', '022000', '023000', 1],
    ['D', 'm', 'xx0231', '000231', 1],
    // dominant 7
    ['A', '7', 'x02020', '002030', 1],
    ['B', '7', 'x21202', '021304', 1.5],
    ['C', '7', 'x32310', '032410', 1.5],
    ['D', '7', 'xx0212', '000213', 1],
    ['E', '7', '020100', '020100', 1],
    ['G', '7', '320001', '320001', 1.3],
    // minor 7
    ['A', 'm7', 'x02010', '002010', 1],
    ['D', 'm7', 'xx0211', '000211', 1.3],
    ['E', 'm7', '020000', '020000', 1],
    ['E', 'm7', '022030', '023040', 1.1],
    ['B', 'm7', 'x20202', '010203', 1.5],
    // major 7
    ['C', 'maj7', 'x32000', '032000', 1],
    ['D', 'maj7', 'xx0222', '000111', 1],
    ['E', 'maj7', '021100', '031200', 1.3],
    ['F', 'maj7', 'xx3210', '003210', 1],
    ['G', 'maj7', '320002', '320001', 1.3],
    ['A', 'maj7', 'x02120', '002130', 1],
    // suspended
    ['A', 'sus2', 'x02200', '001200', 1],
    ['A', 'sus4', 'x02230', '001230', 1],
    ['D', 'sus2', 'xx0230', '000130', 1],
    ['D', 'sus4', 'xx0233', '000134', 1],
    ['E', 'sus4', '022200', '023400', 1],
    ['C', 'sus2', 'x30013', '030014', 1.5],
    ['C', 'sus4', 'x33011', '034011', 1.5],
    ['G', 'sus2', '300033', '200034', 1.5],
    ['G', 'sus4', '330013', '230014', 1.5],
    ['A', '7sus4', 'x02030', '002040', 1],
    ['D', '7sus4', 'xx0213', '000214', 1.2],
    ['E', '7sus4', '020200', '020300', 1],
    // sixths
    ['A', '6', 'x02222', '001111', 1],
    ['C', '6', 'x32210', '042310', 1.5],
    ['D', '6', 'xx0202', '000102', 1],
    ['E', '6', '022120', '023140', 1.5],
    ['G', '6', '320000', '210000', 1],
    ['A', 'm6', 'x02212', '002314', 1.5],
    ['D', 'm6', 'xx0201', '000201', 1],
    ['E', 'm6', '022020', '023040', 1],
    // add9 / 9
    ['C', 'add9', 'x32033', '021034', 1.5],
    ['G', 'add9', '300203', '200103', 1.5],
    ['E', 'add9', '022102', '023104', 1.5],
    ['A', 'add9', 'x02420', '001320', 1.7],
    ['F', 'add9', 'xx3213', '003214', 1.7],
    ['E', '9', '020102', '020104', 1.5],
    // power chords
    ['E', '5', '022xxx', '013000', 1],
    ['A', '5', 'x022xx', '001300', 1],
    ['D', '5', 'xx023x', '000130', 1],
    // diminished / half-diminished / augmented
    ['A', 'dim', 'x0121x', '001320', 1.5],
    ['D', 'dim', 'xx0131', '000132', 1.5],
    ['A', 'dim7', 'x01212', '001324', 1.7],
    ['D', 'dim7', 'xx0101', '000102', 1.2],
    ['E', 'dim7', '012020', '012030', 1.5],
    ['A', 'm7b5', 'x0101x', '001020', 1.3],
    ['B', 'm7b5', 'x2323x', '013240', 1.7],
    ['D', 'm7b5', 'xx0111', '000111', 1.2],
    ['E', 'm7b5', '012030', '012040', 1.5],
    ['C', 'aug', 'x32110', '043120', 2],
    ['E', 'aug', '032110', '043120', 2],
    // common slash chords
    ['C', 'maj', '332010', '432010', 1.5, 'G'],
    ['C', 'maj', '032010', '032010', 1.2, 'E'],
    ['G', 'maj', 'x20003', '010003', 1.3, 'B'],
    ['D', 'maj', '200232', '100243', 1.6, 'F#'],
    ['D', 'maj', 'x00232', '000132', 1, 'A'],
    ['A', 'm', '302210', '402310', 1.5, 'G'],
    ['A', 'm', '002210', '002310', 1, 'E'],
    ['E', 'm', 'xx0000', '000000', 1, 'D'],
    ['F', 'maj', 'x33211', '034211', 2.5, 'C'],
  ];

  // Movable shapes: fret offsets relative to the root on the 6th (E-shape) or
  // 5th (A-shape) string. null = muted string.
  const E_SHAPES = {
    maj: { f: [0, 2, 2, 1, 0, 0], g: [1, 3, 4, 2, 1, 1] },
    m: { f: [0, 2, 2, 0, 0, 0], g: [1, 3, 4, 1, 1, 1] },
    '7': { f: [0, 2, 0, 1, 0, 0], g: [1, 3, 1, 2, 1, 1] },
    m7: { f: [0, 2, 0, 0, 0, 0], g: [1, 3, 1, 1, 1, 1] },
    maj7: { f: [0, null, 1, 1, 0, null], g: [1, 0, 3, 4, 2, 0] },
    sus4: { f: [0, 2, 2, 2, 0, 0], g: [1, 2, 3, 4, 1, 1] },
    '7sus4': { f: [0, 2, 0, 2, 0, 0], g: [1, 3, 1, 4, 1, 1] },
    '6': { f: [0, null, -1, 1, 0, null], g: [2, 0, 1, 4, 3, 0] },
    m6: { f: [0, null, -1, 0, 0, null], g: [2, 0, 1, 3, 4, 0] },
    '9': { f: [0, null, 0, 1, 0, 2], g: [1, 0, 1, 2, 1, 4] },
    dim: { f: [0, null, null, 0, -1, null], g: [2, 0, 0, 3, 1, 0] },
    dim7: { f: [0, null, -1, 0, -1, null], g: [2, 0, 1, 3, 1, 0] },
    m7b5: { f: [0, null, 0, 0, -1, null], g: [2, 0, 3, 4, 1, 0] },
    aug: { f: [0, null, 2, 1, 1, null], g: [1, 0, 4, 2, 3, 0] },
    '5': { f: [0, 2, 2, null, null, null], g: [1, 3, 4, 0, 0, 0] },
    mmaj7: { f: [0, null, 1, 0, 0, null], g: [1, 0, 2, 1, 1, 0] },
  };

  const A_SHAPES = {
    maj: { f: [null, 0, 2, 2, 2, 0], g: [0, 1, 2, 3, 4, 1] },
    m: { f: [null, 0, 2, 2, 1, 0], g: [0, 1, 3, 4, 2, 1] },
    '7': { f: [null, 0, 2, 0, 2, 0], g: [0, 1, 3, 1, 4, 1] },
    m7: { f: [null, 0, 2, 0, 1, 0], g: [0, 1, 3, 1, 2, 1] },
    maj7: { f: [null, 0, 2, 1, 2, 0], g: [0, 1, 3, 2, 4, 1] },
    sus2: { f: [null, 0, 2, 2, 0, 0], g: [0, 1, 3, 4, 1, 1] },
    sus4: { f: [null, 0, 2, 2, 3, 0], g: [0, 1, 2, 3, 4, 1] },
    '7sus4': { f: [null, 0, 2, 0, 3, 0], g: [0, 1, 3, 1, 4, 1] },
    '6': { f: [null, 0, 2, 2, 2, 2], g: [0, 1, 3, 3, 3, 3] },
    m6: { f: [null, 0, -2, -1, -2, 0], g: [0, 3, 1, 2, 1, 4] },
    '9': { f: [null, 0, -1, 0, 0, 0], g: [0, 2, 1, 3, 3, 3] },
    m9: { f: [null, 0, -2, 0, 0, null], g: [0, 2, 1, 3, 4, 0] },
    dim: { f: [null, 0, 1, 2, 1, null], g: [0, 1, 2, 4, 3, 0] },
    dim7: { f: [null, 0, 1, -1, 1, null], g: [0, 2, 3, 1, 4, 0] },
    m7b5: { f: [null, 0, 1, 0, 1, null], g: [0, 1, 3, 2, 4, 0] },
    aug: { f: [null, 0, -1, -2, -2, null], g: [0, 4, 3, 1, 1, 0] },
    '5': { f: [null, 0, 2, 2, null, null], g: [0, 1, 3, 4, 0, 0] },
    mmaj7: { f: [null, 0, 2, 1, 1, 0], g: [0, 1, 4, 2, 3, 1] },
  };

  // When a quality has no shape of its own, draw the closest one.
  const FALLBACK_QUALITY = {
    add9: 'maj',
    madd9: 'm',
    maj9: 'maj7',
    m9: 'm7',
    sus2: 'maj',
    '6': 'maj',
    m6: 'm',
    mmaj7: 'm',
  };

  // Candidate qualities when simplifying, the plain triad first.
  const SIMPLIFY_CANDIDATES = {
    maj: ['maj'],
    m: ['m'],
    '7': ['maj', '7'],
    m7: ['m', 'm7'],
    maj7: ['maj', 'maj7'],
    '6': ['maj'],
    m6: ['m'],
    '9': ['maj', '7'],
    m9: ['m', 'm7'],
    maj9: ['maj', 'maj7'],
    add9: ['maj'],
    madd9: ['m'],
    sus2: ['maj'],
    sus4: ['maj'],
    '7sus4': ['maj', '7'],
    dim: ['dim'],
    dim7: ['dim', 'dim7'],
    m7b5: ['dim', 'm7b5'],
    aug: ['maj'],
    '5': ['5'],
    mmaj7: ['m'],
  };

  const UNKNOWN_DIFFICULTY = 4.5;

  const round = (n) => Math.round(n * 100) / 100;

  function parseFrets(text) {
    return text.split('').map((c) => (c === 'x' ? -1 : Number(c)));
  }

  function makeVoicing(frets, fingers, difficulty, kind) {
    const fretted = frets.filter((f) => f > 0);
    const max = fretted.length ? Math.max(...fretted) : 0;
    const min = fretted.length ? Math.min(...fretted) : 0;
    const baseFret = max <= 4 ? 1 : min;
    return { frets, fingers, difficulty, kind, baseFret, barre: findBarre(frets, fingers) };
  }

  // A finger on two or more strings at the same fret is drawn as a barre.
  function findBarre(frets, fingers) {
    for (const finger of [1, 2, 3, 4]) {
      const strings = [];
      for (let i = 0; i < 6; i++) if (fingers[i] === finger && frets[i] > 0) strings.push(i);
      if (strings.length < 2) continue;
      const fret = frets[strings[0]];
      if (strings.every((s) => frets[s] === fret)) {
        return { fret, finger, from: strings[0], to: strings[strings.length - 1] };
      }
    }
    return null;
  }

  const openByChord = new Map();
  for (const [name, quality, frets, fingers, difficulty, bass] of OPEN_SHAPES) {
    const rootPc = noteToPc(name[0], name.slice(1));
    const bassPc = bass ? noteToPc(bass[0], bass.slice(1)) : null;
    const key = shapeKey(rootPc, quality, bassPc);
    const voicing = makeVoicing(parseFrets(frets), fingers.split('').map(Number), difficulty, 'open');
    if (!openByChord.has(key)) openByChord.set(key, []);
    openByChord.get(key).push(voicing);
  }

  function shapeKey(rootPc, quality, bassPc) {
    return rootPc + ':' + quality + (bassPc == null ? '' : '/' + bassPc);
  }

  function fromTemplate(template, rootFret, kind, quality) {
    if (!template) return null;
    let r = rootFret === 0 ? 12 : rootFret;
    const offsets = template.f.filter((o) => o != null);
    if (r + Math.min(...offsets) < 1) r += 12;
    const frets = template.f.map((o) => (o == null ? -1 : r + o));
    if (Math.max(...frets) > 17) return null;
    const voicing = makeVoicing(frets, template.g.slice(), 0, kind);
    let difficulty = voicing.barre && voicing.barre.finger === 1 && voicing.barre.to - voicing.barre.from >= 3 ? 3 : 2.6;
    if (quality === '5') difficulty = 1.6;
    if (['dim', 'dim7', 'm7b5', 'aug', 'mmaj7', 'm9'].includes(quality)) difficulty += 0.3;
    // Lower positions are easier to find; a full barre on the first fret is
    // the classic beginner wall (F, Bb).
    difficulty += (r - 1) * 0.06;
    if (r === 1 && difficulty >= 3) difficulty += 0.2;
    voicing.difficulty = round(difficulty);
    return voicing;
  }

  const cache = new Map();

  /**
   * All known shapes for a chord, easiest first. For slash chords the shapes
   * that actually have that bass note come first; the others are flagged
   * with `noBass`.
   */
  function getVoicings(rootPc, quality, bassPc = null) {
    const key = shapeKey(rootPc, quality, bassPc);
    if (cache.has(key)) return cache.get(key);

    const list = [];
    if (bassPc != null && bassPc !== rootPc) {
      for (const v of openByChord.get(key) || []) list.push(v);
    }
    const plain = [];
    for (const v of openByChord.get(shapeKey(rootPc, quality, null)) || []) plain.push(v);
    const e = fromTemplate(E_SHAPES[quality], mod12(rootPc - 4), 'barre-e', quality);
    const a = fromTemplate(A_SHAPES[quality], mod12(rootPc - 9), 'barre-a', quality);
    if (e) plain.push(e);
    if (a) plain.push(a);
    plain.sort((x, y) => x.difficulty - y.difficulty);

    const needsBass = bassPc != null && bassPc !== rootPc;
    for (const v of plain) list.push(needsBass ? { ...v, noBass: true, difficulty: round(v.difficulty + 0.3) } : v);

    const seen = new Set();
    const unique = list.filter((v) => {
      const id = v.frets.join(',');
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    cache.set(key, unique);
    return unique;
  }

  /** Shapes to draw for a chord; falls back to a related quality if needed. */
  function voicingsFor(rootPc, quality, bassPc = null) {
    const own = getVoicings(rootPc, quality, bassPc);
    if (own.length) return { voicings: own, approx: false };
    const fallback = FALLBACK_QUALITY[quality];
    if (fallback) return { voicings: getVoicings(rootPc, fallback, bassPc), approx: true };
    return { voicings: [], approx: true };
  }

  function difficulty(rootPc, quality, bassPc = null) {
    const { voicings, approx } = voicingsFor(rootPc, quality, bassPc);
    if (!voicings.length) return UNKNOWN_DIFFICULTY;
    return voicings[0].difficulty + (approx ? 0.5 : 0);
  }

  /**
   * The quality to show when the "simple chords" option is on: the plain
   * triad, unless a related seventh chord is clearly easier to play
   * (B7 instead of B, Fmaj7 instead of F, Bm7 instead of Bm).
   */
  function simplestQuality(rootPc, quality) {
    const candidates = SIMPLIFY_CANDIDATES[quality] || ['maj'];
    let best = candidates[0];
    let bestDifficulty = difficulty(rootPc, best);
    for (const candidate of candidates.slice(1)) {
      const d = difficulty(rootPc, candidate);
      if (d < bestDifficulty - 0.25) {
        best = candidate;
        bestDifficulty = d;
      }
    }
    return best;
  }

  /** Pitch classes sounded by a shape (muted strings excluded). */
  function voicingNotes(frets) {
    return frets.map((f, i) => (f < 0 ? null : mod12(OPEN_STRINGS[i] + f))).filter((n) => n != null);
  }

  LP.voicings = {
    OPEN_STRINGS,
    getVoicings,
    voicingsFor,
    difficulty,
    simplestQuality,
    voicingNotes,
    UNKNOWN_DIFFICULTY,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP.voicings;
})(typeof globalThis !== 'undefined' ? globalThis : this);
