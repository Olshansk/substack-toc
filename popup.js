// Generate slug from heading text (matches Substack's algorithm)
function generateSlug(text) {
  return text
    .toLowerCase()
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

// Main logic
async function init() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const tocList = document.getElementById('toc-list');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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

    const headings = results[0]?.result || [];

    loadingEl.style.display = 'none';

    if (headings.length === 0) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'No headings found in this post.';
      return;
    }

    // Build ToC
    headings.forEach(heading => {
      const slug = generateSlug(heading.text);
      const url = buildAnchorUrl(subdomain, postId, slug);

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = heading.text;
      a.target = '_blank';
      li.appendChild(a);
      tocList.appendChild(li);
    });

  } catch (err) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Error: ' + err.message;
  }
}

init();
