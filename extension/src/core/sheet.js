/*
 * Laminor Pro — chord sheet parser.
 * Splits the text of a chord sheet into lines and finds the chord symbols in
 * chord lines, keeping every other character (spacing included) untouched so
 * the sheet can be rebuilt exactly.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { parseChord } = LP.music;

  const LEAD_PUNCT = /^[(\[{|]+/;
  const TRAIL_PUNCT = /[)\]}|,.:;!*]+$/;
  const PERSIAN = /[؀-ۿﭐ-﷿ﹰ-﻿]/;
  const NEUTRAL_TOKENS = [
    /^[|/\\\-–—_.:,;*~%()[\]{}>]+$/,
    /^[(\[]?([x×*]\s?\d+|\d+\s?[x×])[)\]]?:?$/i,
    /^\(?(intro|verse|chorus|bridge|outro|solo|interlude|pre-?chorus|riff|coda|tag|instrumental|ending|end|n\.?c\.?)\d*\)?:?$/i,
    /^(مقدمه|اینترو|ورس|کورس|کر|بند|ترجیع‌?بند|پایان|بین‌?ساز|تکرار|آکورد|ریتم|سولو)[\d۰-۹]*:?$/,
  ];

  function isNeutral(token) {
    return NEUTRAL_TOKENS.some((re) => re.test(token));
  }

  function splitToken(token) {
    const lead = (LEAD_PUNCT.exec(token) || [''])[0];
    const rest = token.slice(lead.length);
    const trail = (TRAIL_PUNCT.exec(rest) || [''])[0];
    return { lead, core: rest.slice(0, rest.length - trail.length), trail };
  }

  /**
   * Returns the segments of a chord line, or null if the line is lyrics.
   * A line counts as a chord line when chord symbols outnumber the other
   * words (section labels and repeat marks like "x2" are ignored).
   */
  function parseChordLine(line) {
    const tokens = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(line))) tokens.push({ text: m[0], index: m.index });
    if (!tokens.length) return null;

    let chordCount = 0;
    let otherCount = 0;
    for (const t of tokens) {
      const parts = splitToken(t.text);
      t.parts = parts;
      t.chord = !PERSIAN.test(parts.core) ? parseChord(parts.core) : null;
      if (t.chord) chordCount++;
      else if (!isNeutral(t.text)) otherCount++;
    }
    if (chordCount === 0 || chordCount <= otherCount) return null;

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
      if (t.chord) {
        pushText(t.parts.lead);
        segments.push({ text: t.parts.core, chord: t.chord });
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
   * Parses a whole sheet.
   * Returns { lines: [{ kind: 'chords' | 'text' | 'blank', text, segments }],
   *           chords: [parsed chord per occurrence, in order],
   *           rtl: lyrics are mostly Persian, so each chord line is read right to left }
   */
  function parseSheet(text) {
    const lines = [];
    const chords = [];
    let persianLines = 0;
    let latinLines = 0;
    for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
      if (!raw.trim()) {
        lines.push({ kind: 'blank', text: raw });
        continue;
      }
      const segments = PERSIAN.test(raw) && !/[A-G]/.test(raw) ? null : parseChordLine(raw);
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

  LP.sheet = { parseSheet, parseChordLine, countChords };

  if (typeof module !== 'undefined' && module.exports) module.exports = LP.sheet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
