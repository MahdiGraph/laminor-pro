/*
 * Laminor Pro — content script entry point.
 * Reads the chord sheet that is already on the page, replaces it with an
 * interactive copy and wires up the tools panel. Everything happens locally
 * in the browser; the extension makes no network requests.
 */
(function (root) {
  'use strict';

  const LP = root.LaminorPro;
  const { music, voicings, arrange, sheet, sheetView, storage, print } = LP;
  const { h } = LP.dom;

  function songId() {
    let path = location.pathname;
    try {
      path = decodeURIComponent(path);
    } catch (_) {
      // keep the raw path
    }
    return path.replace(/\/+$/, '') || '/';
  }

  // Page titles look like "آکورد گیتار آهنگ <song> از <artist> - لامینور"; the
  // song part is greedy because titles such as «دور از تو» contain «از» too.
  function songInfo() {
    const m = /آهنگ\s+(.+)\s+از\s+(.+?)\s+-\s+لامینور/.exec(document.title);
    if (m) return { title: m[1].trim(), artist: m[2].trim() };
    const heading = document.querySelector('h1');
    const title = (heading ? heading.textContent : document.title).replace(/^\s*آکورد\s+(آهنگ\s+)?/, '').trim();
    const parts = songId().split('/');
    return { title, artist: parts[1] === 'artists' && parts[2] ? parts[2].replace(/-/g, ' ') : '' };
  }

  function inferKey(chords) {
    const first = chords[0];
    return { root: first.root, minor: music.MINOR_QUALITIES.has(first.quality) };
  }

  // The site's "change key" heading has no id; tag it so CSS can hide it
  // together with the other paid-only controls.
  function tagSiteControls() {
    for (const heading of document.querySelectorAll('h3')) {
      if (heading.textContent.trim() === 'تغییر گام' && heading.parentElement) {
        heading.parentElement.classList.add('lp-site-locked');
      }
    }
  }

  async function init() {
    const original = document.getElementById('main-chord');
    if (!original || original.dataset.lpReady) return;
    const model = sheet.parseSheet(original.textContent);
    if (!model.chords.length) return;
    original.dataset.lpReady = '1';

    const key = music.parseKey(original.dataset.key) || inferKey(model.chords);
    const counted = sheet.countChords(model.chords);
    const id = songId();
    const info = songInfo();

    let prefs = await storage.getPrefs();
    let saved = await storage.getSong(id);

    const state = {
      transpose: saved ? music.normalizeShift(saved.transpose || 0) : 0,
      capo: saved ? saved.capo || 0 : 0,
      capoAuto: saved ? Boolean(saved.capoAuto) : prefs.autoCapo,
      simplify: saved ? Boolean(saved.simplify) : prefs.simplify,
      diagrams: prefs.showDiagrams,
    };
    const voicingIndex = new Map();
    let shown = [];
    let uniqueChords = [];

    const settings = () => ({
      key,
      transpose: state.transpose,
      capo: state.capo,
      simplify: state.simplify,
      notation: prefs.notation,
    });

    const actions = {
      setTranspose(t) {
        state.transpose = music.normalizeShift(t);
        refresh();
      },
      stepTranspose(delta) {
        state.transpose = music.normalizeShift(state.transpose + delta);
        refresh();
      },
      setCapo(fret) {
        state.capo = fret;
        state.capoAuto = false;
        refresh();
      },
      toggleAutoCapo() {
        state.capoAuto = !state.capoAuto;
        if (!state.capoAuto) state.capo = 0;
        refresh();
      },
      toggleSimplify() {
        state.simplify = !state.simplify;
        refresh();
      },
      toggleDiagrams() {
        state.diagrams = !state.diagrams;
        refresh();
        storage.setPrefs({ showDiagrams: state.diagrams });
      },
      setNotation(notation) {
        prefs = { ...prefs, notation };
        refresh();
        storage.setPrefs({ notation });
      },
      async save() {
        const s = settings();
        saved = {
          transpose: state.transpose,
          capo: state.capo,
          capoAuto: state.capoAuto,
          simplify: state.simplify,
          title: info.title,
          artist: info.artist,
          keyName: music.keyName(arrange.soundingKey(s), prefs.notation),
          shapeKeyName: music.keyName(arrange.shapeKey(s), prefs.notation),
          originalKeyName: music.keyName(key, prefs.notation),
          url: location.origin + location.pathname,
        };
        await storage.saveSong(id, saved);
        ui.flash('گام این آهنگ ذخیره شد ✓');
        refresh();
      },
      async forget() {
        await storage.removeSong(id);
        saved = null;
        ui.flash('ذخیره این آهنگ حذف شد');
        refresh();
      },
      reset() {
        Object.assign(state, { transpose: 0, capo: 0, capoAuto: false, simplify: false });
        refresh();
      },
      print() {
        const s = settings();
        const meta = [
          `گام: ${music.keyName(arrange.soundingKey(s), prefs.notation)}`,
          state.capo ? `کاپو: فرت ${LP.dom.faDigits(state.capo)} (آکوردها در ${music.keyName(arrange.shapeKey(s), prefs.notation)})` : null,
          state.transpose ? `گام اصلی: ${music.keyName(key, prefs.notation)}` : null,
        ];
        print.printSheet({
          title: info.title,
          artist: info.artist,
          meta,
          sheet: sheetEl,
          chords: state.diagrams
            ? uniqueChords.map((c) => ({ name: c.name, voicing: c.voicings[c.index] || null, approx: c.approx }))
            : null,
          leftHanded: prefs.leftHanded,
          rtl: model.rtl,
        });
      },
      nextVoicing(name) {
        const item = uniqueChords.find((c) => c.name === name);
        if (!item || item.voicings.length < 2) return;
        voicingIndex.set(name, (item.index + 1) % item.voicings.length);
        refresh();
      },
    };

    const { pre: sheetEl, slots } = sheetView.buildSheet(model, original);
    const order = sheetView.readingOrder(slots, model.rtl);
    const ui = LP.panel.createPanel(actions);
    original.classList.add('lp-original');
    original.before(ui.el);
    original.after(sheetEl);

    const sitePdf = document.getElementById('download-chord');
    if (sitePdf) {
      // Bootstrap classes only: the site binds its subscription popup to `.download-chord`.
      sitePdf.after(h('button', { type: 'button', class: 'btn btn-default w-100 lp-site-print', onclick: () => actions.print() }, '🖨️ پرینت / دانلود PDF'));
    }
    tagSiteControls();

    function averageDifficulty(s) {
      let total = 0;
      let count = 0;
      for (const item of counted) {
        total += arrange.chordDifficulty(item.chord, s) * item.count;
        count += item.count;
      }
      return count ? total / count : 0;
    }

    function refresh() {
      const best = arrange.bestCapo(counted, settings());
      if (state.capoAuto) state.capo = best.capo;
      const s = settings();

      shown = slots.map((slot) => arrange.displayChord(slot.chord, s));
      sheetView.updateSheet(slots, shown);

      const seen = new Set();
      uniqueChords = [];
      for (const i of order) {
        const chord = shown[i];
        if (seen.has(chord.name)) continue;
        seen.add(chord.name);
        const found = voicings.voicingsFor(chord.root, chord.quality, chord.bass);
        const index = Math.min(voicingIndex.get(chord.name) || 0, Math.max(0, found.voicings.length - 1));
        uniqueChords.push({ name: chord.name, voicings: found.voicings, approx: found.approx || chord.approx, index });
      }

      const keyChoices = [];
      for (let pc = 0; pc < 12; pc++) {
        keyChoices.push({
          name: music.keyName({ root: pc, minor: key.minor }, prefs.notation),
          transpose: music.normalizeShift(pc - key.root),
          active: music.mod12(key.root + state.transpose) === pc,
          original: pc === key.root,
        });
      }

      const dirty =
        saved &&
        (music.normalizeShift(saved.transpose || 0) !== state.transpose ||
          (saved.capo || 0) !== state.capo ||
          Boolean(saved.capoAuto) !== state.capoAuto ||
          Boolean(saved.simplify) !== state.simplify);

      ui.render({
        transpose: state.transpose,
        capo: state.capo,
        capoAuto: state.capoAuto,
        simplify: state.simplify,
        diagrams: state.diagrams,
        notation: prefs.notation,
        leftHanded: prefs.leftHanded,
        rtl: model.rtl,
        soundingKeyName: music.keyName(arrange.soundingKey(s), prefs.notation),
        shapeKeyName: music.keyName(arrange.shapeKey(s), prefs.notation),
        keyChoices,
        best,
        currentDifficulty: averageDifficulty(s),
        saved,
        dirty,
        isOriginal: !state.transpose && !state.capo && !state.capoAuto && !state.simplify,
        uniqueChords,
      });
      if (tooltip.slot) showTooltip(tooltip.slot);
    }

    // Chord diagram on hover (mouse) or tap (touch).
    const tooltip = { el: h('div', { class: 'lp-tooltip', role: 'tooltip', hidden: true }), slot: null };
    document.body.append(tooltip.el);

    function showTooltip(slot) {
      const chord = shown[Number(slot.dataset.i)];
      const item = chord && uniqueChords.find((c) => c.name === chord.name);
      if (!item) return hideTooltip();
      tooltip.slot = slot;
      tooltip.el.replaceChildren(
        LP.diagram.renderDiagram({ name: item.name, voicing: item.voicings[item.index] || null, approx: item.approx, leftHanded: prefs.leftHanded })
      );
      tooltip.el.hidden = false;
      const anchor = slot.querySelector('.lp-c-name').getBoundingClientRect();
      const box = tooltip.el.getBoundingClientRect();
      let left = anchor.left + anchor.width / 2 - box.width / 2;
      left = Math.max(8, Math.min(left, document.documentElement.clientWidth - box.width - 8));
      let top = anchor.top - box.height - 8;
      if (top < 8) top = anchor.bottom + 8;
      tooltip.el.style.left = `${left + window.scrollX}px`;
      tooltip.el.style.top = `${top + window.scrollY}px`;
    }

    function hideTooltip() {
      tooltip.slot = null;
      tooltip.el.hidden = true;
    }

    sheetEl.addEventListener('pointerover', (e) => {
      const slot = e.target.closest('.lp-c');
      if (slot && e.pointerType === 'mouse' && prefs.hoverDiagrams) showTooltip(slot);
    });
    sheetEl.addEventListener('pointerout', (e) => {
      const slot = e.target.closest('.lp-c');
      if (slot && e.pointerType === 'mouse' && !slot.contains(e.relatedTarget)) hideTooltip();
    });
    sheetEl.addEventListener('click', (e) => {
      const slot = e.target.closest('.lp-c');
      if (!slot) return;
      if (tooltip.slot === slot) hideTooltip();
      else showTooltip(slot);
    });
    document.addEventListener('click', (e) => {
      if (tooltip.slot && !e.target.closest('.lp-c')) hideTooltip();
    });
    window.addEventListener('resize', hideTooltip);

    function applyPrefs() {
      document.documentElement.classList.toggle('lp-hide-locked', prefs.hideLocked);
    }

    storage.onChange((newPrefs, songChanged, changes) => {
      if (newPrefs) {
        prefs = newPrefs;
        state.diagrams = prefs.showDiagrams;
        applyPrefs();
      }
      const songKey = storage.SONG_PREFIX + id;
      if (songChanged && changes[songKey]) saved = changes[songKey].newValue || null;
      if (newPrefs || (songChanged && changes[songKey])) refresh();
    });

    applyPrefs();
    refresh();
    if (saved) ui.flash('گام ذخیره‌شده‌ی شما برای این آهنگ اعمال شد');
  }

  init().catch((err) => console.error('[Laminor Pro]', err));
})(typeof globalThis !== 'undefined' ? globalThis : this);
