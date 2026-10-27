/*
 * Laminor Pro — print / save as PDF.
 * Builds a clean copy of the sheet (with the current key, capo and chord
 * diagrams) and prints only that; "Save as PDF" in the print dialog gives a
 * PDF file.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { h } = LP.dom;
  const { renderDiagram } = LP.diagram;

  /**
   * data: { title, artist, meta: [string], sheet: <pre>, chords: [{ name, voicing, approx }] | null, leftHanded, rtl }
   */
  function buildPrintRoot(data) {
    const sheet = data.sheet.cloneNode(true);
    sheet.removeAttribute('id');
    return h(
      'div',
      { class: 'lp-print-root', dir: 'rtl' },
      h('h1', { class: 'lp-print-title' }, data.title),
      data.artist ? h('div', { class: 'lp-print-artist' }, data.artist) : null,
      h('div', { class: 'lp-print-meta' }, data.meta.filter(Boolean).join('  ·  ')),
      data.chords && data.chords.length
        ? h(
            'div',
            { class: 'lp-print-diagrams' + (data.rtl ? ' lp-rtl' : '') },
            data.chords.map((c) => renderDiagram({ name: c.name, voicing: c.voicing, approx: c.approx, leftHanded: data.leftHanded }))
          )
        : null,
      sheet,
      h('div', { class: 'lp-print-footer' }, `${location.hostname} — Laminor Pro`)
    );
  }

  function printSheet(data) {
    const html = document.documentElement;
    const printRoot = buildPrintRoot(data);
    const previousTitle = document.title;
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', cleanup);
      html.classList.remove('lp-printing');
      printRoot.remove();
      document.title = previousTitle;
    };

    document.body.append(printRoot);
    html.classList.add('lp-printing');
    // The page title becomes the default PDF file name.
    document.title = [data.title, data.artist].filter(Boolean).join(' - ');
    window.addEventListener('afterprint', cleanup);
    window.print();
  }

  LP.print = { buildPrintRoot, printSheet };
})(typeof globalThis !== 'undefined' ? globalThis : this);
