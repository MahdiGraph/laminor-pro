/*
 * Laminor Pro — turns the original chords into what the player should see,
 * given the chosen key, capo and options, and finds the easiest capo fret.
 *
 * settings = {
 *   key:       { root, minor }   original key of the song
 *   transpose: semitones          sounding key relative to the original
 *   capo:      fret               chord shapes are played relative to the capo
 *   simplify:  boolean            reduce chords to easy triads / sevenths
 *   notation:  'auto' | 'sharp' | 'flat'
 * }
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { mod12, keyPrefersFlat, renderChordName } = LP.music;
  const { difficulty, simplestQuality } = LP.voicings;

  const MAX_AUTO_CAPO = 7;

  function soundingKey(settings) {
    return { root: mod12(settings.key.root + settings.transpose), minor: settings.key.minor };
  }

  /** Key of the chord shapes the player actually fingers (after the capo). */
  function shapeKey(settings) {
    return { root: mod12(settings.key.root + settings.transpose - settings.capo), minor: settings.key.minor };
  }

  function spelling(settings) {
    if (settings.notation === 'sharp') return { preferFlat: false, respell: true };
    if (settings.notation === 'flat') return { preferFlat: true, respell: true };
    const key = shapeKey(settings);
    return { preferFlat: keyPrefersFlat(key.root, key.minor), respell: false };
  }

  /** What to display for one parsed chord: its name and its shape. */
  function displayChord(chord, settings) {
    const shift = settings.transpose - settings.capo;
    const rootPc = mod12(chord.root + shift);
    const quality = settings.simplify ? simplestQuality(rootPc, chord.quality) : null;
    const { preferFlat, respell } = spelling(settings);
    return {
      name: renderChordName(chord, { shift, preferFlat, respell, quality }),
      root: rootPc,
      quality: quality || chord.quality,
      bass: quality || chord.bass == null ? null : mod12(chord.bass + shift),
      approx: quality ? false : chord.approx,
    };
  }

  function chordDifficulty(chord, settings) {
    const shown = displayChord(chord, settings);
    return difficulty(shown.root, shown.quality, shown.bass);
  }

  /**
   * Scores every capo fret from 0 to MAX_AUTO_CAPO by the average difficulty
   * of the shapes it produces (weighted by how often each chord is played)
   * and returns the easiest one. Lower frets win ties.
   *   chords: [{ chord, count }]
   */
  function bestCapo(chords, settings) {
    let best = null;
    const scores = [];
    for (let capo = 0; capo <= MAX_AUTO_CAPO; capo++) {
      const s = { ...settings, capo };
      let total = 0;
      let count = 0;
      for (const item of chords) {
        total += chordDifficulty(item.chord, s) * item.count;
        count += item.count;
      }
      const average = count ? total / count : 0;
      const score = average + capo * 0.04;
      scores.push({ capo, average, score });
      if (!best || score < best.score - 1e-9) best = { capo, average, score };
    }
    return { ...best, scores };
  }

  LP.arrange = { MAX_AUTO_CAPO, soundingKey, shapeKey, displayChord, chordDifficulty, bestCapo };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP.arrange;
})(typeof globalThis !== 'undefined' ? globalThis : this);
