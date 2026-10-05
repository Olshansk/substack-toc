// Toolbar injection script - adds ToC button to Substack editor toolbar
(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__substackTocInjected) return;
  window.__substackTocInjected = true;

  const { parseSubstackUrl, buildToc, createPastePayload } = globalThis.SubstackToc;
  const { extractPost, pasteToc } = globalThis.SubstackTocEditor;

  // Main ToC button click handler
  async function handleTocClick() {
    const post = parseSubstackUrl(window.location.href);
    if (!post || post.editable === false) return;
    const { headings } = extractPost(post);

    if (headings.length === 0) {
      alert('No headings found in this page. Add some headings (H1-H4) first.');
      return;
    }

    try {
      const listStyle = await globalThis.SubstackTocPreferences.loadListStyle();
      pasteToc(createPastePayload(buildToc(headings, post), listStyle));
    } catch (error) {
      alert(error.message);
    }
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
      return handleTocClick();
    });

    return button;
  }

  // Find the list buttons container and inject ToC button
  function injectToolbarButton() {
    const page = parseSubstackUrl(window.location.href);
    if (!page || page.editable === false) return false;
    // Check if we already added the button
    if (document.querySelector('button[aria-label="Table of Contents"]')) {
      return true;
    }

    // Find the numbered list button by its title
    const numberedListBtn = document.querySelector('button[title="Numbered list"]');
    if (!numberedListBtn) {
      return false;
    }

    // The button is in: span > div (container with both list buttons)
    const buttonSpan = numberedListBtn.closest('span[data-state]');
    const listContainer = buttonSpan ? buttonSpan.parentElement : null;

    if (!listContainer) {
      return false;
    }

    // Create and append the ToC button after numbered list
    const tocButton = createTocButton();
    listContainer.appendChild(tocButton);

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
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
