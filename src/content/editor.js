(function(root) {
  'use strict';

  function extractPost(page = {}) {
    const publishedAbout = page.pageType === 'about' && !page.editable;
    const content = publishedAbout
      ? document.querySelector('.about-page .content-about .body.markup')
      : document.querySelector('.post-editor.markup') || document.querySelector('.ProseMirror[contenteditable="true"]');
    const title = document.querySelector('[data-testid="post-title"]') ||
      document.querySelector('.page-title');
    const headings = Array.from(content?.querySelectorAll('h1, h2, h3, h4') || [], element => {
      const heading = { level: Number(element.tagName[1]), text: element.textContent.trim() };
      if (publishedAbout) heading.anchorId = element.querySelector('.header-anchor[id]')?.id || element.id;
      return heading;
    }).filter(heading => heading.text);
    return {
      postTitle: page.pageType === 'about' ? 'About page' : (title?.value || title?.textContent || '').trim(),
      headings
    };
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
