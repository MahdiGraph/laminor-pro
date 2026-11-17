/*
 * Laminor Pro — auto-scroll. Moves the page down at a steady speed while the
 * player's hands are on the guitar, and shows a small floating control
 * (stop, speed) while it runs. It stops by itself at the end of the sheet.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { h, svg, faDigits } = LP.dom;

  const MIN_SPEED = 10;
  const MAX_SPEED = 100;
  const PX_PER_SECOND = 0.8; // speed 10…100 → 8…80 px/s, the same scale as the site's own slider
  const TOP_GAP = 80; // the sheet starts this far below the top of the window

  let target = null;
  let speed = 24;
  let frame = 0;
  let last = 0;
  let carry = 0;
  let bar = null;
  let onCommit = () => {};
  const listeners = new Set();

  const clamp = (value) => Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(Number(value) || 0)));

  function notify() {
    for (const fn of listeners) fn();
  }

  function atEnd() {
    const bottom = target.getBoundingClientRect().bottom;
    const page = document.documentElement;
    return window.innerHeight >= bottom - 1 || window.scrollY + window.innerHeight >= page.scrollHeight - 1;
  }

  function tick(now) {
    if (!target || !LP.site.isVisible(target)) return stop();
    const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    carry += speed * PX_PER_SECOND * seconds;
    const px = Math.floor(carry);
    if (px > 0) {
      carry -= px;
      window.scrollBy({ top: px, behavior: 'instant' });
      if (atEnd()) return stop();
    }
    frame = requestAnimationFrame(tick);
  }

  function pauseIcon() {
    return svg(
      'svg',
      { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', class: 'lp-icon' },
      svg('rect', { x: 6, y: 5, width: 4, height: 14, rx: 1 }),
      svg('rect', { x: 14, y: 5, width: 4, height: 14, rx: 1 })
    );
  }

  function commit() {
    onCommit(speed);
  }

  function buildBar() {
    const range = h('input', {
      type: 'range',
      min: MIN_SPEED,
      max: MAX_SPEED,
      step: 1,
      class: 'lp-scroll-range',
      'aria-label': 'سرعت اسکرول',
    });
    range.addEventListener('input', () => setSpeed(range.value));
    range.addEventListener('change', commit);
    const nudge = (delta) => {
      setSpeed(speed + delta);
      commit();
    };
    // Left to right like the site's own control: slow … fast, then stop.
    const el = h(
      'div',
      { class: 'lp-scroller', dir: 'ltr', role: 'group', 'aria-label': 'اسکرول خودکار', 'data-lp-owned': '' },
      h('button', { type: 'button', class: 'lp-scroll-step', title: 'آهسته‌تر', 'aria-label': 'آهسته‌تر', onclick: () => nudge(-5) }, '−'),
      range,
      h('button', { type: 'button', class: 'lp-scroll-step', title: 'تندتر', 'aria-label': 'تندتر', onclick: () => nudge(5) }, '+'),
      h('span', { class: 'lp-scroll-speed', title: 'سرعت' }),
      h('button', { type: 'button', class: 'lp-scroll-stop', title: 'توقف (Esc)', 'aria-label': 'توقف اسکرول خودکار', onclick: () => stop() }, pauseIcon())
    );
    return { el, range, label: el.querySelector('.lp-scroll-speed') };
  }

  function updateBar() {
    if (!bar) return;
    bar.range.value = String(speed);
    bar.label.textContent = faDigits(speed);
  }

  function onKey(e) {
    if (e.key === 'Escape' && target) stop();
  }

  /** Starts scrolling through `el` (the sheet), from its top. */
  function start(el) {
    stop();
    target = el;
    const top = el.getBoundingClientRect().top;
    if (top > TOP_GAP) window.scrollBy({ top: top - TOP_GAP, behavior: 'instant' });
    if (!bar) bar = buildBar();
    if (!bar.el.isConnected) document.body.append(bar.el);
    bar.el.hidden = false;
    updateBar();
    document.addEventListener('keydown', onKey);
    last = performance.now();
    carry = 0;
    frame = requestAnimationFrame(tick);
    notify();
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    document.removeEventListener('keydown', onKey);
    if (bar) bar.el.hidden = true;
    if (!target) return;
    target = null;
    notify();
  }

  function setSpeed(value) {
    speed = clamp(value);
    updateBar();
  }

  /** Is it scrolling (through `el`, when given)? */
  function isPlaying(el) {
    return Boolean(target) && (!el || target === el);
  }

  /** speed: initial speed; commit: called with the speed the user settled on. */
  function configure({ speed: initial, commit: save } = {}) {
    if (initial != null) setSpeed(initial);
    if (save) onCommit = save;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  LP.scroller = { MIN_SPEED, MAX_SPEED, start, stop, setSpeed, isPlaying, configure, onChange };
})(typeof globalThis !== 'undefined' ? globalThis : this);
