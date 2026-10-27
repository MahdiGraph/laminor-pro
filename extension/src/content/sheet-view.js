/*
 * Laminor Pro — renders the parsed chord sheet.
 * Every chord sits in a "slot" that keeps the width of the original chord
 * (an invisible copy of the original text), and the displayed name is
 * anchored to the slot's right edge. Changing a chord name therefore never
 * moves the other chords or breaks their alignment with the lyrics.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { h } = LP.dom;

  // Typography that decides how chords line up with the lyrics. The site's
  // class names are deliberately not copied: its own scripts bind to them.
  const COPIED_STYLES = [
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'word-spacing',
    'text-align', 'direction', 'unicode-bidi', 'white-space', 'tab-size', 'color', 'background-color',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom',
    'border-top-width', 'border-bottom-width', 'user-select', '-webkit-user-select',
  ];

  function copyTypography(from, to) {
    const style = getComputedStyle(from);
    for (const prop of COPIED_STYLES) to.style.setProperty(prop, style.getPropertyValue(prop));
    to.style.setProperty('height', 'auto');
    to.style.setProperty('max-height', 'none');
    to.style.setProperty('overflow', 'visible');
  }

  const box = (style, prop) =>
    ['top', 'right', 'bottom', 'left'].map((side) => style.getPropertyValue(`${prop}-${side}`)).join(' ');

  // The site wraps chords in padded inline-blocks and lyric lines in
  // inline-blocks with a bottom margin; mirror whatever metrics it uses.
  function copySpanMetrics(original, pre) {
    const chord = original.querySelector('.c');
    if (chord) {
      const style = getComputedStyle(chord);
      pre.style.setProperty('--lp-chord-color', style.color);
      pre.style.setProperty('--lp-chord-weight', style.fontWeight);
      pre.style.setProperty('--lp-c-padding', box(style, 'padding'));
      pre.style.setProperty('--lp-c-margin', box(style, 'margin'));
      pre.style.setProperty('--lp-c-pt', style.paddingTop);
      pre.style.setProperty('--lp-c-pr', style.paddingRight);
    }
    const text = original.querySelector('.chord-text');
    if (text) {
      const style = getComputedStyle(text);
      pre.style.setProperty('--lp-text-display', style.display);
      pre.style.setProperty('--lp-text-margin', box(style, 'margin'));
    }
  }

  /**
   * Builds a <pre> for `model` (from LP.sheet.parseSheet) styled like the
   * site's own sheet. Returns { pre, slots } where slots[i].chord is the
   * parsed chord and slots[i].name is the element holding its shown name.
   */
  function buildSheet(model, original) {
    const pre = h('pre', { class: 'lp-sheet', dir: original.getAttribute('dir') });
    copyTypography(original, pre);
    copySpanMetrics(original, pre);

    const slots = [];
    model.lines.forEach((line, index) => {
      if (index > 0) pre.append('\n');
      if (line.kind === 'blank') {
        pre.append(line.text);
      } else if (line.kind === 'text') {
        pre.append(h('span', { class: 'lp-text' }, line.text));
      } else {
        const lineEl = h('span', { class: 'lp-chords' });
        for (const segment of line.segments) {
          if (!segment.chord) {
            lineEl.append(segment.text);
            continue;
          }
          const name = h('span', { class: 'lp-c-name' }, segment.text);
          const slot = h(
            'span',
            { class: 'lp-c', dataset: { i: String(slots.length) } },
            h('span', { class: 'lp-c-ghost', 'aria-hidden': 'true' }, segment.text),
            name
          );
          slots.push({ chord: segment.chord, slot, name, line: index });
          lineEl.append(slot);
        }
        pre.append(lineEl);
      }
    });
    return { pre, slots };
  }

  /**
   * Slot indexes in the order a player meets them. In a right-aligned sheet
   * of Persian lyrics the rightmost chord of a line comes first.
   */
  function readingOrder(slots, rtl) {
    const order = [];
    let line = [];
    const flush = () => {
      order.push(...(rtl ? line.reverse() : line));
      line = [];
    };
    slots.forEach((s, i) => {
      if (i > 0 && s.line !== slots[i - 1].line) flush();
      line.push(i);
    });
    flush();
    return order;
  }

  /** Writes the displayed names; `shown[i]` matches `slots[i]`. */
  function updateSheet(slots, shown) {
    slots.forEach((s, i) => {
      const text = shown[i].name;
      if (s.name.textContent !== text) s.name.textContent = text;
      s.slot.classList.toggle('lp-c-changed', text !== s.chord.text);
    });
  }

  LP.sheetView = { buildSheet, updateSheet, readingOrder };
})(typeof globalThis !== 'undefined' ? globalThis : this);
