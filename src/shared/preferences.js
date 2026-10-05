(function(root) {
  'use strict';

  const { normalizeListStyle, normalizeMaxDepth } = root.SubstackToc;

  async function loadPreferences() {
    const { listStyle, maxDepth } = await chrome.storage.local.get(['listStyle', 'maxDepth']);
    return { listStyle: normalizeListStyle(listStyle), maxDepth: normalizeMaxDepth(maxDepth) };
  }

  async function savePreferences({ listStyle, maxDepth }) {
    await chrome.storage.local.set({
      listStyle: normalizeListStyle(listStyle),
      maxDepth: normalizeMaxDepth(maxDepth)
    });
  }

  root.SubstackTocPreferences = { loadPreferences, savePreferences };
})(globalThis);
