const { test } = require('node:test');
const assert = require('node:assert/strict');
const toc = require('../src/shared/toc.js');
const post = { subdomain: 'example', postId: '123' };
const headings = levels => levels.map((level, i) => ({ level, text: `Section ${i + 1}` }));

test('slug generation preserves existing digits, underscores, punctuation, and Unicode behavior', () => {
  assert.equal(toc.generateSlug('  Hello, WORLD! 2026 -- test_1  '), 'hello-world-2026-test_1');
  assert.equal(toc.generateSlug('Café & 中文'), 'caf');
  assert.equal(toc.generateSlug('🎉!!!'), '');
});

test('duplicate counts are local to each ToC generation', () => {
  const input = ['Hello', 'Hello!', 'Hello'].map(text => ({ level: 1, text }));
  const expected = ['hello', 'hello-1', 'hello-2'];
  for (let run = 0; run < 2; run++) {
    assert.deepEqual(toc.buildToc(input, post).map(item => item.url.split('/').at(-1)), expected);
  }
  assert.deepEqual(input.map(item => item.text), ['Hello', 'Hello!', 'Hello']);
});

test('editor URL parsing validates origin and numeric post path', () => {
  assert.deepEqual(toc.parseSubstackUrl('https://example.substack.com/publish/post/123?edit=true'), post);
  assert.deepEqual(toc.parseSubstackUrl('https://example.substack.com/publish/post/123/preview'), post);
  for (const url of [undefined, '', 'invalid', 'https://evil.test/substack.com/publish/post/123',
    'https://example.substack.com.evil.test/publish/post/123', 'https://example.substack.com/publish/post/123abc',
    'https://example.substack.com/p/123', 'ftp://example.substack.com/publish/post/123']) {
    assert.equal(toc.parseSubstackUrl(url), null, String(url));
  }
});

test('hierarchy handles missing levels and a deeper first heading without zero numbering', () => {
  const cases = [
    [[1, 2, 2, 1], [0, 1, 1, 0], ['1', '1.1', '1.2', '2']],
    [[1, 4, 2, 3, 1], [0, 1, 1, 2, 0], ['1', '1.1', '1.2', '1.2.1', '2']],
    [[3, 4, 1, 2], [0, 1, 0, 1], ['1', '1.1', '2', '2.1']],
    [[4, 2, 1], [0, 0, 0], ['1', '2', '3']]
  ];
  for (const [levels, depths, numbers] of cases) {
    assert.deepEqual(toc.computeDepths(headings(levels)), depths);
    assert.deepEqual(toc.computeHierarchicalNumbers(depths), numbers);
  }
});

test('rendered links escape text and attribute values', () => {
  const html = toc.renderLink({ text: '<img src=x> & "quotes"', url: 'https://example.test/?a="b"&c=1' });
  assert.equal(html, '<a href="https://example.test/?a=&quot;b&quot;&amp;c=1">&lt;img src=x&gt; &amp; &quot;quotes&quot;</a>');
});

test('nested lists place every list inside a list item and close descending levels', () => {
  const items = toc.buildToc(headings([1, 4, 2, 3, 1]), post);
  const links = items.map(toc.renderLink);
  assert.equal(toc.renderNestedHtml(items), `<ol><li>${links[0]}<ol><li>${links[1]}</li><li>${links[2]}<ol><li>${links[3]}</li></ol></li></ol></li><li>${links[4]}</li></ol>`);
  assert.equal(toc.renderIndentedText(items), '1. Section 1\n  1.1. Section 2\n  1.2. Section 3\n    1.2.1. Section 4\n2. Section 5');
});

test('empty input and paste payload use the same renderers', () => {
  assert.equal(toc.renderNestedHtml([]), '');
  assert.equal(toc.renderIndentedText([]), '');
  assert.deepEqual(toc.computeDepths([]), []);
  const items = toc.buildToc(headings([2, 3]), post);
  assert.deepEqual(toc.createPastePayload(items), {
    html: `<h1>Table of Contents</h1>${toc.renderNestedHtml(items)}<p></p>`,
    text: toc.renderIndentedText(items)
  });
});

test('bulleted HTML and plain text preserve the same hierarchy as numbered lists', () => {
  for (const levels of [[1, 2, 3, 4, 1], [2, 4, 3, 1], [4, 4], []]) {
    const items = toc.buildToc(headings(levels), post);
    assert.equal(toc.renderNestedHtml(items, 'bulleted'), toc.renderNestedHtml(items).replaceAll('<ol>', '<ul>').replaceAll('</ol>', '</ul>'));
    const payload = toc.createPastePayload(items, 'bulleted');
    assert.equal(payload.text, toc.renderIndentedText(items).replace(/^([ ]*)[\d.]+ /gm, '$1- '));
    assert.equal(payload.html, `<h1>Table of Contents</h1>${toc.renderNestedHtml(items, 'bulleted')}<p></p>`);
  }
});

test('invalid or absent list style uses the numbered default', () => {
  const items = toc.buildToc(headings([1, 2]), post);
  for (const style of [undefined, null, '', 'invalid', '<script>']) {
    assert.deepEqual(toc.createPastePayload(items, style), toc.createPastePayload(items));
  }
});

test('About URLs distinguish published pages from the specific About settings editor', () => {
  for (const url of ['https://example.substack.com/about', 'https://example.substack.com/about/#section']) {
    assert.deepEqual(toc.parseSubstackUrl(url), { subdomain: 'example', pageType: 'about', editable: false });
  }
  assert.deepEqual(toc.parseSubstackUrl('https://example.substack.com/publish/settings/edit?title=About%20page&bodyField=subscribe_content'), {
    subdomain: 'example', pageType: 'about', editable: true
  });
  for (const url of ['https://example.substack.com/publish/settings', 'https://example.substack.com/publish/settings/edit?bodyField=welcome_email',
    'https://example.substack.com/publish/settings/edit?title=About%20page', 'https://example.substack.com/about-us', 'https://evil.test/about']) {
    assert.equal(toc.parseSubstackUrl(url), null);
  }
});

test('About links use section fragments, preserve published IDs, and count duplicate draft headings', () => {
  const page = { subdomain: 'example', pageType: 'about' };
  const items = toc.buildToc([
    { level: 2, text: 'Why subscribe?' },
    { level: 2, text: 'Why subscribe?' },
    { level: 3, text: 'Custom heading', anchorId: '§actual-id' }
  ], page);
  assert.deepEqual(items.map(item => item.url), [
    'https://example.substack.com/about#%C2%A7why-subscribe',
    'https://example.substack.com/about#%C2%A7why-subscribe-1',
    'https://example.substack.com/about#%C2%A7actual-id'
  ]);
  assert.equal(toc.buildToc([{ level: 1, text: 'Example' }], post)[0].url, 'https://example.substack.com/i/123/example');
});

test('depth limits count outline levels rather than literal heading tags', () => {
  const items = toc.buildToc(headings([2, 3, 4, 2, 4]), post);
  assert.deepEqual(toc.filterTocByDepth(items, 1).map(item => item.text), ['Section 1', 'Section 4']);
  assert.deepEqual(toc.filterTocByDepth(items, 2).map(item => item.text), ['Section 1', 'Section 2', 'Section 4', 'Section 5']);
  assert.deepEqual(toc.filterTocByDepth(items, 3), items);
  for (const limit of [0, undefined, null, -1, 4, 'bad']) assert.deepEqual(toc.filterTocByDepth(items, limit), items);
  assert.deepEqual(toc.filterTocByDepth([], 1), []);
});

test('filtering preserves duplicate anchors even when the first occurrence is hidden', () => {
  const input = [{ level: 2, text: 'Intro' }, { level: 3, text: 'Setup' }, { level: 2, text: 'Setup' }];
  for (const page of [post, { subdomain: 'example', pageType: 'about' }]) {
    const all = toc.buildToc(input, page);
    const filtered = toc.filterTocByDepth(all, 1);
    assert.equal(filtered[1].url, all[2].url);
    assert.match(filtered[1].url, /setup-1$/);
    assert.equal(all.length, 3);
    for (const style of ['numbered', 'bulleted']) {
      const html = toc.renderNestedHtml(filtered, style);
      assert.equal((html.match(/<li>/g) || []).length, 2);
      assert.ok(html.includes(all[2].url));
    }
  }
});
