'use strict';
/*
 * End-to-end smoke test: loads the unpacked extension into Chromium and
 * drives real laminor.org song pages. Run it after the site changes its
 * markup to see whether the extension still works.
 *
 *   npm install
 *   npx playwright-core install chromium   # once
 *   npm run test:e2e
 *
 * CHROMIUM_PATH=/path/to/chromium overrides the browser.
 */
const { chromium } = require('playwright-core');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXT = path.resolve(__dirname, '../../extension');
const SONG = 'https://laminor.org/artists/' + encodeURIComponent('شادمهر-عقیلی') + '/' + encodeURIComponent('تقدیر');

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : '  — ' + JSON.stringify(detail)}`);
}

// Chromium derives an unpacked extension's id from its folder path.
function extensionId(dir) {
  const hex = crypto.createHash('sha256').update(dir).digest('hex').slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'laminor-pro-e2e-')), {
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  const reactErrors = [];
  const page = await ctx.newPage();
  // When does dark mode reach the page, compared with its first paint?
  await page.addInitScript(() => {
    window.__darkAt = null;
    new MutationObserver(() => {
      const html = document.documentElement;
      if (window.__darkAt == null && html && html.hasAttribute('data-lp-dark')) window.__darkAt = performance.now();
    }).observe(document, { attributes: true, childList: true, subtree: true });
  });
  page.on('pageerror', (e) => {
    if (/chrome-extension|LaminorPro/.test(e.stack || '')) errors.push(e.message);
    if (/Minified React error|Hydration/i.test(e.message)) reactErrors.push(e.message.slice(0, 160));
  });
  page.on('console', (m) => {
    if (/Laminor Pro/.test(m.text())) errors.push(m.text());
    if (/Minified React error|Hydration failed/i.test(m.text())) reactErrors.push(m.text().slice(0, 160));
  });

  // Several song pages can be in the DOM (Next.js keeps visited ones hidden): use the one on screen.
  const panel = '.lp-panel:visible';
  const chords = async (n = 6) => (await page.locator('[data-lp-sheet]:visible .lp-c-name').allTextContents()).slice(0, n).join(' ');
  const press = (text) => page.locator(`${panel} button`, { hasText: text }).first().click();
  const capo = () => page.locator(`${panel} select[aria-label="کاپو"]`).inputValue();
  const shown = (selector) =>
    page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => (e.getClientRects().length ? 'shown' : 'hidden')), selector);

  await page.goto(SONG, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(panel, { timeout: 30000 });
  await page.waitForTimeout(800);

  check('one panel on the page', (await page.locator(panel).count()) === 1);
  check('panel sits where the site shows its tools', await page.evaluate(() => Boolean(document.querySelector('.lp-panel.lp-in-tools'))));
  check('original sheet replaced', await page.evaluate(() => {
    const original = document.querySelector('[data-lp-original]');
    const copy = document.querySelector('[data-lp-sheet]');
    return getComputedStyle(original).display === 'none' && copy.getClientRects().length > 0 && copy.previousElementSibling === original;
  }));

  const site = await page.$$eval('[data-lp-original] [class*="__chord"]:not([class*="__chordLine"])', (els) => els.map((e) => e.textContent.trim()));
  const ours = await page.locator('[data-lp-sheet]:visible .lp-c-name').allTextContents();
  check('same chords as the site', site.length > 20 && JSON.stringify(site) === JSON.stringify(ours), { site: site.length, ours: ours.length });

  const drift = await page.evaluate(() => {
    const copy = document.querySelector('[data-lp-sheet]');
    const original = copy.previousElementSibling;
    const measure = (sheet, selector) => {
      const box = sheet.getBoundingClientRect();
      return [...sheet.querySelectorAll(selector)].map((e) => {
        const r = e.getBoundingClientRect();
        return [box.right - r.right, r.top - box.top, r.width];
      });
    };
    original.removeAttribute('data-lp-original');
    copy.style.display = 'none';
    const a = measure(original, '[class*="__chord"]:not([class*="__chordLine"]), [class*="__lyricLine"]');
    original.setAttribute('data-lp-original', '');
    copy.style.display = '';
    const b = measure(copy, '.lp-c, [class*="__lyricLine"]');
    if (a.length !== b.length) return 999;
    return Math.max(0, ...a.map((p, i) => Math.max(...p.map((v, j) => Math.abs(v - b[i][j])))));
  });
  check('chords and lyrics keep the site layout', drift <= 1, `${drift.toFixed(2)}px`);
  check('initial chords', (await chords()) === 'Ab Bb Cm Gm Eb Fm', await chords());
  check('original key read from the page', (await page.textContent(`${panel} .lp-key-now`)) === 'Cm');

  await page.click(`${panel} button[title="نیم‌پرده بالاتر"]`);
  await page.click(`${panel} button[title="نیم‌پرده بالاتر"]`);
  check('transpose +2', (await page.textContent(`${panel} .lp-key-now`)) === 'Dm' && (await chords()) === 'Bb C Dm Am F Gm', await chords());
  await page.locator(`${panel} .lp-keys button`, { hasText: /^Am$/ }).click();
  check('key button', (await chords()) === 'F G Am Em C Dm', await chords());
  await press('اصلی');
  check('reset', (await chords()) === 'Ab Bb Cm Gm Eb Fm', await chords());

  await press('ساده‌سازی با کاپو');
  check('auto capo', (await capo()) === '3' && (await chords()) === 'F G Am Em C Dm', { capo: await capo(), chords: await chords() });
  const cards = await page.locator(`${panel} .lp-dg-card .lp-dg-title`).allTextContents();
  check('fingering guide in reading order', cards.slice(0, 3).join(' ') === 'Am G F', cards);

  await page.locator('[data-lp-sheet]:visible .lp-c-name').first().hover();
  check('diagram on hover', await page.$eval('.lp-tooltip', (t) => !t.hidden && Boolean(t.querySelector('svg'))));
  await page.mouse.move(5, 5);

  await press('ذخیره گام');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector(panel, { timeout: 30000 });
  await page.waitForTimeout(500);
  check('saved key restored after reload', (await capo()) === '3' && (await chords()) === 'F G Am Em C Dm', await chords());

  const locked = await page.evaluate(() => {
    const display = (e) => (e ? getComputedStyle(e).display : 'missing');
    const keyPicker = document.querySelector('button[aria-label*="گام اصلی"]');
    const pdf = [...document.querySelectorAll('button')].find((b) => /دانلود فایل PDF/.test(b.textContent));
    return {
      guide: display(document.querySelector('[data-chord-tool="guide"]')),
      capo: display(document.querySelector('[data-chord-tool="capo"]')),
      keys: display(keyPicker && keyPicker.closest('section')),
      autoScroll: display(document.querySelector('button[aria-label="شروع اسکرول خودکار"]')),
      pdf: display(pdf),
    };
  });
  check("site's locked tools hidden", Object.values(locked).every((d) => d === 'none' || d === 'missing'), locked);
  check('rhythm videos left alone', (await shown('[data-rhythm-guide]')).includes('shown'));
  check('free print button next to the site PDF button', (await shown('.lp-site-print')).includes('shown'));

  // Auto-scroll.
  await page.evaluate(() => window.scrollTo(0, 0));
  await press('اسکرول خودکار');
  await page.waitForTimeout(400);
  const y1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1500);
  const y2 = await page.evaluate(() => window.scrollY);
  check('auto-scroll moves the page', y1 > 200 && y2 > y1 + 10, { y1, y2 });
  check('auto-scroll control shown', (await shown('.lp-scroller')).includes('shown'));
  await page.click('.lp-scroller .lp-scroll-step >> nth=1');
  check('auto-scroll speed adjustable', (await page.textContent('.lp-scroller .lp-scroll-speed')) === '۲۹');
  await page.click('.lp-scroller .lp-scroll-stop');
  const y3 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(600);
  check('auto-scroll stops', (await page.evaluate(() => window.scrollY)) === y3 && !(await shown('.lp-scroller')).includes('shown'));

  // Print: what the print dialog gets. Headless Chromium shows no dialog and
  // fires no beforeprint/afterprint, so the print copy is still there to read.
  await page.evaluate(() => {
    const snapshot = () => {
      const printRoot = document.querySelector('.lp-print-root');
      return printRoot && {
        flagged: document.documentElement.hasAttribute('data-lp-printing'),
        title: printRoot.querySelector('.lp-print-title').textContent,
        chords: [...printRoot.querySelectorAll('.lp-c-name')].slice(0, 3).map((e) => e.textContent).join(' '),
        diagrams: printRoot.querySelectorAll('.lp-dg').length,
        pdfName: document.title,
      };
    };
    window.__snapshot = snapshot;
    window.__printed = null;
    window.addEventListener('beforeprint', () => (window.__printed = snapshot()), { once: true });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  const titleBefore = await page.title();
  await press('پرینت');
  await page.waitForTimeout(500);
  const printed = await page.evaluate(() => window.__printed || window.__snapshot());
  check(
    'print gets the chosen chords',
    printed && printed.flagged && printed.title === 'تقدیر' && printed.chords === 'F G Am' && printed.diagrams > 3 && printed.pdfName === 'تقدیر - شادمهر عقیلی',
    printed
  );
  await page.mouse.click(5, 300);
  check('print tidies up afterwards', await page.evaluate((title) => !document.querySelector('.lp-print-root') && !document.documentElement.hasAttribute('data-lp-printing') && document.title === title, titleBefore));
  await page.emulateMedia({ media: 'print' });
  const printView = await page.evaluate(() => ({
    panel: getComputedStyle(document.querySelector('.lp-panel')).display,
    copy: getComputedStyle(document.querySelector('[data-lp-sheet] .lp-c-name')).visibility,
    original: getComputedStyle(document.querySelector('[data-lp-original]')).display,
  }));
  await page.emulateMedia({ media: 'screen' });
  check("the site's own print (Ctrl+P) prints our chords", printView.panel === 'none' && printView.copy === 'visible' && printView.original === 'none', printView);

  // Moving to another song without a page load, then back.
  const firstSong = await page.locator(`${panel} .lp-key-now`).textContent();
  await page.locator('section[aria-labelledby="other-artist-songs-title"] a').first().click();
  await page.waitForFunction(() => /همخونه/.test(decodeURIComponent(location.pathname)), null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const copy = [...document.querySelectorAll('[data-lp-sheet]')].find((e) => e.getClientRects().length);
    return copy && /همخونه/.test(copy.closest('section').querySelector('h1').textContent);
  }, null, { timeout: 30000 }).catch(() => {});
  const other = await page.evaluate(() => {
    const copy = [...document.querySelectorAll('[data-lp-sheet]')].find((e) => e.getClientRects().length);
    const original = copy && copy.previousElementSibling;
    return {
      panels: [...document.querySelectorAll('.lp-panel')].filter((e) => e.getClientRects().length).length,
      title: copy && copy.closest('section').querySelector('h1').textContent,
      same: copy && JSON.stringify([...original.querySelectorAll('[class*="__chord"]:not([class*="__chordLine"])')].map((e) => e.textContent.trim())) ===
        JSON.stringify([...copy.querySelectorAll('.lp-c-name')].map((e) => e.textContent)),
    };
  });
  check('next song (no page load) gets its own panel', other.panels === 1 && /همخونه/.test(other.title || '') && other.same, other);
  await page.goBack();
  await page.waitForFunction(() => /تقدیر/.test(decodeURIComponent(location.pathname)), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  check('back to the first song keeps its panel and choices', (await page.locator(panel).count()) === 1 && (await capo()) === '3' && (await page.locator(`${panel} .lp-key-now`).textContent()) === firstSong);

  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extensionId(EXT)}/src/popup/popup.html`);
  await popup.waitForSelector('.song', { timeout: 5000 }).catch(() => {});
  check('popup lists the saved song', (await popup.$$eval('.song .title', (els) => els.map((e) => e.textContent))).includes('تقدیر'));
  await popup.click('.song .remove');
  await page.waitForTimeout(400);
  check('removing in the popup updates the page', /ذخیره گام/.test(await page.locator(`${panel} .lp-primary`).textContent()));

  // Dark mode, for every laminor.org page.
  await page.locator(`${panel} .lp-theme`).click();
  await page.waitForTimeout(300);
  const dark = await page.evaluate(() => ({
    on: document.documentElement.hasAttribute('data-lp-dark'),
    filter: getComputedStyle(document.documentElement).filter,
    photos: [...document.querySelectorAll('img:not([src*=".svg"])')].map((i) => getComputedStyle(i).filter),
  }));
  check('dark mode turns on', dark.on && /invert/.test(dark.filter) && dark.photos.every((f) => /invert/.test(f)), dark);
  check('dark mode button says how to go back', /روشن/.test(await page.locator(`${panel} .lp-theme`).textContent()));
  await page.emulateMedia({ media: 'print' });
  check('printing stays light', (await page.evaluate(() => getComputedStyle(document.documentElement).filter)) === 'none');
  await page.emulateMedia({ media: 'screen' });
  await page.reload({ waitUntil: 'load' });
  const paint = await page.evaluate(() => ({
    darkAt: window.__darkAt,
    firstPaint: (performance.getEntriesByName('first-paint')[0] || {}).startTime,
  }));
  check('dark before the first paint (no white flash)', paint.darkAt != null && paint.firstPaint != null && paint.darkAt <= paint.firstPaint, paint);
  await popup.reload();
  await popup.waitForTimeout(300);
  check('popup shows dark mode and turns dark too', (await popup.$eval('[data-pref="darkMode"]', (s) => s.value)) === 'on' && (await popup.evaluate(() => document.documentElement.hasAttribute('data-dark'))));
  await popup.selectOption('[data-pref="darkMode"]', 'off');
  await page.waitForTimeout(400);
  check('turning it off in the popup updates the page', !(await page.evaluate(() => document.documentElement.hasAttribute('data-lp-dark'))));
  await popup.close();

  // Phone-sized screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector(panel, { timeout: 30000 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('fits a phone screen', overflow <= 0, `${overflow}px`);

  check('no extension errors', errors.length === 0, errors);
  check('no React errors', reactErrors.length === 0, reactErrors);
  await ctx.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
