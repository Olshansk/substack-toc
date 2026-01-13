// Toolbar injection script - adds ToC button to Substack editor toolbar
(function() {
  'use strict';

  console.log('[ToC] Content script loaded');

  // Prevent multiple injections
  if (window.__substackTocInjected) return;
  window.__substackTocInjected = true;

  console.log('[ToC] Initializing toolbar injection');

  // Generate slug from heading text (matches Substack's algorithm)
  function generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[0-9]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Track slug usage to handle duplicates
  function getUniqueSlug(text, slugCounts) {
    const baseSlug = generateSlug(text);
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);
    return count === 0 ? baseSlug : `${baseSlug}-${count}`;
  }

  // Extract headings from editor
  function extractHeadings() {
    const headings = [];
    const selector = '.post-editor.markup h1, .post-editor.markup h2, .post-editor.markup h3, .post-editor.markup h4';
    const elements = document.querySelectorAll(selector);

    elements.forEach(el => {
      const text = el.textContent.trim();
      if (text) {
        headings.push({ level: parseInt(el.tagName[1]), text });
      }
    });

    return headings;
  }

  // Parse URL for subdomain and post ID
  function parseSubstackUrl() {
    const url = window.location.href;
    const urlObj = new URL(url);
    const subdomain = urlObj.hostname.split('.')[0];
    const postIdMatch = urlObj.pathname.match(/\/publish\/post\/(\d+)/);
    const postId = postIdMatch ? postIdMatch[1] : null;
    return { subdomain, postId };
  }

  // Build anchor URL
  function buildAnchorUrl(subdomain, postId, slug) {
    return `https://${subdomain}.substack.com/i/${postId}/${slug}`;
  }

  // Inject ToC into editor
  function injectToc(tocData) {
    const editor = document.querySelector('.ProseMirror');
    if (!editor) {
      alert('Could not find editor');
      return;
    }

    let tocHtml = '<h1>Table of Contents</h1><ol>';
    tocData.forEach(item => {
      tocHtml += `<li><a href="${item.url}">${item.text}</a></li>`;
    });
    tocHtml += '</ol><p></p>';

    editor.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/html', tocHtml);
    dataTransfer.setData('text/plain', tocData.map((item, i) => `${i + 1}. ${item.text}`).join('\n'));

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });

    editor.dispatchEvent(pasteEvent);
  }

  // Main ToC button click handler
  function handleTocClick() {
    const headings = extractHeadings();

    if (headings.length === 0) {
      alert('No headings found in this post. Add some headings (H1-H4) first.');
      return;
    }

    const { subdomain, postId } = parseSubstackUrl();

    if (!postId) {
      alert('Could not find post ID in URL. Make sure you are editing a post.');
      return;
    }

    const slugCounts = new Map();
    const tocData = headings.map(heading => ({
      text: heading.text,
      url: buildAnchorUrl(subdomain, postId, getUniqueSlug(heading.text, slugCounts))
    }));

    injectToc(tocData);
  }

  // Create the ToC button element
  function createTocButton() {
    const button = document.createElement('button');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', 'Table of Contents');
    button.setAttribute('title', 'Insert Table of Contents');
    button.setAttribute('data-orientation', 'horizontal');
    button.setAttribute('data-radix-collection-item', '');
    // Use text button style like "Style", "Button", "More"
    button.className = 'pencraft pc-reset pencraft buttonBase-GK1x3M buttonText-X0uSmG buttonStyle-r7yGCK priority_tertiary-rlke8z size_sm-G3LciD';
    button.textContent = 'ToC';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleTocClick();
    });

    return button;
  }

  // Find the list buttons container and inject ToC button
  function injectToolbarButton() {
    // Check if we already added the button
    if (document.querySelector('button[aria-label="Table of Contents"]')) {
      return true;
    }

    // Find the numbered list button by its title
    const numberedListBtn = document.querySelector('button[title="Numbered list"]');
    if (!numberedListBtn) {
      console.log('[ToC] Numbered list button not found yet');
      return false;
    }

    console.log('[ToC] Found numbered list button:', numberedListBtn);

    // The button is in: span > div (container with both list buttons)
    const buttonSpan = numberedListBtn.closest('span[data-state]');
    const listContainer = buttonSpan ? buttonSpan.parentElement : null;

    if (!listContainer) {
      console.log('[ToC] Could not find list container');
      return false;
    }

    console.log('[ToC] Found list container:', listContainer);

    // Create and append the ToC button after numbered list
    const tocButton = createTocButton();
    listContainer.appendChild(tocButton);

    console.log('[ToC] Button injected successfully');
    return true;
  }

  // Observe DOM changes to inject button when toolbar appears
  function setupObserver() {
    const observer = new MutationObserver(() => {
      // Always try to inject - the button might have been removed by React re-render
      injectToolbarButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Try immediately
    injectToolbarButton();

    // Also use interval as fallback for any edge cases
    setInterval(() => {
      if (!document.querySelector('button[aria-label="Table of Contents"]')) {
        injectToolbarButton();
      }
    }, 1000);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
