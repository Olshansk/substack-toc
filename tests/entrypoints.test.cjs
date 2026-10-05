const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const toc = require('../src/shared/toc.js');

function element() {
  return {
    style: {}, children: [], listeners: {}, textContent: '', disabled: true,
    classList: { add() {}, remove() {} },
    appendChild(child) { this.children.push(child); this.lastElementChild = child; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    replaceChildren(...children) { this.children = children; this.lastElementChild = children.at(-1); },
    setAttribute() {}, remove() { this.removed = true; }
  };
}

async function popup({ url = 'https://example.substack.com/publish/post/123', pasteFails = false, copySucceeds = true, savedStyle, savedDepth, saveFails = false } = {}) {
  const ids = new Map();
  const node = id => { if (!ids.has(id)) ids.set(id, element()); return ids.get(id); };
  const events = {};
  const calls = [];
  const clipboard = {};
  let storedStyle = savedStyle;
  let storedDepth = savedDepth;
  let copiedContainer;
  const context = vm.createContext({
    SubstackToc: toc, SubstackTocEditor: { pasteToc() {} },
    setTimeout() {}, console: { error() {} },
    window: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
    document: {
      getElementById: node, querySelector: node,
      createElement: () => { copiedContainer = element(); return copiedContainer; },
      createRange: () => ({ selectNodeContents() {} }), body: element(),
      addEventListener: (name, callback) => { events[name] = callback; },
      removeEventListener: name => { delete events[name]; },
      execCommand: () => {
        if (copySucceeds) events.copy({ clipboardData: { setData: (type, value) => { clipboard[type] = value; } }, preventDefault() {} });
        return copySucceeds;
      }
    },
    chrome: {
      storage: { local: {
        get: async () => ({ listStyle: storedStyle, maxDepth: storedDepth }),
        set: async ({ listStyle, maxDepth }) => {
          if (saveFails) throw new Error('Storage unavailable');
          storedStyle = listStyle;
          storedDepth = maxDepth;
        }
      } },
      tabs: { query: async () => [{ id: 7, url }] },
      scripting: { executeScript: async options => {
        calls.push(options);
        if (options.files) return [{ result: { postTitle: 'Draft', headings: [{ level: 1, text: 'A & B' }, { level: 4, text: 'Detail' }] } }];
        if (pasteFails) throw new Error('Could not find editor');
        return [{ result: undefined }];
      } }
    }
  });
  vm.runInContext(readFileSync('src/shared/preferences.js', 'utf8'), context);
  await vm.runInContext(readFileSync('src/popup/popup.js', 'utf8'), context);
  return { node, calls, clipboard, events, context, container: () => copiedContainer, savedStyle: () => storedStyle, savedDepth: () => storedDepth };
}

test('popup loads moved extraction files and sends a shared paste payload', async () => {
  const ui = await popup();
  assert.equal(ui.node('subtitle').textContent, 'Draft');
  assert.equal(ui.node('inject-btn').disabled, false);
  assert.deepEqual(Array.from(ui.calls[0].files), ['src/shared/toc.js', 'src/content/editor.js', 'src/content/extract.js']);
  await ui.node('inject-btn').listeners.click();
  assert.match(ui.calls[1].args[0].html, /A &amp; B/);
  assert.equal(ui.calls[1].args[0].text, '1. A & B\n  1.1. Detail');
  assert.equal(ui.node('inject-btn').textContent, 'Done!');
});

test('popup rejects unrelated pages before script execution', async () => {
  const ui = await popup({ url: 'https://example.test/' });
  assert.equal(ui.calls.length, 0);
  assert.equal(ui.node('error').style.display, 'flex');
});

test('popup allows retry when Chrome rejects injection', async () => {
  const ui = await popup({ pasteFails: true });
  await ui.node('inject-btn').listeners.click();
  assert.equal(ui.node('inject-btn').textContent, 'Error - Try Again');
  assert.equal(ui.node('inject-btn').disabled, false);
});

test('copy provides both formats and always removes temporary DOM and listener', async () => {
  for (const copySucceeds of [true, false]) {
    const ui = await popup({ copySucceeds });
    ui.node('copy-all').listeners.click();
    assert.equal(ui.container().removed, true);
    assert.equal(ui.events.copy, undefined);
    if (copySucceeds) {
      assert.match(ui.clipboard['text/html'], /A &amp; B/);
      assert.equal(ui.clipboard['text/plain'], '1. A & B\n  1.1. Detail');
      assert.equal(ui.node('copy-all').textContent, 'Copied!');
    } else {
      assert.equal(ui.node('error').textContent, 'Could not copy. Please try again.');
      assert.notEqual(ui.node('copy-all').textContent, 'Copied!');
    }
  }
});

test('toolbar mounts once, remounts after editor rerender, and uses the latest saved format', async () => {
  const container = element();
  let observe;
  let payload;
  let storedStyle = 'numbered';
  let storedDepth = 0;
  const context = vm.createContext({
    SubstackToc: toc,
    SubstackTocPreferences: { loadPreferences: async () => ({ listStyle: storedStyle, maxDepth: storedDepth }) },
    SubstackTocEditor: {
      extractPost: () => ({ headings: [{ level: 2, text: 'A & B' }, { level: 4, text: 'Detail' }] }),
      pasteToc: value => { payload = value; }
    },
    window: { location: { href: 'https://example.substack.com/publish/post/123' } },
    document: {
      readyState: 'complete', body: {}, createElement: element,
      querySelector: selector => selector.includes('aria-label') ? container.children[0] : { closest: () => ({ parentElement: container }) }
    },
    MutationObserver: class { constructor(callback) { observe = callback; } observe() {} }
  });
  const script = readFileSync('src/content/toolbar.js', 'utf8');
  vm.runInContext(script, context);
  vm.runInContext(script, context);
  observe();
  assert.equal(container.children.length, 1);
  container.children = [];
  observe();
  assert.equal(container.children.length, 1);
  await container.children[0].listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.match(payload.html, /A &amp; B/);
  assert.equal(payload.text, '1. A & B\n  1.1. Detail');
  storedStyle = 'bulleted';
  storedDepth = 1;
  await container.children[0].listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.match(payload.html, /<ul>/);
  assert.equal(payload.text, '- A & B');
});


test('saved bullets appear in preview, copy, and injection; switching back persists', async () => {
  const ui = await popup({ savedStyle: 'bulleted' });
  assert.equal(ui.node('list-style').value, 'bulleted');
  assert.equal(ui.node('toc-preview').children[0].children[0].children[0].children[0].textContent, '•');
  ui.node('copy-all').listeners.click();
  assert.match(ui.clipboard['text/html'], /^<ul>/);
  assert.equal(ui.clipboard['text/plain'], '- A & B\n  - Detail');
  await ui.node('inject-btn').listeners.click();
  assert.equal(ui.calls[1].args[0].text, '- A & B\n  - Detail');
  assert.match(ui.calls[1].args[0].html, /<ul>/);
  ui.node('list-style').value = 'numbered';
  await ui.node('list-style').listeners.change();
  assert.equal(ui.savedStyle(), 'numbered');
  assert.equal(ui.node('toc-preview').children.length, 1);
  ui.node('copy-all').listeners.click();
  assert.match(ui.clipboard['text/html'], /^<ol>/);
});

test('unknown stored format defaults to numbered and preference errors stay visible', async () => {
  const ui = await popup({ savedStyle: 'invalid', saveFails: true });
  assert.equal(ui.node('list-style').value, 'numbered');
  ui.node('list-style').value = 'bulleted';
  await ui.node('list-style').listeners.change();
  assert.match(ui.node('error').textContent, /Could not save ToC settings/);
  assert.equal(ui.node('list-style').disabled, false);
  assert.equal(ui.savedStyle(), 'invalid');
});

test('published About page supports preview and copy without offering insertion', async () => {
  const ui = await popup({ url: 'https://example.substack.com/about' });
  assert.equal(ui.node('inject-btn').disabled, true);
  assert.match(ui.node('inject-btn').textContent, /About editor/);
  ui.node('copy-all').listeners.click();
  assert.match(ui.clipboard['text/html'], /about#%C2%A7a-b/);
  await ui.node('inject-btn').listeners.click();
  assert.equal(ui.calls.length, 1);
});

test('About editor supports insertion with About fragments', async () => {
  const ui = await popup({ url: 'https://example.substack.com/publish/settings/edit?bodyField=subscribe_content' });
  assert.equal(ui.node('inject-btn').disabled, false);
  assert.equal(ui.node('inject-btn').textContent, 'Inject into About Page');
  await ui.node('inject-btn').listeners.click();
  assert.match(ui.calls[1].args[0].html, /about#%C2%A7a-b/);
  assert.doesNotMatch(ui.calls[1].args[0].html, /\/i\/undefined/);
});


test('depth selection filters preview, copy and insertion and persists independently of list style', async () => {
  for (const url of ['https://example.substack.com/publish/post/123', 'https://example.substack.com/publish/settings/edit?bodyField=subscribe_content']) {
    const ui = await popup({ url, savedDepth: 1, savedStyle: 'bulleted' });
    assert.equal(ui.node('max-depth').value, '1');
    assert.equal(ui.node('.toc-count').textContent, '1 of 2 headings');
    assert.equal(ui.node('toc-preview').children[0].children.length, 1);
    ui.node('copy-all').listeners.click();
    assert.equal(ui.clipboard['text/plain'], '- A & B');
    await ui.node('inject-btn').listeners.click();
    assert.equal(ui.calls[1].args[0].text, '- A & B');
    ui.node('max-depth').value = '0';
    await ui.node('max-depth').listeners.change();
    assert.equal(ui.savedDepth(), 0);
    assert.equal(ui.savedStyle(), 'bulleted');
    assert.equal(ui.node('.toc-count').textContent, '2 headings');
    ui.node('copy-all').listeners.click();
    assert.equal(ui.clipboard['text/plain'], '- A & B\n  - Detail');
    assert.equal(ui.node('max-depth').disabled, false);
  }
});

test('missing or invalid depth preferences preserve the full outline', async () => {
  for (const savedDepth of [undefined, 'bad', -1, 20]) {
    const ui = await popup({ savedDepth });
    assert.equal(ui.node('max-depth').value, '0');
    assert.equal(ui.node('.toc-count').textContent, '2 headings');
  }
});
