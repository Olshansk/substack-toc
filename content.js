// Content script to extract headings from Substack editor
(function() {
  const headings = [];
  const selector = '.post-editor.markup h1, .post-editor.markup h2, .post-editor.markup h3, .post-editor.markup h4';
  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      headings.push({
        level: parseInt(el.tagName[1]),
        text: text
      });
    }
  });

  return headings;
})();
