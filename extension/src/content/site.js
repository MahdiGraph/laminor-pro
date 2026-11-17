/*
 * Laminor Pro — laminor.org adapter.
 * Every selector that depends on the site's markup lives in this file, so a
 * redesign of the site only needs changes here.
 *
 * The site (Next.js, since November 2026) renders each song page in its own
 * <main>: a header with the title, artist and original key ("گام اصلی: Cm"),
 * the site's tools (subscriber-only) and #chord-text-section with the sheet.
 * The sheet is a <div dir="rtl|ltr"> holding one "sourceLine" <div> per line
 * of the original text; chord lines hold one <span> per chord. Class names
 * come from CSS modules ("chord-lyrics-module__<hash>__sheet"), so only their
 * stable part is matched. Next.js keeps recently visited pages in the DOM,
 * hidden with display:none, so several sheets can exist at the same time.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { parseKey } = LP.music;

  const SHEET = '[class*="chord-lyrics-module"][class*="__sheet"]';
  const SHEET_FALLBACK = '[id="chord-text-section"] > div[dir]:not([class*="print:"])';
  const LINE = '[class*="__sourceLine"]';
  const CHORD = '[class*="__chord"]:not([class*="__chordLine"]):not([class*="__chordRow"])';
  const OURS = '[data-lp-sheet], [data-lp-owned], .lp-panel, .lp-print-root';
  const KEY_LABEL = /گام\s*اصلی\s*:?\s*([A-G][#b♯♭]?(?:m(?!aj))?)/;
  const NOTE = /^[A-G][#b♯♭]?$/;
  const LOCKED_TOOLS = '[data-chord-tool="guide"], [data-chord-tool="capo"]';

  /** True for elements created by Laminor Pro. */
  function isOurs(el) {
    return Boolean(el.closest(OURS));
  }

  function isVisible(el) {
    return Boolean(el && el.isConnected && el.getClientRects().length);
  }

  /** The site's chord sheets currently in the document, hidden ones included. */
  function findSheets() {
    let found = [...document.querySelectorAll(SHEET)];
    if (!found.length) found = [...document.querySelectorAll(SHEET_FALLBACK)];
    return found.filter((el) => !isOurs(el));
  }

  /** Line elements of a sheet (or of a copy of it), top to bottom. */
  function lineElements(sheet) {
    const lines = sheet.querySelectorAll(LINE);
    if (lines.length) return [...lines];
    // Unknown markup: every <div> that holds no other <div> is a line.
    return [...sheet.querySelectorAll('div')].filter((el) => !el.querySelector('div'));
  }

  /** How the site shows a line: 'chords', 'text', or null when it doesn't say. */
  function lineKind(el) {
    const name = String(el.className || '');
    if (/__chordLine/.test(name)) return 'chords';
    if (/__lyricLine/.test(name)) return 'text';
    return null;
  }

  /** One of the site's chord elements, to give our chord slots the same look. */
  function chordTemplate(sheet) {
    return sheet.querySelector(CHORD);
  }

  /** The element holding one song page: its header, the tools and the sheet. */
  function pageScope(sheet) {
    for (let el = sheet.parentElement; el && el !== document.body; el = el.parentElement) {
      if (el.querySelector('h1')) return el;
    }
    return document.body;
  }

  /** { title, artist } from the song header; empty strings when not found. */
  function songInfo(scope) {
    const heading = scope.querySelector('h1');
    const title = heading ? heading.textContent.replace(/^\s*آکورد\s+(گیتار\s+)?(آهنگ\s+)?/, '').trim() : '';
    const link = scope.querySelector('header a[href^="/artists/"]') || scope.querySelector('a[href^="/artists/"]');
    return { title, artist: link ? link.textContent.trim() : '' };
  }

  /**
   * Key of the chords the sheet shows: the original key from the header,
   * moved to the selected key button when a subscriber transposed with the
   * site's own tool. Null when the page doesn't say.
   */
  function readKey(scope) {
    const header = scope.querySelector('header');
    const section = scope.querySelector('[id="chord-text-section"]');
    let original = null;
    for (const el of [header, section]) {
      const m = el && KEY_LABEL.exec(el.textContent);
      if (m && (original = parseKey(m[1]))) break;
    }
    const pressed = [...scope.querySelectorAll('button[aria-pressed="true"]')].find(
      (b) => !isOurs(b) && NOTE.test(b.textContent.trim())
    );
    const shown = pressed ? parseKey(pressed.textContent.trim()) : null;
    if (original && shown) return { root: shown.root, minor: original.minor };
    return original;
  }

  /** Where the site shows its tools; the panel goes at the top of it. */
  function toolsContainer(scope, sheet) {
    const grid = scope.querySelector('[class*="__toolsGrid"]');
    const tool = grid || scope.querySelector('[data-chord-tool]');
    const container = tool && (grid ? grid.parentElement : tool.parentElement && tool.parentElement.parentElement);
    if (!container || container.contains(sheet) || container.querySelector('h1') || isOurs(container)) return null;
    return container;
  }

  /** The site's "download PDF" buttons (subscriber-only) under `rootEl`. */
  function pdfButtons(rootEl) {
    return [...rootEl.querySelectorAll('button')].filter(
      (b) => !isOurs(b) && /PDF/.test(b.textContent) && /دانلود/.test(b.textContent)
    );
  }

  /**
   * The site's subscriber-only controls that Laminor Pro replaces: chord
   * guide, capo simplification, key picker with "save key", auto-scroll and
   * PDF download. The rhythm videos stay: they are not replaced.
   */
  function lockedControls(scope, sheet) {
    const found = new Set();
    const add = (el) => {
      if (el && !isOurs(el) && !el.contains(sheet) && !el.querySelector('h1')) found.add(el);
    };
    const tools = [...scope.querySelectorAll(LOCKED_TOOLS)];
    tools.forEach(add);
    // A tools grid with nothing else in it would stay behind as an empty box.
    for (const grid of new Set(tools.map((el) => el.parentElement))) {
      if (grid && [...grid.children].every((child) => child.matches(LOCKED_TOOLS))) add(grid);
    }
    const keyButton = scope.querySelector('button[aria-label*="گام اصلی"], button[aria-controls="mobile-key-picker"]');
    if (keyButton) add(keyButton.closest('section'));
    for (const button of scope.querySelectorAll('button[aria-label="شروع اسکرول خودکار"]')) add(button);
    pdfButtons(scope).forEach(add);
    return [...found];
  }

  LP.site = {
    isOurs,
    isVisible,
    findSheets,
    lineElements,
    lineKind,
    chordTemplate,
    pageScope,
    songInfo,
    readKey,
    toolsContainer,
    pdfButtons,
    lockedControls,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
