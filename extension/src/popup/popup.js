/* Laminor Pro — toolbar popup: global options and the list of saved keys. */
(function () {
  'use strict';

  const { storage } = globalThis.LaminorPro;
  const ext = globalThis.browser && globalThis.browser.runtime ? globalThis.browser : globalThis.chrome;
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const fa = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[d]);

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children) if (child != null) node.append(child);
    return node;
  }

  async function renderPrefs() {
    const prefs = await storage.getPrefs();
    for (const input of document.querySelectorAll('[data-pref]')) {
      const name = input.dataset.pref;
      if (input.type === 'checkbox') input.checked = Boolean(prefs[name]);
      else input.value = prefs[name];
    }
  }

  async function renderSongs() {
    const songs = await storage.listSongs();
    const list = document.getElementById('songs');
    document.getElementById('count').textContent = songs.length ? `(${fa(songs.length)})` : '';
    document.getElementById('empty').hidden = songs.length > 0;
    list.replaceChildren(
      ...songs.map((song) => {
        const meta = el('span', { className: 'meta' });
        if (song.artist) meta.append(song.artist, ' · ');
        meta.append('گام ', el('span', { className: 'badge', textContent: song.keyName || '?' }));
        if (song.capo) meta.append(' · کاپو ', el('span', { className: 'badge', textContent: fa(song.capo) }));
        if (song.simplify) meta.append(' · ساده');
        const link = el(
          'a',
          { href: song.url || `https://laminor.org${song.id}`, target: '_blank', rel: 'noopener', title: song.title || song.id },
          el('span', { className: 'title', textContent: song.title || song.id }),
          meta
        );
        const remove = el('button', { className: 'remove', type: 'button', title: 'حذف', textContent: '×' });
        remove.setAttribute('aria-label', `حذف ${song.title || ''}`);
        remove.addEventListener('click', () => storage.removeSong(song.id));
        return el('li', { className: 'song' }, link, remove);
      })
    );
  }

  document.getElementById('version').textContent = 'v' + ext.runtime.getManifest().version;

  for (const input of document.querySelectorAll('[data-pref]')) {
    input.addEventListener('change', () => {
      const value = input.type === 'checkbox' ? input.checked : input.value;
      storage.setPrefs({ [input.dataset.pref]: value });
    });
  }

  storage.onChange((prefs, songChanged) => {
    if (prefs) renderPrefs();
    if (songChanged) renderSongs();
  });

  renderPrefs();
  renderSongs();
})();
