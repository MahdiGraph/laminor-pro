/*
 * Laminor Pro — chord sheet parser.
 * Finds the chord symbols in the chord lines of a sheet, keeping every other
 * character (spacing included) untouched so each line can be rebuilt exactly.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { parseChord } = LP.music;

  const LEAD_PUNCT = /^[(\[{|]+/;
  // Marks that may follow a chord: "Am)", "C|", "G*", "Em_", "D/" …
  const TRAIL_MARKS = /^[)\]}|,.:;!*&%_\-+/(]+$/;
  // How a chord name can end; ")" only closes a "(" of the chord itself.
  const CHORD_END = /[A-Za-z0-9#♯♭+°øΔ]$/;
  const PERSIAN = /[؀-ۿﭐ-﷿ﹰ-﻿]/;
  const INVISIBLE = /[​-‏⁠﻿]/g;
  const NEUTRAL_TOKENS = [
    /^[|/\\\-–—_.:,;*~%()[\]{}>]+$/,
    /^[(\[]?([x×*]\s?\d+|\d+\s?[x×])[)\]]?:?$/i,
    /^\(?(intro|verse|chorus|bridge|outro|solo|interlude|pre-?chorus|riff|coda|tag|instrumental|ending|end|n\.?c\.?)\d*\)?:?$/i,
    /^(مقدمه|اینترو|ورس|کورس|کر|بند|ترجیع‌?بند|پایان|بین‌?ساز|تکرار|آکورد|ریتم|سولو)[\d۰-۹]*:?$/,
  ];

  function isNeutral(token) {
    return NEUTRAL_TOKENS.some((re) => re.test(token));
  }

  function chordOf(text) {
    return text && !PERSIAN.test(text) ? parseChord(text) : null;
  }

  /**
   * Splits a token into leading punctuation, the chord and trailing marks:
   * "(Am)" → "(" Am ")". The longest exact chord wins, so "C+" stays an
   * augmented chord and "C(add9)" keeps its brackets, while "Am-" is Am
   * followed by a mark.
   */
  function splitToken(token) {
    const lead = (LEAD_PUNCT.exec(token) || [''])[0];
    const rest = token.slice(lead.length);
    let fallback = null;
    for (let end = rest.length; end > 0; end--) {
      const trail = rest.slice(end);
      if (trail && !TRAIL_MARKS.test(trail)) break;
      const core = rest.slice(0, end);
      if (!CHORD_END.test(core) && !(core.endsWith(')') && core.includes('('))) continue;
      const chord = chordOf(core);
      if (!chord) continue;
      if (!chord.approx) return { lead, core, trail, chord };
      if (!fallback) fallback = { lead, core, trail, chord };
    }
    return fallback || { lead, core: rest, trail: '', chord: null };
  }

  /**
   * Returns the segments of a chord line, or null if the line is lyrics.
   * A line counts as a chord line when chord symbols outnumber the other
   * words (section labels and repeat marks like "x2" are ignored). With
   * `force` (the site itself marks the line as chords) one chord is enough.
   */
  function parseChordLine(line, { force = false } = {}) {
    const tokens = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(line))) tokens.push({ text: m[0], index: m.index });
    if (!tokens.length) return null;

    let chordCount = 0;
    let otherCount = 0;
    for (const t of tokens) {
      t.parts = splitToken(t.text);
      if (t.parts.chord) chordCount++;
      else if (!isNeutral(t.text)) otherCount++;
    }
    if (chordCount === 0 || (!force && chordCount <= otherCount)) return null;

    const segments = [];
    let pos = 0;
    const pushText = (text) => {
      if (!text) return;
      const last = segments[segments.length - 1];
      if (last && last.chord == null) last.text += text;
      else segments.push({ text });
    };
    for (const t of tokens) {
      pushText(line.slice(pos, t.index));
      if (t.parts.chord) {
        pushText(t.parts.lead);
        segments.push({ text: t.parts.core, chord: t.parts.chord });
        pushText(t.parts.trail);
      } else {
        pushText(t.text);
      }
      pos = t.index + t.text.length;
    }
    pushText(line.slice(pos));
    return segments;
  }

  /**
   * Parses the lines of a sheet. Each item is a string or { text, kind } where
   * kind is the site's own reading of the line ('chords', 'text' or null).
   * Lines the site shows as chords are trusted; the others still go through
   * the chord-line check, so chords written inside a text line move too.
   * Returns { lines: [{ kind: 'chords' | 'text' | 'blank', text, segments }],
   *           chords: [parsed chord per occurrence, in order],
   *           rtl: lyrics are mostly Persian, so each chord line is read right to left }
   */
  function parseLines(input) {
    const lines = [];
    const chords = [];
    let persianLines = 0;
    let latinLines = 0;
    for (const item of input) {
      const raw = typeof item === 'string' ? item : String(item.text);
      const kind = typeof item === 'string' ? null : item.kind;
      if (!raw.replace(INVISIBLE, '').trim()) {
        lines.push({ kind: 'blank', text: raw });
        continue;
      }
      let segments = null;
      if (kind === 'chords') segments = parseChordLine(raw, { force: true });
      else if (!PERSIAN.test(raw) || /[A-G]/.test(raw)) segments = parseChordLine(raw);
      if (segments) {
        lines.push({ kind: 'chords', text: raw, segments });
        for (const s of segments) if (s.chord) chords.push(s.chord);
      } else {
        lines.push({ kind: 'text', text: raw });
        if (PERSIAN.test(raw)) persianLines++;
        else if (/[A-Za-z]/.test(raw)) latinLines++;
      }
    }
    return { lines, chords, rtl: persianLines >= latinLines };
  }

  /** Parses a whole sheet given as plain text. */
  function parseSheet(text) {
    return parseLines(String(text).replace(/\r\n?/g, '\n').split('\n'));
  }

  /** Chord occurrences grouped by symbol: [{ chord, count }]. */
  function countChords(chords) {
    const byText = new Map();
    for (const chord of chords) {
      const entry = byText.get(chord.text);
      if (entry) entry.count++;
      else byText.set(chord.text, { chord, count: 1 });
    }
    return [...byText.values()];
  }

  LP.sheet = { parseSheet, parseLines, parseChordLine, countChords };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP.sheet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
