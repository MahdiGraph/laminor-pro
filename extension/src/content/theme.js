/*
 * Laminor Pro — dark mode for every laminor.org page.
 * Runs as soon as the page starts loading, so the page is dark before it is
 * first shown. The site itself is always light; theme.css inverts it while
 * keeping its hues and turns photos and videos back to their real colours.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { storage } = LP;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set();
  let mode = storage.DEFAULT_PREFS.darkMode;

  function isDark() {
    return mode === 'on' || (mode === 'auto' && system.matches);
  }

  function apply() {
    const html = document.documentElement;
    if (!html) return;
    const dark = isDark();
    if (html.hasAttribute('data-lp-dark') === dark) return;
    html.toggleAttribute('data-lp-dark', dark);
    for (const fn of listeners) fn(dark);
  }

  /** Turns dark mode on or off for every laminor.org page. */
  function setDark(dark) {
    mode = dark ? 'on' : 'off';
    apply();
    return storage.setPrefs({ darkMode: mode });
  }

  function onChange(fn) {
    listeners.add(fn);
  }

  storage.getPrefs().then((prefs) => {
    mode = prefs.darkMode;
    apply();
  });
  storage.onChange((prefs) => {
    if (!prefs) return;
    mode = prefs.darkMode;
    apply();
  });
  system.addEventListener('change', apply);
  // In case the page had no root element yet when the preference arrived.
  document.addEventListener('DOMContentLoaded', apply, { once: true });

  LP.theme = { isDark, setDark, onChange };
})(typeof globalThis !== 'undefined' ? globalThis : this);
