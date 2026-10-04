(function(root) {
  'use strict';

  const { normalizeListStyle } = root.SubstackToc;

  async function loadListStyle() {
    const { listStyle } = await chrome.storage.local.get('listStyle');
    return normalizeListStyle(listStyle);
  }

  async function saveListStyle(listStyle) {
    await chrome.storage.local.set({ listStyle: normalizeListStyle(listStyle) });
  }

  root.SubstackTocPreferences = { loadListStyle, saveListStyle };
})(globalThis);
