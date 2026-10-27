/*
 * Laminor Pro — music theory helpers.
 * Chord parsing, transposition and enharmonic spelling. No DOM access here,
 * so the same file runs in the content script and in the Node unit tests.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Keys whose signature is written with flats. C major / A minor have no
  // accidentals; flats win there because borrowed chords like Bb, Eb and Ab
  // are far more common in Persian pop than A#, D# and G#.
  const FLAT_MAJOR_KEYS = new Set([0, 1, 3, 5, 8, 10]);
  const FLAT_MINOR_KEYS = new Set([0, 2, 5, 7, 9, 10]);

  const MINOR_QUALITIES = new Set(['m', 'm7', 'm6', 'm9', 'madd9', 'mmaj7']);

  // Chord tones (semitones above the root) of every quality we understand.
  const QUALITY_INTERVALS = {
    maj: [0, 4, 7],
    m: [0, 3, 7],
    '7': [0, 4, 7, 10],
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    '6': [0, 4, 7, 9],
    m6: [0, 3, 7, 9],
    '9': [0, 4, 7, 10, 2],
    m9: [0, 3, 7, 10, 2],
    maj9: [0, 4, 7, 11, 2],
    add9: [0, 4, 7, 2],
    madd9: [0, 3, 7, 2],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    '7sus4': [0, 5, 7, 10],
    dim: [0, 3, 6],
    dim7: [0, 3, 6, 9],
    m7b5: [0, 3, 6, 10],
    aug: [0, 4, 8],
    '5': [0, 7],
    mmaj7: [0, 3, 7, 11],
  };

  // How each quality is written when we build a chord name ourselves.
  const QUALITY_SUFFIX = {
    maj: '',
    m: 'm',
    '7': '7',
    m7: 'm7',
    maj7: 'maj7',
    '6': '6',
    m6: 'm6',
    '9': '9',
    m9: 'm9',
    maj9: 'maj9',
    add9: 'add9',
    madd9: 'madd9',
    sus2: 'sus2',
    sus4: 'sus4',
    '7sus4': '7sus4',
    dim: 'dim',
    dim7: 'dim7',
    m7b5: 'm7b5',
    aug: 'aug',
    '5': '5',
    mmaj7: 'mMaj7',
  };

  const SUFFIX_TOKENS = [
    'maj', 'Maj', 'MAJ', 'min', 'dim', 'aug', 'sus', 'add', 'omit', 'alt', 'dom',
    'no', 'ma', 'mi', 'M', 'm', 'Δ', '°', 'ø', '+', '-', '#', 'b', '♯', '♭', '(', ')', ',',
  ];

  const ROOT_RE = /^([A-G])([#b♯♭]?)(.*)$/;
  const NOTE_RE = /^([A-G])([#b♯♭]?)$/;

  const mod12 = (n) => ((n % 12) + 12) % 12;

  function noteToPc(letter, accidental) {
    let pc = LETTER_PC[letter];
    if (accidental === '#' || accidental === '♯') pc += 1;
    else if (accidental === 'b' || accidental === '♭') pc -= 1;
    return mod12(pc);
  }

  function noteName(pc, preferFlat) {
    return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
  }

  function isValidSuffix(suffix) {
    if (suffix.length > 14) return false;
    let i = 0;
    while (i < suffix.length) {
      const digits = /^\d{1,2}/.exec(suffix.slice(i));
      if (digits) {
        i += digits[0].length;
        continue;
      }
      // "6/9" style suffixes; a slash followed by a note name is a bass note
      // and has already been split off by parseChord.
      if (suffix[i] === '/' && /\d/.test(suffix[i + 1] || '')) {
        i += 1;
        continue;
      }
      const token = SUFFIX_TOKENS.find((t) => suffix.startsWith(t, i));
      if (!token) return false;
      i += token.length;
    }
    return true;
  }

  /**
   * Maps a written suffix ("m7", "maj7", "sus", "7b9", ...) to one of the
   * qualities in QUALITY_INTERVALS. `approx` is true when the suffix has
   * extensions we can only approximate (e.g. "13" is drawn as a 7 chord).
   */
  function classifySuffix(suffix) {
    const s = suffix.replace(/[()\s,]/g, '').replace(/♯/g, '#').replace(/♭/g, 'b');
    const exact = (quality) => ({ quality, approx: false });
    const approx = (quality) => ({ quality, approx: true });

    if (s === '' || s === 'M' || /^(maj|Maj|MAJ|major)$/.test(s)) return exact('maj');
    if (s === '5') return exact('5');
    if (/^(ø7?|m7b5|min7b5|-7b5|mi7b5)$/.test(s)) return exact('m7b5');
    if (/^(°|dim)7$/.test(s)) return exact('dim7');
    if (/^(°|dim)$/.test(s)) return exact('dim');
    if (/^(\+|aug|\+5|#5|aug5)$/.test(s)) return exact('aug');

    const minorPrefix = /^(min|mi|m(?!aj|a)|-)/.exec(s);
    let rest = minorPrefix ? s.slice(minorPrefix[0].length) : s;
    const majorSeventh = /^(Maj|MAJ|maj|ma|M|Δ)/.exec(rest);
    if (majorSeventh) rest = rest.slice(majorSeventh[0].length);

    if (minorPrefix) {
      if (majorSeventh) return rest === '' || rest === '7' ? exact('mmaj7') : approx('mmaj7');
      if (rest === '') return exact('m');
      if (rest === '7') return exact('m7');
      if (rest === '6' || rest === '6/9' || rest === '69') return exact('m6');
      if (rest === '9') return exact('m9');
      if (/^(add9|add2|2)$/.test(rest)) return exact('madd9');
      if (rest === '7b5') return exact('m7b5');
      if (/^(11|13|7.+|9.+)$/.test(rest)) return approx('m7');
      return approx('m');
    }
    if (majorSeventh) {
      if (rest === '' || rest === '7') return exact('maj7');
      if (rest === '9') return exact('maj9');
      return approx('maj7');
    }
    if (/^(7|dom7?)$/.test(rest)) return exact('7');
    if (rest === '6' || rest === '6/9' || rest === '69') return exact('6');
    if (rest === '9') return exact('9');
    if (/^(add9|add2|2)$/.test(rest)) return exact('add9');
    if (rest === 'sus2') return exact('sus2');
    if (/^sus4?$/.test(rest)) return exact('sus4');
    if (/^7sus4?$/.test(rest)) return exact('7sus4');
    if (/^9sus4?$/.test(rest)) return approx('7sus4');
    if (/^(11|13|7.+|9.+)$/.test(rest)) return approx('7');
    if (/^(aug|\+)/.test(rest)) return approx('aug');
    if (/^(dim|°)/.test(rest)) return approx('dim');
    if (/^sus/.test(rest)) return approx('sus4');
    return approx('maj');
  }

  /**
   * Parses a single chord symbol such as "C#m7", "Bb/D" or "Asus4".
   * Returns null when the text is not a chord.
   */
  function parseChord(text) {
    if (!text || text.length > 16) return null;
    let main = text;
    let bass = null;
    let bassText = null;
    const slash = text.lastIndexOf('/');
    if (slash > 0) {
      const m = NOTE_RE.exec(text.slice(slash + 1));
      if (m) {
        bass = noteToPc(m[1], m[2]);
        bassText = text.slice(slash + 1);
        main = text.slice(0, slash);
      }
    }
    const m = ROOT_RE.exec(main);
    if (!m || !isValidSuffix(m[3])) return null;
    const { quality, approx } = classifySuffix(m[3]);
    return {
      text,
      root: noteToPc(m[1], m[2]),
      rootText: m[1] + m[2],
      suffix: m[3],
      bass,
      bassText,
      quality,
      approx,
    };
  }

  function keyPrefersFlat(rootPc, minor) {
    return (minor ? FLAT_MINOR_KEYS : FLAT_MAJOR_KEYS).has(mod12(rootPc));
  }

  /** Parses a key such as "Cm" or "F#" into { root, minor }. */
  function parseKey(text) {
    const chord = parseChord(String(text || '').trim());
    if (!chord) return null;
    return { root: chord.root, minor: MINOR_QUALITIES.has(chord.quality) };
  }

  function keyName(key, notation) {
    let preferFlat = keyPrefersFlat(key.root, key.minor);
    if (notation === 'sharp') preferFlat = false;
    else if (notation === 'flat') preferFlat = true;
    return noteName(key.root, preferFlat) + (key.minor ? 'm' : '');
  }

  /**
   * Builds the displayed name of `chord` moved by `shift` semitones.
   * When nothing changes the original spelling is kept untouched.
   *   preferFlat — spell accidentals with flats
   *   respell    — rebuild the name even when shift is 0 (forced notation)
   *   quality    — replace the suffix by this quality and drop the bass
   */
  function renderChordName(chord, { shift = 0, preferFlat = false, respell = false, quality = null } = {}) {
    const s = mod12(shift);
    const keep = s === 0 && !respell;
    if (keep && !quality) return chord.text;
    const rootName = keep ? chord.rootText : noteName(chord.root + s, preferFlat);
    if (quality) return rootName + QUALITY_SUFFIX[quality];
    const bass = chord.bass == null ? '' : '/' + (keep ? chord.bassText : noteName(chord.bass + s, preferFlat));
    return rootName + chord.suffix + bass;
  }

  /** Smallest equivalent shift, in the range -5..+6. */
  function normalizeShift(n) {
    const s = mod12(n);
    return s > 6 ? s - 12 : s;
  }

  LP.music = {
    SHARP_NAMES,
    FLAT_NAMES,
    QUALITY_INTERVALS,
    QUALITY_SUFFIX,
    MINOR_QUALITIES,
    mod12,
    noteName,
    noteToPc,
    parseChord,
    parseKey,
    keyName,
    keyPrefersFlat,
    renderChordName,
    normalizeShift,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP.music;
})(typeof globalThis !== 'undefined' ? globalThis : this);
