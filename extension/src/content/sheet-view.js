/*
 * Laminor Pro — renders the interactive copy of the chord sheet.
 * The copy is a deep clone of the site's sheet, so every wrapper, class and
 * lyric marker looks exactly like the original; only the chord lines are
 * rebuilt. Every chord sits in a "slot" that keeps the width of the original
 * chord (an invisible copy of its text) with the displayed name on top of
 * it, so changing a chord never moves the other chords or the lyrics.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { h } = LP.dom;
  const { site } = LP;

  /**
   * Builds the copy of `original` for `model` (from LP.sheet.parseLines over
   * site.lineElements(original)). Returns { sheet, slots } where slots[i].chord
   * is the parsed chord and slots[i].name the element showing its name.
   */
  function buildSheet(model, original) {
    const copy = original.cloneNode(true);
    copy.removeAttribute('id');
    copy.removeAttribute('data-lp-original');
    copy.setAttribute('data-lp-sheet', '');
    copy.classList.add('lp-sheet');
    copy.classList.toggle('lp-ltr', !model.rtl);

    const template = site.chordTemplate(original);
    const chordClass = template ? template.getAttribute('class') || '' : 'lp-c-plain';
    const lineEls = site.lineElements(copy);
    const slots = [];

    model.lines.forEach((line, index) => {
      const lineEl = lineEls[index];
      if (line.kind !== 'chords' || !lineEl) return;
      const parts = line.segments.map((segment) => {
        if (!segment.chord) return document.createTextNode(segment.text);
        const name = h('span', { class: 'lp-c-name' }, segment.text);
        const slot = h(
          'span',
          { class: `${chordClass} lp-c`, dir: 'ltr', dataset: { i: String(slots.length) } },
          h('span', { class: 'lp-c-in' }, h('span', { class: 'lp-c-ghost', 'aria-hidden': 'true' }, segment.text), name)
        );
        slots.push({ chord: segment.chord, slot, name, line: index });
        return slot;
      });
      lineEl.replaceChildren(...parts);
    });
    return { sheet: copy, slots };
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
