// Generate slug from heading text (matches Substack's algorithm)
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[0-9]/g, '')    // Remove numbers
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Collapse multiple hyphens
    .replace(/^-|-$/g, '');   // Trim hyphens from ends
}

// Extract post ID and subdomain from URL
function parseSubstackUrl(url) {
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

// Store ToC data for injection
let tocData = [];
let currentTab = null;

// Main logic
async function init() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const tocList = document.getElementById('toc-list');
  const injectBtn = document.getElementById('inject-btn');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Check if we're on a Substack edit page
    if (!tab.url || !tab.url.includes('substack.com/publish/post/')) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      errorEl.textContent = 'Open a Substack post in edit mode first.';
      return;
    }

    // Parse URL for subdomain and post ID
    const { subdomain, postId } = parseSubstackUrl(tab.url);

    if (!postId) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      errorEl.textContent = 'Could not find post ID in URL.';
      return;
    }

    // Inject content script and get headings
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const { postTitle, headings } = results[0]?.result || { postTitle: '', headings: [] };

    // Update title
    const titleEl = document.querySelector('h1');
    if (postTitle) {
      titleEl.textContent = `ToC - ${postTitle}`;
    }

    loadingEl.style.display = 'none';

    if (headings.length === 0) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'No headings found in this post.';
      return;
    }

    // Build ToC data and display (using post ID from edit URL)
    tocData = headings.map(heading => ({
      text: heading.text,
      url: buildAnchorUrl(subdomain, postId, generateSlug(heading.text))
    }));

    tocData.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.text;
      a.target = '_blank';
      li.appendChild(a);
      tocList.appendChild(li);
    });

    // Enable inject button
    injectBtn.disabled = false;

  } catch (err) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Error: ' + err.message;
  }
}

// Handle inject button click
document.getElementById('inject-btn').addEventListener('click', async () => {
  if (!currentTab || tocData.length === 0) return;

  const injectBtn = document.getElementById('inject-btn');
  injectBtn.disabled = true;
  injectBtn.textContent = 'Injecting...';

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: injectToc,
      args: [tocData]
    });

    injectBtn.textContent = 'Injected!';
    setTimeout(() => window.close(), 500);

  } catch (err) {
    injectBtn.textContent = 'Error';
    console.error('Inject error:', err);
  }
});

// This function runs in the page context
function injectToc(tocData) {
  // Find the ProseMirror editor
  const editor = document.querySelector('.ProseMirror');
  if (!editor) {
    alert('Could not find editor');
    return;
  }

  // Build ToC HTML
  let tocHtml = '<h1>Table of Contents</h1><ol>';
  tocData.forEach(item => {
    tocHtml += `<li><a href="${item.url}">${item.text}</a></li>`;
  });
  tocHtml += '</ol><p></p>';

  // Focus editor
  editor.focus();

  // Create and dispatch a paste event with HTML content
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

init();
