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
    sheet.removeAttribute('style');
    return h(
      'div',
      { class: 'lp-print-root', dir: 'rtl', 'data-lp-owned': '' },
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
    // A print that never reported back (no afterprint) leaves its copy behind.
    for (const old of document.querySelectorAll('.lp-print-root')) old.remove();
    const printRoot = buildPrintRoot(data);
    const previousTitle = document.title;
    let done = false;

    const INTERACTIONS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', cleanup);
      for (const type of INTERACTIONS) window.removeEventListener(type, cleanup, true);
      html.removeAttribute('data-lp-printing');
      printRoot.remove();
      document.title = previousTitle;
    };

    document.body.append(printRoot);
    html.setAttribute('data-lp-printing', '');
    // The page title becomes the default PDF file name.
    document.title = [data.title, data.artist].filter(Boolean).join(' - ');
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Browsers that don't report the end of printing: tidy up on the next
    // interaction with the page, which the (modal) print dialog rules out
    // while it is open.
    if (!done) for (const type of INTERACTIONS) window.addEventListener(type, cleanup, true);
  }

  LP.print = { buildPrintRoot, printSheet };
})(typeof globalThis !== 'undefined' ? globalThis : this);
