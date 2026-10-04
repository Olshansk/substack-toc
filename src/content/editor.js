(function(root) {
  'use strict';

  function extractPost() {
    const title = document.querySelector('[data-testid="post-title"]') ||
      document.querySelector('.page-title');
    const elements = document.querySelectorAll(
      '.post-editor.markup h1, .post-editor.markup h2, .post-editor.markup h3, .post-editor.markup h4'
    );
    const headings = Array.from(elements, element => ({
      level: Number(element.tagName[1]),
      text: element.textContent.trim()
    })).filter(heading => heading.text);
    return { postTitle: (title?.value || title?.textContent || '').trim(), headings };
  }

  // Serialized by chrome.scripting.executeScript: keep this function self-contained.
  function pasteToc({ html, text }) {
    const editor = document.querySelector('.ProseMirror');
    if (!editor) throw new Error('Could not find editor');
    editor.focus();
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', html);
    clipboardData.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData
    }));
  }

  root.SubstackTocEditor = { extractPost, pasteToc };
})(globalThis);
