const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('src/content/editor.js', 'utf8');

function load(document) {
  const context = vm.createContext({ document });
  vm.runInContext(source, context);
  return context;
}

test('extraction trims title and headings, skips blank headings, and survives reinjection', () => {
  const context = load({
    querySelector: selector => selector.includes('post-title') ? { value: ' Draft title ' } : null,
    querySelectorAll: () => [{ tagName: 'H2', textContent: ' Intro ' }, { tagName: 'H3', textContent: '  ' }]
  });
  vm.runInContext(source, context);
  const result = vm.runInContext(readFileSync('src/content/extract.js', 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { postTitle: 'Draft title', headings: [{ level: 2, text: 'Intro' }] });
});

test('extraction handles an empty editor and fallback title', () => {
  const context = load({ querySelector: selector => selector === '.page-title' ? { textContent: ' Title ' } : null, querySelectorAll: () => [] });
  assert.equal(context.SubstackTocEditor.extractPost().postTitle, 'Title');
  context.document.querySelector = () => null;
  assert.equal(context.SubstackTocEditor.extractPost().postTitle, '');
});

test('serialized paste adapter needs no closure and passes both clipboard formats', () => {
  const adapter = load({}).SubstackTocEditor.pasteToc;
  let focused = false;
  let event;
  const editor = { focus: () => { focused = true; }, dispatchEvent: value => { event = value; } };
  const context = vm.createContext({
    document: { querySelector: () => editor },
    DataTransfer: class { data = {}; setData(type, value) { this.data[type] = value; } },
    ClipboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } }
  });
  const paste = vm.runInContext(`(${adapter.toString()})`, context);
  paste({ html: '<ol><li>Hello</li></ol>', text: '1. Hello' });
  assert.equal(focused, true);
  assert.equal(event.type, 'paste');
  assert.equal(event.bubbles, true);
  assert.equal(event.cancelable, true);
  assert.deepEqual(event.clipboardData.data, { 'text/html': '<ol><li>Hello</li></ol>', 'text/plain': '1. Hello' });
});

test('missing editor throws instead of reporting successful injection', () => {
  const context = load({ querySelector: () => null });
  assert.throws(() => context.SubstackTocEditor.pasteToc({ html: '', text: '' }), /Could not find editor/);
});
