'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../extension/src/core/music.js');
require('../extension/src/core/voicings.js');
require('../extension/src/core/arrange.js');
require('../extension/src/core/sheet.js');

const { music, voicings, arrange, sheet } = globalThis.LaminorPro;
const { QUALITY_INTERVALS, mod12 } = music;

test('parseChord understands common chord symbols', () => {
  const cases = {
    Am: { root: 9, quality: 'm' },
    'C#m7': { root: 1, quality: 'm7' },
    Bb: { root: 10, quality: 'maj' },
    Ebm: { root: 3, quality: 'm' },
    Asus4: { root: 9, quality: 'sus4' },
    Dsus: { root: 2, quality: 'sus4' },
    Cmaj7: { root: 0, quality: 'maj7' },
    CM7: { root: 0, quality: 'maj7' },
    Dm6: { root: 2, quality: 'm6' },
    'F#dim': { root: 6, quality: 'dim' },
    'Bm7b5': { root: 11, quality: 'm7b5' },
    'G#7': { root: 8, quality: '7' },
    Cadd9: { root: 0, quality: 'add9' },
    E5: { root: 4, quality: '5' },
    'Gaug': { root: 7, quality: 'aug' },
    'C+': { root: 0, quality: 'aug' },
    'AmMaj7': { root: 9, quality: 'mmaj7' },
  };
  for (const [text, expected] of Object.entries(cases)) {
    const chord = music.parseChord(text);
    assert.ok(chord, text);
    assert.equal(chord.root, expected.root, text);
    assert.equal(chord.quality, expected.quality, text);
  }

  const slash = music.parseChord('D/F#');
  assert.equal(slash.root, 2);
  assert.equal(slash.bass, 6);
  assert.equal(slash.quality, 'maj');

  assert.equal(music.parseChord('C13').quality, '7');
  assert.equal(music.parseChord('C13').approx, true);
});

test('parseChord understands the spellings laminor.org allows', () => {
  const quality = (text) => {
    const chord = music.parseChord(text);
    return chord && chord.quality;
  };
  assert.equal(quality('Cm/maj7'), 'mmaj7');
  assert.equal(quality('Cmb5'), 'dim');
  assert.equal(quality('A4'), 'sus4');
  assert.equal(quality('C7-5'), '7');
  assert.equal(quality('Dmaj13'), 'maj7');
  assert.equal(music.parseChord('Cm/maj7').bass, null);
  assert.equal(music.renderChordName(music.parseChord('Cm/maj7'), { shift: 2 }), 'Dm/maj7');
});

test('parseChord rejects words', () => {
  for (const word of ['Hello', 'Bad', 'Be', 'Dad', 'am', 'a', 'Cab', 'x2', 'Intro', '', 'آکورد', 'Admin', 'Do']) {
    assert.equal(music.parseChord(word), null, word);
  }
});

test('renderChordName transposes and respells', () => {
  const p = music.parseChord;
  assert.equal(music.renderChordName(p('Am'), { shift: 2 }), 'Bm');
  assert.equal(music.renderChordName(p('Am'), { shift: 1, preferFlat: true }), 'Bbm');
  assert.equal(music.renderChordName(p('Am'), { shift: 1, preferFlat: false }), 'A#m');
  assert.equal(music.renderChordName(p('C#m7'), { shift: -1 }), 'Cm7');
  assert.equal(music.renderChordName(p('D/F#'), { shift: 2 }), 'E/G#');
  assert.equal(music.renderChordName(p('Bbsus4'), { shift: 3, preferFlat: true }), 'Dbsus4');
  // No shift keeps the original spelling exactly.
  assert.equal(music.renderChordName(p('A#m'), { shift: 0, preferFlat: true }), 'A#m');
  assert.equal(music.renderChordName(p('A#m'), { shift: 12, preferFlat: true }), 'A#m');
  // Forced notation rewrites even without a shift.
  assert.equal(music.renderChordName(p('A#m'), { shift: 0, preferFlat: true, respell: true }), 'Bbm');
  // Simplified quality drops extensions and the bass note.
  assert.equal(music.renderChordName(p('Cmaj7/G'), { shift: 0, quality: 'maj' }), 'C');
});

test('keys are spelled like their key signature', () => {
  const name = (text) => music.keyName(music.parseKey(text));
  assert.equal(name('A#m'), 'Bbm');
  assert.equal(name('Gb'), 'F#');
  assert.equal(name('Ebm'), 'D#m');
  assert.equal(name('C#'), 'Db');
  assert.equal(name('G#m'), 'G#m');
  assert.equal(name('Cm'), 'Cm');
  assert.equal(music.keyName(music.parseKey('Cm'), 'sharp'), 'Cm');
  assert.equal(music.keyName(music.parseKey('Eb'), 'sharp'), 'D#');
});

function lowestNote(frets) {
  for (let i = 0; i < 6; i++) if (frets[i] >= 0) return mod12(voicings.OPEN_STRINGS[i] + frets[i]);
  return null;
}

function checkVoicing(label, v, rootPc, quality, bassPc) {
  const intervals = QUALITY_INTERVALS[quality];
  const allowed = new Set(intervals.map((i) => mod12(rootPc + i)));
  if (bassPc != null) allowed.add(bassPc);
  const notes = voicings.voicingNotes(v.frets);
  for (const n of notes) assert.ok(allowed.has(n), `${label}: ${v.frets} plays a wrong note (${n})`);

  const required = intervals.filter((i) => quality === '5' || i !== 7);
  for (const i of required) {
    assert.ok(notes.includes(mod12(rootPc + i)), `${label}: ${v.frets} misses interval ${i}`);
  }

  const lowest = lowestNote(v.frets);
  if (bassPc != null && !v.noBass) assert.equal(lowest, bassPc, `${label}: ${v.frets} bass`);
  else assert.equal(lowest, rootPc, `${label}: ${v.frets} root in the bass`);

  const fretted = v.frets.filter((f) => f > 0);
  if (fretted.length) {
    assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 3, `${label}: ${v.frets} stretch`);
  }
  v.frets.forEach((f, i) => {
    if (f > 0) assert.ok(v.fingers[i] >= 1 && v.fingers[i] <= 4, `${label}: finger on string ${i}`);
    else assert.equal(v.fingers[i], 0, `${label}: no finger on open/muted string ${i}`);
  });
}

test('every chord shape plays exactly the notes of its chord', () => {
  let checked = 0;
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    for (const quality of Object.keys(QUALITY_INTERVALS)) {
      const label = `${music.noteName(rootPc)}${music.QUALITY_SUFFIX[quality]}`;
      for (const v of voicings.getVoicings(rootPc, quality)) {
        checkVoicing(label, v, rootPc, quality, null);
        checked++;
      }
      for (let bassPc = 0; bassPc < 12; bassPc++) {
        if (bassPc === rootPc) continue;
        for (const v of voicings.getVoicings(rootPc, quality, bassPc)) {
          if (v.noBass) continue;
          checkVoicing(`${label}/${music.noteName(bassPc)}`, v, rootPc, quality, bassPc);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 300, `checked ${checked} shapes`);
});

test('common chords always have a diagram', () => {
  const qualities = ['maj', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', '7sus4', '6', 'm6', '9', 'dim', 'dim7', 'm7b5', 'aug', '5', 'mmaj7', 'add9', 'madd9', 'maj9', 'm9'];
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    for (const quality of qualities) {
      const { voicings: list } = voicings.voicingsFor(rootPc, quality);
      assert.ok(list.length > 0, `${music.noteName(rootPc)} ${quality}`);
    }
  }
});

test('open chords are easier than barre chords', () => {
  const d = (name) => {
    const c = music.parseChord(name);
    return voicings.difficulty(c.root, c.quality, c.bass);
  };
  for (const easy of ['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm', 'E7', 'A7']) {
    for (const hard of ['F#m', 'Bbm', 'C#', 'G#m', 'Cm', 'Fm', 'Eb', 'Ab']) {
      assert.ok(d(easy) < d(hard), `${easy} should be easier than ${hard}`);
    }
  }
});

test('simplify keeps triads and picks easy sevenths', () => {
  const simple = (name) => {
    const c = music.parseChord(name);
    return music.renderChordName(c, { quality: voicings.simplestQuality(c.root, c.quality) });
  };
  assert.equal(simple('Am7'), 'Am');
  assert.equal(simple('Cmaj7'), 'C');
  assert.equal(simple('B7'), 'B7');
  assert.equal(simple('Fmaj7'), 'Fmaj7');
  assert.equal(simple('Gsus4'), 'G');
  assert.equal(simple('Dadd9'), 'D');
  assert.equal(simple('E7'), 'E');
  assert.equal(simple('C/G'), 'C');
});

const TAGHDIR = `      Ab                       Bb           Cm
باید تو رو پیدا کنم شاید هنوزم دیر نیست

Gm           Eb             Fm
تو ساده دل کندی ولی تقدیر بی تقصیر نیست

Gm Cm Gm Cm
کی با یه جمله مثل من می تونه آرومت کنه`;

test('parseSheet finds chord lines and keeps the text intact', () => {
  const parsed = sheet.parseSheet(TAGHDIR);
  assert.deepEqual(parsed.lines.map((l) => l.kind), ['chords', 'text', 'blank', 'chords', 'text', 'blank', 'chords', 'text']);
  assert.deepEqual(parsed.chords.map((c) => c.text), ['Ab', 'Bb', 'Cm', 'Gm', 'Eb', 'Fm', 'Gm', 'Cm', 'Gm', 'Cm']);
  for (const line of parsed.lines.filter((l) => l.kind === 'chords')) {
    assert.equal(line.segments.map((s) => s.text).join(''), line.text);
  }
});

test('parseSheet detects the reading direction of the lyrics', () => {
  assert.equal(sheet.parseSheet(TAGHDIR).rtl, true);
  assert.equal(sheet.parseSheet('Am      G\nHello from the other side\nC   F\nI must have called').rtl, false);
});

test('parseSheet handles labels, repeat marks and punctuation', () => {
  const line = (text) => sheet.parseChordLine(text);
  const chordsOf = (segments) => segments.filter((s) => s.chord).map((s) => s.text);
  assert.deepEqual(chordsOf(line('Intro: Am  G  F  (x2)')), ['Am', 'G', 'F']);
  assert.deepEqual(chordsOf(line('مقدمه: Am G')), ['Am', 'G']);
  assert.deepEqual(chordsOf(line('| Am | Dm | E7 |')), ['Am', 'Dm', 'E7']);
  assert.deepEqual(chordsOf(line('(Am)  C,')), ['Am', 'C']);
  assert.equal(line('A day in the life'), null);
  assert.equal(line('Hello from the other side'), null);
  const segments = line('(Am)  C,');
  assert.equal(segments.map((s) => s.text).join(''), '(Am)  C,');
});

test('marks next to a chord stay outside it', () => {
  const marked = (line) =>
    sheet
      .parseChordLine(line, { force: true })
      .map((s) => (s.chord ? `[${s.text}]` : s.text))
      .join('');
  assert.equal(marked('Am_  C+  Em-  D/  G*'), '[Am]_  [C+]  [Em]-  [D]/  [G]*');
  assert.equal(marked('(Am)  Am)_  C(add9)  Bb/D  C13'), '([Am])  [Am])_  [C(add9)]  [Bb/D]  [C13]');
  assert.equal(sheet.parseChordLine('C(add9)', { force: true })[0].chord.quality, 'add9');
});

test('parseLines trusts the site and still finds chords in text lines', () => {
  const parsed = sheet.parseLines([
    { text: 'Am  x2  hello', kind: 'chords' }, // the site shows it as chords: one chord is enough
    { text: 'باید تو رو پیدا کنم', kind: 'text' },
    { text: '​', kind: 'text' }, // a lyric line made only of beat marks
    { text: 'Dm   G   C', kind: 'text' }, // chords the site shows as plain text
    { text: 'Hello Dolly', kind: 'text' },
    { text: '', kind: null },
  ]);
  assert.deepEqual(parsed.lines.map((l) => l.kind), ['chords', 'text', 'blank', 'chords', 'text', 'blank']);
  assert.deepEqual(parsed.chords.map((c) => c.text), ['Am', 'Dm', 'G', 'C']);
  assert.equal(parsed.rtl, true);
  assert.equal(sheet.parseChordLine('Am  x2  hello world'), null);
});

test('best capo turns a flat minor song into open shapes', () => {
  const parsed = sheet.parseSheet(TAGHDIR);
  const settings = { key: music.parseKey('Cm'), transpose: 0, capo: 0, simplify: false, notation: 'auto' };
  const best = arrange.bestCapo(sheet.countChords(parsed.chords), settings);
  assert.equal(best.capo, 3);
  const shown = parsed.chords.map((c) => arrange.displayChord(c, { ...settings, capo: best.capo }).name);
  assert.deepEqual(shown.slice(0, 6), ['F', 'G', 'Am', 'Em', 'C', 'Dm']);
});

test('best capo is 0 for a song that is already easy', () => {
  const chords = ['Am', 'G', 'C', 'F', 'Em', 'Dm'].map((t) => ({ chord: music.parseChord(t), count: 2 }));
  const best = arrange.bestCapo(chords, { key: music.parseKey('Am'), transpose: 0, capo: 0, simplify: false, notation: 'auto' });
  assert.equal(best.capo, 0);
});

test('displayChord follows the key of the shapes', () => {
  const chord = music.parseChord('Bb');
  const base = { key: music.parseKey('Cm'), transpose: 0, capo: 0, simplify: false, notation: 'auto' };
  assert.equal(arrange.displayChord(chord, base).name, 'Bb');
  assert.equal(arrange.displayChord(chord, { ...base, transpose: 2 }).name, 'C');
  assert.equal(arrange.displayChord(chord, { ...base, transpose: 1 }).name, 'B'); // C#m: sharps
  assert.equal(arrange.displayChord(music.parseChord('Ab'), { ...base, transpose: 1 }).name, 'A');
  assert.equal(arrange.displayChord(music.parseChord('Gm'), { ...base, transpose: 1 }).name, 'G#m');
  assert.equal(arrange.displayChord(music.parseChord('Gm'), { ...base, transpose: 1, notation: 'flat' }).name, 'Abm');
  assert.equal(arrange.shapeKey({ ...base, transpose: 0, capo: 3 }).root, 9);
});
