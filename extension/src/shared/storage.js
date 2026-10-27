/*
 * Laminor Pro — settings and saved keys, kept in the browser's extension
 * storage (nothing leaves the browser). Works with both `chrome.*` (Chrome)
 * and `browser.*` (Firefox) since both return promises under Manifest V3.
 */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const ext = root.browser && root.browser.storage ? root.browser : root.chrome;

  const PREFS_KEY = 'prefs';
  const SONG_PREFIX = 'song:';

  const DEFAULT_PREFS = {
    hideLocked: true, // hide the site's own paid-only controls that only open a subscription popup
    showDiagrams: true, // open the fingering guide on every song
    hoverDiagrams: true, // show a chord's diagram when hovering it
    autoCapo: false, // simplify with capo on every song by default
    simplify: false, // simple chords by default
    notation: 'auto', // 'auto' | 'sharp' | 'flat'
    leftHanded: false,
  };

  async function get(keys) {
    try {
      return (await ext.storage.local.get(keys)) || {};
    } catch (err) {
      console.warn('[Laminor Pro] storage read failed', err);
      return {};
    }
  }

  async function getPrefs() {
    const data = await get(PREFS_KEY);
    return { ...DEFAULT_PREFS, ...(data[PREFS_KEY] || {}) };
  }

  async function setPrefs(patch) {
    const prefs = { ...(await getPrefs()), ...patch };
    await ext.storage.local.set({ [PREFS_KEY]: prefs });
    return prefs;
  }

  async function getSong(id) {
    const data = await get(SONG_PREFIX + id);
    return data[SONG_PREFIX + id] || null;
  }

  function saveSong(id, entry) {
    return ext.storage.local.set({ [SONG_PREFIX + id]: { ...entry, savedAt: Date.now() } });
  }

  function removeSong(id) {
    return ext.storage.local.remove(SONG_PREFIX + id);
  }

  /** All saved songs, newest first: [{ id, ...entry }]. */
  async function listSongs() {
    const data = await get(null);
    return Object.keys(data)
      .filter((key) => key.startsWith(SONG_PREFIX))
      .map((key) => ({ id: key.slice(SONG_PREFIX.length), ...data[key] }))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  /** Calls back with (prefs | undefined, songChanged) when storage changes. */
  function onChange(callback) {
    ext.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const prefs = changes[PREFS_KEY] ? { ...DEFAULT_PREFS, ...(changes[PREFS_KEY].newValue || {}) } : undefined;
      const songChanged = Object.keys(changes).some((key) => key.startsWith(SONG_PREFIX));
      callback(prefs, songChanged, changes);
    });
  }

  LP.storage = { DEFAULT_PREFS, SONG_PREFIX, getPrefs, setPrefs, getSong, saveSong, removeSong, listSongs, onChange };
})(typeof globalThis !== 'undefined' ? globalThis : this);
