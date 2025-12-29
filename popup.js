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

// Track slug usage to handle duplicates
const slugCounts = new Map();

function getUniqueSlug(text) {
  const baseSlug = generateSlug(text);
  const count = slugCounts.get(baseSlug) || 0;
  slugCounts.set(baseSlug, count + 1);

  // First occurrence has no suffix, subsequent ones get -1, -2, etc.
  return count === 0 ? baseSlug : `${baseSlug}-${count}`;
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

// Copy text to clipboard with visual feedback
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('copied');
    }, 1500);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

// Store ToC data for injection
let tocData = [];
let currentTab = null;

// Main logic
async function init() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('content');
  const tocList = document.getElementById('toc-list');
  const injectBtn = document.getElementById('inject-btn');
  const subtitleEl = document.getElementById('subtitle');
  const tocCountEl = document.querySelector('.toc-count');
  const copyAllBtn = document.getElementById('copy-all');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Check if we're on a Substack edit page
    if (!tab.url || !tab.url.includes('substack.com/publish/post/')) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.textContent = 'Open a Substack post in edit mode first.';
      return;
    }

    // Parse URL for subdomain and post ID
    const { subdomain, postId } = parseSubstackUrl(tab.url);

    if (!postId) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.textContent = 'Could not find post ID in URL.';
      return;
    }

    // Inject content script and get headings
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const { postTitle, headings } = results[0]?.result || { postTitle: '', headings: [] };

    // Update subtitle with post title
    if (postTitle) {
      subtitleEl.textContent = postTitle;
    }

    loadingEl.style.display = 'none';

    if (headings.length === 0) {
      errorEl.style.display = 'flex';
      errorEl.textContent = 'No headings found in this post.';
      return;
    }

    // Show content section
    contentEl.style.display = 'block';
    tocCountEl.textContent = `${headings.length} heading${headings.length === 1 ? '' : 's'}`;

    // Build ToC data and display (using post ID from edit URL)
    // Reset slug counts for each new page load
    slugCounts.clear();
    tocData = headings.map(heading => ({
      text: heading.text,
      url: buildAnchorUrl(subdomain, postId, getUniqueSlug(heading.text))
    }));

    tocData.forEach((item, index) => {
      const li = document.createElement('li');

      const num = document.createElement('span');
      num.className = 'toc-number';
      num.textContent = index + 1;

      const a = document.createElement('a');
      a.href = item.url;
      a.textContent = item.text;
      a.title = item.text;
      a.target = '_blank';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-link';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        copyToClipboard(item.url, copyBtn);
      });

      li.appendChild(num);
      li.appendChild(a);
      li.appendChild(copyBtn);
      tocList.appendChild(li);
    });

    // Enable inject button
    injectBtn.disabled = false;

    // Copy all button handler
    copyAllBtn.addEventListener('click', () => {
      const markdown = tocData.map((item, i) => `${i + 1}. [${item.text}](${item.url})`).join('\n');
      copyToClipboard(markdown, copyAllBtn);
    });

  } catch (err) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'flex';
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

    injectBtn.textContent = 'Done!';
    injectBtn.classList.add('success');
    setTimeout(() => window.close(), 800);

  } catch (err) {
    injectBtn.textContent = 'Error - Try Again';
    injectBtn.disabled = false;
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
