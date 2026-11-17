/*
 * Laminor Pro — content script entry point.
 * laminor.org is a single-page app: song pages are rendered without page
 * loads, and Next.js keeps recently visited ones in the DOM (hidden) for the
 * Back button. So the document is watched, and every chord sheet that shows
 * up gets the tools panel and an interactive copy that replaces it.
 * Everything happens locally in the browser; the extension makes no network
 * requests.
 */
(function (root) {
  'use strict';

  const LP = root.LaminorPro;
  const { music, voicings, arrange, sheet, sheetView, storage, print, site, scroller } = LP;
  const { h } = LP.dom;

  let prefs = { ...storage.DEFAULT_PREFS };
  let started = false;
  /** The site's sheet element → { status: 'pending' | 'empty' | 'ready', signature, song } */
  const tracked = new Map();
  /** Song id → { state, at }: choices of a song whose sheet the site just replaced. */
  const recent = new Map();
  const RECENT_MS = 10000;
  const tooltip = { el: null, slot: null, song: null };

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
  function songInfo(scope, id) {
    const info = site.songInfo(scope);
    if (info.title) return info;
    const m = /آهنگ\s+(.+)\s+از\s+(.+?)\s+-\s+لامینور/.exec(document.title);
    if (m) return { title: m[1].trim(), artist: m[2].trim() };
    const parts = id.split('/');
    return {
      title: (parts[parts.length - 1] || id).replace(/-/g, ' '),
      artist: parts[1] === 'artists' && parts[2] ? parts[2].replace(/-/g, ' ') : '',
    };
  }

  function inferKey(chords) {
    const first = chords[0];
    return { root: first.root, minor: music.MINOR_QUALITIES.has(first.quality) };
  }

  function readSheet(original) {
    const items = site.lineElements(original).map((el) => ({ text: el.textContent, kind: site.lineKind(el) }));
    return { items, signature: items.map((item) => `${item.kind || '-'}|${item.text}`).join('\n') };
  }

  // ---------- one song page ----------

  function createSong(original, { id, saved: initialSaved, carry }) {
    const { items, signature } = readSheet(original);
    const model = sheet.parseLines(items);
    if (!model.chords.length) return null;

    const scope = site.pageScope(original);
    const key = site.readKey(scope) || inferKey(model.chords);
    const counted = sheet.countChords(model.chords);
    const info = songInfo(scope, id);
    let saved = initialSaved;

    const state = carry || {
      transpose: saved ? music.normalizeShift(saved.transpose || 0) : 0,
      capo: saved ? saved.capo || 0 : 0,
      capoAuto: saved ? Boolean(saved.capoAuto) : prefs.autoCapo,
      simplify: saved ? Boolean(saved.simplify) : prefs.simplify,
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
        prefs = { ...prefs, showDiagrams: !prefs.showDiagrams };
        refresh();
        storage.setPrefs({ showDiagrams: prefs.showDiagrams });
      },
      toggleScroll() {
        if (scroller.isPlaying(copy)) scroller.stop();
        else scroller.start(copy);
      },
      toggleDark() {
        if (LP.theme) LP.theme.setDark(!LP.theme.isDark());
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
          url: location.origin + id.split('/').map(encodeURIComponent).join('/'),
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
          sheet: copy,
          chords: prefs.showDiagrams
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

    const { sheet: copy, slots } = sheetView.buildSheet(model, original);
    const order = sheetView.readingOrder(slots, model.rtl);
    const ui = LP.panel.createPanel(actions);

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
        diagrams: prefs.showDiagrams,
        scrolling: scroller.isPlaying(copy),
        dark: Boolean(LP.theme && LP.theme.isDark()),
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
      if (tooltip.song === song && tooltip.slot) showTooltip(song, tooltip.slot);
    }

    function diagramFor(slot) {
      const chord = shown[Number(slot.dataset.i)];
      const item = chord && uniqueChords.find((c) => c.name === chord.name);
      if (!item) return null;
      return LP.diagram.renderDiagram({ name: item.name, voicing: item.voicings[item.index] || null, approx: item.approx, leftHanded: prefs.leftHanded });
    }

    /** Puts our elements in place; React may have re-rendered around them. */
    function place() {
      original.setAttribute('data-lp-original', '');
      if (copy.previousSibling !== original) original.after(copy);
      if (!ui.el.isConnected) {
        const container = site.toolsContainer(scope, original);
        ui.el.classList.toggle('lp-in-tools', Boolean(container));
        if (container) container.prepend(ui.el);
        else original.before(ui.el);
      }
      for (const el of site.lockedControls(scope, original)) el.setAttribute('data-lp-locked', '');
    }

    function dispose() {
      if (scroller.isPlaying(copy)) scroller.stop();
      if (tooltip.song === song) hideTooltip();
      ui.el.remove();
      copy.remove();
      original.removeAttribute('data-lp-original');
    }

    // Chord diagram on hover (mouse) or tap (touch).
    copy.addEventListener('pointerover', (e) => {
      const slot = e.target.closest('.lp-c');
      if (slot && e.pointerType === 'mouse' && prefs.hoverDiagrams) showTooltip(song, slot);
    });
    copy.addEventListener('pointerout', (e) => {
      const slot = e.target.closest('.lp-c');
      if (slot && e.pointerType === 'mouse' && !slot.contains(e.relatedTarget)) hideTooltip();
    });
    copy.addEventListener('click', (e) => {
      const slot = e.target.closest('.lp-c');
      if (!slot) return;
      if (tooltip.slot === slot) hideTooltip();
      else showTooltip(song, slot);
    });

    const song = {
      id,
      original,
      scope,
      signature,
      state,
      copy,
      refresh,
      place,
      dispose,
      diagramFor,
      print: actions.print,
      isVisible: () => site.isVisible(copy),
      setSaved(value) {
        saved = value;
      },
    };

    place();
    refresh();
    if (saved && !carry) ui.flash('گام ذخیره‌شده‌ی شما برای این آهنگ اعمال شد');
    return song;
  }

  // ---------- chord diagram tooltip ----------

  function showTooltip(song, slot) {
    const diagram = song.diagramFor(slot);
    if (!diagram) return hideTooltip();
    if (!tooltip.el) tooltip.el = h('div', { class: 'lp-tooltip', role: 'tooltip', hidden: true, 'data-lp-owned': '' });
    if (!tooltip.el.isConnected) document.body.append(tooltip.el);
    tooltip.slot = slot;
    tooltip.song = song;
    tooltip.el.replaceChildren(diagram);
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
    tooltip.song = null;
    if (tooltip.el) tooltip.el.hidden = true;
  }

  // ---------- tracking the site's sheets ----------

  function songs() {
    return [...tracked.values()].map((entry) => entry.song).filter(Boolean);
  }

  /** The song a control belongs to, or the one on screen. */
  function songFor(el) {
    const all = songs();
    return all.find((song) => el && song.scope.contains(el)) || all.find((song) => song.isVisible()) || null;
  }

  function takeRecent(id) {
    const entry = recent.get(id);
    recent.delete(id);
    return entry && Date.now() - entry.at < RECENT_MS ? entry.state : null;
  }

  async function mount(original, carry) {
    const id = songId();
    tracked.set(original, { status: 'pending' });
    const saved = await storage.getSong(id);
    const entry = tracked.get(original);
    if (!entry || entry.status !== 'pending') return;
    if (!original.isConnected) {
      tracked.delete(original);
      return;
    }
    try {
      const song = createSong(original, { id, saved, carry: carry || takeRecent(id) });
      tracked.set(original, song ? { status: 'ready', signature: song.signature, song } : { status: 'empty', signature: readSheet(original).signature });
      if (song) scheduleScan(0);
    } catch (err) {
      tracked.set(original, { status: 'empty', signature: readSheet(original).signature });
      console.error('[Laminor Pro]', err);
    }
  }

  // The site's "download PDF" (subscriber-only) gets a free print button next to it.
  function addPrintButtons() {
    for (const button of site.pdfButtons(document)) {
      if (!songFor(button)) continue;
      button.setAttribute('data-lp-locked', '');
      const next = button.nextElementSibling;
      if (next && next.classList.contains('lp-site-print')) continue;
      const icon = button.querySelector('svg');
      button.after(
        h(
          'button',
          {
            type: 'button',
            class: `${button.getAttribute('class') || ''} lp-site-print`,
            'data-lp-owned': '',
            onclick: (e) => {
              const song = songFor(e.currentTarget);
              if (song) song.print();
            },
          },
          icon ? icon.cloneNode(true) : null,
          'پرینت / دانلود PDF'
        )
      );
    }
  }

  function scan() {
    if (!started) return;
    for (const [original, entry] of tracked) {
      if (original.isConnected) continue;
      if (entry.song) {
        // The site may render the same song again in a moment; keep the player's choices for it.
        recent.set(entry.song.id, { state: { ...entry.song.state }, at: Date.now() });
        entry.song.dispose();
      }
      tracked.delete(original);
    }
    for (const original of site.findSheets()) {
      const entry = tracked.get(original);
      if (!entry) {
        // Hidden pages are picked up when they are shown, so the URL is theirs.
        if (site.isVisible(original)) mount(original);
        continue;
      }
      if (entry.status === 'pending') continue;
      if (readSheet(original).signature !== entry.signature) {
        // The site re-rendered the sheet with other chords: start over, keeping the player's choices.
        const carry = entry.song ? { ...entry.song.state } : null;
        if (entry.song) entry.song.dispose();
        tracked.delete(original);
        if (site.isVisible(original)) mount(original, carry);
        continue;
      }
      if (entry.song) entry.song.place();
    }
    addPrintButtons();
  }

  let scanTimer = 0;
  function scheduleScan(delay = 120) {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      scan();
    }, delay);
  }

  const OWN = '[data-lp-sheet], [data-lp-owned], .lp-panel';
  const isOwn = (node) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return Boolean(el && el.closest(OWN));
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (isOwn(record.target)) continue;
      if (record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(isOwn)) continue;
      scheduleScan();
      return;
    }
  });

  function applyPrefs() {
    document.documentElement.toggleAttribute('data-lp-hide-locked', Boolean(prefs.hideLocked));
  }

  storage.onChange((newPrefs, songChanged, changes) => {
    if (newPrefs) {
      if (newPrefs.scrollSpeed !== prefs.scrollSpeed) scroller.setSpeed(newPrefs.scrollSpeed);
      prefs = newPrefs;
      applyPrefs();
    }
    for (const song of songs()) {
      const songKey = storage.SONG_PREFIX + song.id;
      const mine = songChanged && changes[songKey];
      if (mine) song.setSaved(changes[songKey].newValue || null);
      if (newPrefs || mine) song.refresh();
    }
  });

  scroller.onChange(() => songs().forEach((song) => song.refresh()));
  if (LP.theme) LP.theme.onChange(() => songs().forEach((song) => song.refresh()));

  document.addEventListener('click', (e) => {
    if (tooltip.slot && !e.target.closest('.lp-c')) hideTooltip();
  });
  window.addEventListener('resize', hideTooltip);
  window.addEventListener('popstate', () => scheduleScan());

  // React "hydrates" the server-rendered page after it arrives; a node of
  // ours where React expects its own would make it throw that part of the
  // page away and render it again. Next.js adds its route announcer once the
  // app has hydrated, so wait for that, then for the page to go idle. The
  // `load` event is no help: slow third-party scripts can hold it back for
  // seconds, and on a warm cache it fires before hydration ends.
  function whenSettled(fn) {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      watcher.disconnect();
      const later = () => setTimeout(fn, 150);
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(later, { timeout: 1000 });
      else setTimeout(later, 100);
    };
    const hydrated = () => document.querySelector('next-route-announcer');
    const watcher = new MutationObserver(() => hydrated() && go());
    if (hydrated()) return go();
    watcher.observe(document.documentElement, { childList: true, subtree: true });
    const fallback = () => setTimeout(go, 1500);
    if (document.readyState === 'complete') fallback();
    else window.addEventListener('load', fallback, { once: true });
    setTimeout(go, 6000);
  }

  storage
    .getPrefs()
    .then((loaded) => {
      prefs = loaded;
      applyPrefs();
      scroller.configure({ speed: prefs.scrollSpeed, commit: (speed) => storage.setPrefs({ scrollSpeed: speed }) });
      // Next.js hides and shows cached pages through their style attribute.
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden'] });
      whenSettled(() => {
        started = true;
        scan();
      });
    })
    .catch((err) => console.error('[Laminor Pro]', err));
})(typeof globalThis !== 'undefined' ? globalThis : this);
