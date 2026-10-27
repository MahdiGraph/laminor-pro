'use strict';
/*
 * End-to-end smoke test: loads the unpacked extension into Chromium and
 * drives a real laminor.org song page. Run it after the site changes its
 * markup to see whether the extension still works.
 *
 *   npm install
 *   npx playwright-core install chromium   # once
 *   npm run test:e2e
 *
 * CHROMIUM_PATH=/path/to/chromium overrides the browser. Note: the site
 * shows anonymous repeat visitors only the first two lines of a sheet, so
 * the checks below only rely on those.
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

async function dismissSitePopups(page) {
  await page.waitForTimeout(800);
  const ok = await page.$('#enhanced-modal-ok-btn');
  if (ok && (await ok.isVisible())) await ok.click();
}

(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'laminor-pro-e2e-')), {
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => /chrome-extension|LaminorPro/.test(e.stack || '') && errors.push(e.message));
  page.on('console', (m) => /Laminor Pro/.test(m.text()) && errors.push(m.text()));

  const chords = async () => (await page.$$eval('.lp-sheet .lp-c-name', (els) => els.map((e) => e.textContent))).slice(0, 6).join(' ');
  const press = (text) => page.locator('.lp-panel button', { hasText: text }).first().click();
  const capo = () => page.$eval('.lp-panel select[aria-label="کاپو"]', (s) => s.value);

  await page.goto(SONG, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.lp-panel', { timeout: 30000 });
  await dismissSitePopups(page);

  const site = await page.$$eval('#main-chord .c', (els) => els.map((e) => e.textContent.trim()));
  const ours = await page.$$eval('.lp-sheet .lp-c-name', (els) => els.map((e) => e.textContent));
  check('original sheet replaced', await page.$eval('#main-chord', (e) => getComputedStyle(e).display === 'none'));
  check('same chords as the site', JSON.stringify(site) === JSON.stringify(ours), { site: site.length, ours: ours.length });

  const drift = await page.evaluate(() => {
    const original = document.getElementById('main-chord');
    const sheet = document.querySelector('.lp-sheet');
    const measure = (pre, selector) => {
      const box = pre.getBoundingClientRect();
      return [...pre.querySelectorAll(selector)].map((e) => {
        const r = e.getBoundingClientRect();
        return [box.right - r.right, r.top - box.top];
      });
    };
    original.classList.remove('lp-original');
    sheet.style.display = 'none';
    const a = measure(original, '.c');
    original.classList.add('lp-original');
    sheet.style.display = '';
    const b = measure(sheet, '.lp-c');
    return Math.max(0, ...a.map((p, i) => (b[i] ? Math.max(Math.abs(p[0] - b[i][0]), Math.abs(p[1] - b[i][1])) : 0)));
  });
  check('chords keep the site alignment', drift <= 1, `${drift.toFixed(2)}px`);
  check('initial chords', (await chords()) === 'Ab Bb Cm Gm Eb Fm', await chords());

  await page.click('.lp-panel button[title="نیم‌پرده بالاتر"]');
  await page.click('.lp-panel button[title="نیم‌پرده بالاتر"]');
  check('transpose +2', (await page.textContent('.lp-key-now')) === 'Dm' && (await chords()) === 'Bb C Dm Am F Gm', await chords());
  await page.locator('.lp-keys button', { hasText: /^Am$/ }).click();
  check('key button', (await chords()) === 'F G Am Em C Dm', await chords());
  await press('اصلی');
  check('reset', (await chords()) === 'Ab Bb Cm Gm Eb Fm', await chords());

  await press('ساده‌سازی با کاپو');
  check('auto capo', (await capo()) === '3' && (await chords()) === 'F G Am Em C Dm', { capo: await capo(), chords: await chords() });
  const cards = await page.$$eval('.lp-dg-card .lp-dg-title', (els) => els.map((e) => e.textContent));
  check('fingering guide in reading order', cards.slice(0, 3).join(' ') === 'Am G F', cards);

  await page.hover('.lp-sheet .lp-c-name >> nth=0');
  check('diagram on hover', await page.$eval('.lp-tooltip', (t) => !t.hidden && Boolean(t.querySelector('svg'))));
  await page.mouse.move(5, 5);

  await press('ذخیره گام');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lp-panel');
  await dismissSitePopups(page);
  check('saved key restored after reload', (await capo()) === '3');

  const hidden = await page.evaluate(() =>
    ['#transpose-keys', '#chord-helper-container', '#simplify-container', '#download-chord'].map((s) => {
      const e = document.querySelector(s);
      return e ? getComputedStyle(e).display : 'missing';
    })
  );
  check("site's locked controls hidden", hidden.every((d) => d === 'none' || d === 'missing'), hidden);

  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extensionId(EXT)}/src/popup/popup.html`);
  await popup.waitForSelector('.song', { timeout: 5000 }).catch(() => {});
  check('popup lists the saved song', (await popup.$$eval('.song .title', (els) => els.map((e) => e.textContent))).includes('تقدیر'));
  await popup.click('.song .remove');
  await page.waitForTimeout(400);
  check('removing in the popup updates the page', /ذخیره گام/.test(await page.textContent('.lp-panel .lp-primary')));

  check('no extension errors', errors.length === 0, errors);
  await ctx.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
