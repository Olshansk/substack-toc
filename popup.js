// Generate slug from heading text (matches Substack's algorithm).
// NOTE: Substack's slugs preserve digits — do not strip [0-9].
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Drop punctuation (\w keeps a-z, 0-9, _)
    .replace(/\s+/g, '-')     // Spaces → hyphens
    .replace(/-+/g, '-')      // Collapse repeats
    .replace(/^-|-$/g, '');   // Trim edge hyphens
}

// Compute per-item depth, normalized so the shallowest heading on the page is 0.
function computeDepths(tocData) {
  if (!tocData.length) return [];
  const minLevel = Math.min(...tocData.map(i => i.level));
  return tocData.map(i => Math.max(0, i.level - minLevel));
}

// Hierarchical numbers: [0,1,1,0] -> ["1","1.1","1.2","2"].
function computeHierarchicalNumbers(depths) {
  const counters = [];
  return depths.map(d => {
    counters.length = Math.min(counters.length, d + 1);
    while (counters.length < d + 1) counters.push(0);
    counters[d]++;
    return counters.join('.');
  });
}

// Render tocData as a nested <ol>...</ol> HTML string.
function renderNestedHtml(tocData) {
  if (!tocData.length) return '';
  const depths = computeDepths(tocData);
  let html = '';
  let openDepth = -1;
  tocData.forEach((item, i) => {
    const d = depths[i];
    if (d > openDepth) {
      while (openDepth < d) { html += '<ol>'; openDepth++; }
    } else {
      while (openDepth > d) { html += '</li></ol>'; openDepth--; }
      html += '</li>';
    }
    html += `<li><a href="${item.url}">${item.text}</a>`;
  });
  while (openDepth >= 0) { html += '</li></ol>'; openDepth--; }
  return html;
}

// Render tocData as indented plaintext with hierarchical numbering.
function renderIndentedText(tocData) {
  const depths = computeDepths(tocData);
  const numbers = computeHierarchicalNumbers(depths);
  return tocData.map((item, i) => `${'  '.repeat(depths[i])}${numbers[i]}. ${item.text}`).join('\n');
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

// Copy rich text (HTML + plain text) to clipboard with visual feedback
function copyRichText(html, plainText, button) {
  try {
    // Create a temporary container with the HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Select the content
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Copy using execCommand (reliable for rich text in extensions)
    document.execCommand('copy');

    // Cleanup
    selection.removeAllRanges();
    document.body.removeChild(container);

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
      level: heading.level,
      url: buildAnchorUrl(subdomain, postId, getUniqueSlug(heading.text))
    }));

    const depths = computeDepths(tocData);
    const numbers = computeHierarchicalNumbers(depths);
    const olStack = [tocList];

    tocData.forEach((item, index) => {
      const d = depths[index];

      while (olStack.length - 1 < d) {
        const parent = olStack[olStack.length - 1];
        const lastLi = parent.lastElementChild;
        const nested = document.createElement('ol');
        nested.className = 'toc-nested';
        (lastLi || parent).appendChild(nested);
        olStack.push(nested);
      }
      while (olStack.length - 1 > d) olStack.pop();

      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'toc-row';

      const num = document.createElement('span');
      num.className = 'toc-number';
      num.textContent = numbers[index];

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
        const html = `<a href="${item.url}">${item.text}</a>`;
        copyRichText(html, item.text, copyBtn);
      });

      row.appendChild(num);
      row.appendChild(a);
      row.appendChild(copyBtn);
      li.appendChild(row);
      olStack[olStack.length - 1].appendChild(li);
    });

    // Enable inject button
    injectBtn.disabled = false;

    // Copy all button handler
    copyAllBtn.addEventListener('click', () => {
      const html = renderNestedHtml(tocData);
      const plainText = renderIndentedText(tocData);
      copyRichText(html, plainText, copyAllBtn);
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

// This function runs in the page context — must be self-contained
// (no closures over popup-side helpers).
function injectToc(tocData) {
  const editor = document.querySelector('.ProseMirror');
  if (!editor) {
    alert('Could not find editor');
    return;
  }

  const minLevel = tocData.length ? Math.min(...tocData.map(i => i.level || 1)) : 1;
  const depths = tocData.map(i => Math.max(0, (i.level || 1) - minLevel));

  let nestedOl = '';
  let openDepth = -1;
  tocData.forEach((item, i) => {
    const d = depths[i];
    if (d > openDepth) {
      while (openDepth < d) { nestedOl += '<ol>'; openDepth++; }
    } else {
      while (openDepth > d) { nestedOl += '</li></ol>'; openDepth--; }
      nestedOl += '</li>';
    }
    nestedOl += `<li><a href="${item.url}">${item.text}</a>`;
  });
  while (openDepth >= 0) { nestedOl += '</li></ol>'; openDepth--; }

  const tocHtml = `<h1>Table of Contents</h1>${nestedOl}<p></p>`;

  // Hierarchical numbering for the plaintext fallback.
  const counters = [];
  const plainText = tocData.map((item, i) => {
    const d = depths[i];
    counters.length = Math.min(counters.length, d + 1);
    while (counters.length < d + 1) counters.push(0);
    counters[d]++;
    return `${'  '.repeat(d)}${counters.join('.')}. ${item.text}`;
  }).join('\n');

  editor.focus();

  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/html', tocHtml);
  dataTransfer.setData('text/plain', plainText);

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer
  });

  editor.dispatchEvent(pasteEvent);
}

init();
