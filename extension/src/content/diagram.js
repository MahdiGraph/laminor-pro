/* Laminor Pro — SVG chord diagrams (fingering guide). */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { svg } = LP.dom;

  const X0 = 24; // x of the low-E string
  const SX = 14; // string spacing
  const Y0 = 38; // y of the nut / top fret line
  const SY = 18; // fret spacing
  const WIDTH = 108;

  /**
   * Draws one chord shape.
   *   name       chord name shown on top
   *   voicing    shape from LP.voicings (null draws an empty "?" box)
   *   approx     the shape is the closest match, not the exact chord
   *   leftHanded mirror the diagram
   */
  function renderDiagram({ name, voicing, approx = false, leftHanded = false }) {
    const title = (approx ? '≈ ' : '') + name;
    if (!voicing) {
      return svg(
        'svg',
        { class: 'lp-dg', viewBox: `0 0 ${WIDTH} 70`, width: WIDTH, height: 70, role: 'img', 'aria-label': name },
        svg('text', { x: WIDTH / 2, y: 18, class: 'lp-dg-title', 'text-anchor': 'middle' }, title),
        svg('text', { x: WIDTH / 2, y: 50, class: 'lp-dg-missing', 'text-anchor': 'middle' }, '?')
      );
    }

    const { frets, fingers, baseFret, barre } = voicing;
    const fretted = frets.filter((f) => f > 0);
    const span = fretted.length ? Math.max(...fretted) - baseFret + 1 : 1;
    const rows = Math.max(4, span);
    const height = Y0 + rows * SY + 10;
    const xs = (s) => X0 + (leftHanded ? 5 - s : s) * SX;
    const cy = (fret) => Y0 + (fret - baseFret + 0.5) * SY;
    const parts = [];

    parts.push(svg('title', null, name));
    parts.push(svg('text', { x: X0 + 2.5 * SX, y: 17, class: 'lp-dg-title', 'text-anchor': 'middle' }, title));

    // Strings and frets.
    for (let s = 0; s < 6; s++) {
      parts.push(svg('line', { x1: xs(s), y1: Y0, x2: xs(s), y2: Y0 + rows * SY, class: 'lp-dg-string' }));
    }
    for (let i = 0; i <= rows; i++) {
      parts.push(svg('line', { x1: X0, y1: Y0 + i * SY, x2: X0 + 5 * SX, y2: Y0 + i * SY, class: 'lp-dg-fret' }));
    }
    if (baseFret === 1) {
      parts.push(svg('rect', { x: X0 - 1, y: Y0 - 4, width: 5 * SX + 2, height: 5, rx: 1.5, class: 'lp-dg-nut' }));
    } else {
      parts.push(
        svg('text', { x: leftHanded ? X0 + 5 * SX + 7 : X0 - 7, y: Y0 + SY / 2 + 4, class: 'lp-dg-base', 'text-anchor': leftHanded ? 'start' : 'end' }, `${baseFret}fr`)
      );
    }

    // Open (o) and muted (×) strings above the nut.
    for (let s = 0; s < 6; s++) {
      if (frets[s] === 0) parts.push(svg('circle', { cx: xs(s), cy: Y0 - 11, r: 3.6, class: 'lp-dg-open' }));
      else if (frets[s] < 0) parts.push(svg('text', { x: xs(s), y: Y0 - 7, class: 'lp-dg-muted', 'text-anchor': 'middle' }, '×'));
    }

    if (barre) {
      const left = Math.min(xs(barre.from), xs(barre.to));
      const right = Math.max(xs(barre.from), xs(barre.to));
      parts.push(svg('rect', { x: left - 6, y: cy(barre.fret) - 6, width: right - left + 12, height: 12, rx: 6, class: 'lp-dg-dot' }));
      parts.push(svg('text', { x: (left + right) / 2, y: cy(barre.fret) + 3.2, class: 'lp-dg-finger', 'text-anchor': 'middle' }, String(barre.finger)));
    }

    for (let s = 0; s < 6; s++) {
      const fret = frets[s];
      if (fret <= 0) continue;
      if (barre && fret === barre.fret && fingers[s] === barre.finger) continue;
      parts.push(svg('circle', { cx: xs(s), cy: cy(fret), r: 6, class: 'lp-dg-dot' }));
      if (fingers[s]) {
        parts.push(svg('text', { x: xs(s), y: cy(fret) + 3.2, class: 'lp-dg-finger', 'text-anchor': 'middle' }, String(fingers[s])));
      }
    }

    return svg(
      'svg',
      { class: 'lp-dg', viewBox: `0 0 ${WIDTH} ${height}`, width: WIDTH, height, role: 'img', 'aria-label': name },
      parts
    );
  }

  LP.diagram = { renderDiagram };
})(typeof globalThis !== 'undefined' ? globalThis : this);
