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
    setAttribute() {}, remove() { this.removed = true; }
  };
}

async function popup({ url = 'https://example.substack.com/publish/post/123', pasteFails = false, copySucceeds = true } = {}) {
  const ids = new Map();
  const node = id => { if (!ids.has(id)) ids.set(id, element()); return ids.get(id); };
  const events = {};
  const calls = [];
  const clipboard = {};
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
      tabs: { query: async () => [{ id: 7, url }] },
      scripting: { executeScript: async options => {
        calls.push(options);
        if (options.files) return [{ result: { postTitle: 'Draft', headings: [{ level: 1, text: 'A & B' }, { level: 4, text: 'Detail' }] } }];
        if (pasteFails) throw new Error('Could not find editor');
        return [{ result: undefined }];
      } }
    }
  });
  await vm.runInContext(readFileSync('src/popup/popup.js', 'utf8'), context);
  return { node, calls, clipboard, events, context, container: () => copiedContainer };
}

test('popup loads moved extraction files and sends a shared paste payload', async () => {
  const ui = await popup();
  assert.equal(ui.node('subtitle').textContent, 'Draft');
  assert.equal(ui.node('inject-btn').disabled, false);
  assert.deepEqual(Array.from(ui.calls[0].files), ['src/content/editor.js', 'src/content/extract.js']);
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

test('toolbar mounts once, remounts after editor rerender, and uses shared payload', () => {
  const container = element();
  let observe;
  let payload;
  const context = vm.createContext({
    SubstackToc: toc,
    SubstackTocEditor: {
      extractPost: () => ({ headings: [{ level: 2, text: 'A & B' }] }),
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
  container.children[0].listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.match(payload.html, /A &amp; B/);
  assert.equal(payload.text, '1. A & B');
});
