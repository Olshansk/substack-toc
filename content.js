// Content script to extract headings and title from Substack editor
(function() {
  // Get post title (it's a textarea, so use .value)
  const titleEl = document.querySelector('[data-testid="post-title"]') ||
                  document.querySelector('.page-title');
  const postTitle = titleEl ? (titleEl.value || titleEl.textContent || '').trim() : '';

  // Get headings
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

  return { postTitle, headings };
})();
