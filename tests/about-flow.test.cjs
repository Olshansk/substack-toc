const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const fixture = require('./fixtures/about-editor.json');
const toc = require('../src/shared/toc.js');

test('issue #4: reported About editor URL extracts headings and sends About links in both list formats', () => {
  let received;
  const editor = {
    querySelectorAll(selector) {
      assert.equal(selector, 'h1, h2, h3, h4');
      return fixture.headings.map(({ level, text }) => ({ tagName: `H${level}`, textContent: text }));
    },
    focus() {},
    dispatchEvent(event) { received = event; }
  };
  const context = vm.createContext({
    URL, location: { href: fixture.url },
    document: {
      querySelector: selector => ['.ProseMirror[contenteditable="true"]', '.ProseMirror'].includes(selector) ? editor : null
    },
    DataTransfer: class { data = {}; setData(type, value) { this.data[type] = value; } },
    ClipboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } }
  });
  let result;
  for (const file of ['src/shared/toc.js', 'src/content/editor.js', 'src/content/extract.js']) {
    result = vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
  assert.equal(result.postTitle, 'About page');
  assert.deepEqual(JSON.parse(JSON.stringify(result.headings)), fixture.headings);
  const items = toc.buildToc(result.headings, toc.parseSubstackUrl(fixture.url));
  assert.equal(items[0].url, 'https://zimberdvar.substack.com/about#%C2%A7why-subscribe');
  const paste = vm.runInContext(`(${context.SubstackTocEditor.pasteToc.toString()})`, context);
  for (const style of ['numbered', 'bulleted']) {
    paste(toc.createPastePayload(items, style));
    assert.equal(received.type, 'paste');
    const html = received.clipboardData.data['text/html'];
    assert.equal((html.match(/<li>/g) || []).length, 5);
    assert.ok(html.includes(items[0].url));
    assert.doesNotMatch(html, /\/i\/undefined/);
    const listTag = style === 'bulleted' ? 'ul' : 'ol';
    assert.match(html, new RegExp(`<li><a[^>]+>How to print or save to PDF\\?</a><${listTag}>`));
    assert.equal(received.clipboardData.data['text/plain'], toc.renderIndentedText(items, style));
  }
});

test('issue #4: About-looking title or redirect cannot turn another settings editor into an About page', () => {
  const url = new URL(fixture.url);
  for (const field of ['welcome_email', 'description', '']) {
    url.searchParams.set('bodyField', field);
    assert.equal(toc.parseSubstackUrl(url.href), null);
  }
});
