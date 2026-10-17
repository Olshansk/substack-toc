'use strict';

const {
  normalizeMaxDepth, filterTocByDepth, parseSubstackUrl, buildToc, computeDepths, computeHierarchicalNumbers,
  renderLink, renderNestedHtml, renderIndentedText, createPastePayload
} = globalThis.SubstackToc;
const { loadPreferences, savePreferences } = globalThis.SubstackTocPreferences;

// Copy rich text (HTML + plain text) to clipboard with visual feedback
function copyRichText(html, plainText, button) {
  const container = document.createElement('div');
  const selection = window.getSelection();
  const handleCopy = event => {
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', plainText);
    event.preventDefault();
  };
  try {
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    const range = document.createRange();
    range.selectNodeContents(container);
    selection.removeAllRanges();
    selection.addRange(range);
    document.addEventListener('copy', handleCopy);
    if (!document.execCommand('copy')) throw new Error('Clipboard copy failed');
    const original = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('copied');
    }, 1500);
  } catch (err) {
    document.getElementById('error').style.display = 'flex';
    document.getElementById('error').textContent = 'Could not copy. Please try again.';
    console.error('Copy failed:', err);
  } finally {
    document.removeEventListener('copy', handleCopy);
    selection?.removeAllRanges();
    container.remove();
  }
}

// Store ToC data for injection
let tocData = [];
let currentTab = null;
let canInject = false;
let listStyle = 'numbered';
let maxDepth = 0;

// Main logic
async function init() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('content');
  const preview = document.getElementById('toc-preview');
  const listStyleSelect = document.getElementById('list-style');
  const maxDepthSelect = document.getElementById('max-depth');
  const injectBtn = document.getElementById('inject-btn');
  const subtitleEl = document.getElementById('subtitle');
  const tocCountEl = document.querySelector('.toc-count');
  const copyAllBtn = document.getElementById('copy-all');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    const post = parseSubstackUrl(tab?.url);
    if (!post) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.textContent = 'Open a Substack post editor or About page first.';
      return;
    }

    canInject = post.editable !== false;

    // Inject content script and get headings
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/shared/toc.js', 'src/content/editor.js', 'src/content/extract.js']
    });

    const { postTitle, headings } = results[0]?.result || { postTitle: '', headings: [] };

    // Update subtitle with post title
    if (postTitle) {
      subtitleEl.textContent = postTitle;
    }

    loadingEl.style.display = 'none';

    if (headings.length === 0) {
      errorEl.style.display = 'flex';
      errorEl.textContent = 'No headings found in this page.';
      return;
    }

    // Show content section
    contentEl.style.display = 'block';
    const allTocData = buildToc(headings, post);
    ({ listStyle, maxDepth } = await loadPreferences());
    listStyleSelect.value = listStyle;
    maxDepthSelect.value = String(maxDepth);

    function renderPreview() {
      tocData = filterTocByDepth(allTocData, maxDepth);
      tocCountEl.textContent = tocData.length === allTocData.length
        ? `${tocData.length} heading${tocData.length === 1 ? '' : 's'}`
        : `${tocData.length} of ${allTocData.length} headings`;
      const listTag = listStyle === 'bulleted' ? 'ul' : 'ol';
      const tocList = document.createElement(listTag);
      tocList.id = 'toc-list';
      const depths = computeDepths(tocData);
      const numbers = computeHierarchicalNumbers(depths);
      const listStack = [tocList];

      tocData.forEach((item, index) => {
        const d = depths[index];

        while (listStack.length - 1 < d) {
          const parent = listStack[listStack.length - 1];
          const lastLi = parent.lastElementChild;
          const nested = document.createElement(listTag);
          nested.className = 'toc-nested';
          (lastLi || parent).appendChild(nested);
          listStack.push(nested);
        }
        while (listStack.length - 1 > d) listStack.pop();

        const li = document.createElement('li');
        const row = document.createElement('div');
        row.className = 'toc-row';

        const num = document.createElement('span');
        num.className = 'toc-number';
        num.textContent = listStyle === 'bulleted' ? '•' : numbers[index];

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
          const html = renderLink(item);
          copyRichText(html, item.text, copyBtn);
        });

        row.appendChild(num);
        row.appendChild(a);
        row.appendChild(copyBtn);
        li.appendChild(row);
        listStack[listStack.length - 1].appendChild(li);
      });
      preview.replaceChildren(tocList);
    }
    renderPreview();

    async function updatePreferences() {
      listStyle = listStyleSelect.value;
      maxDepth = normalizeMaxDepth(maxDepthSelect.value);
      renderPreview();
      listStyleSelect.disabled = true;
      maxDepthSelect.disabled = true;
      try {
        await savePreferences({ listStyle, maxDepth });
      } catch (error) {
        errorEl.style.display = 'flex';
        errorEl.textContent = 'Could not save ToC settings. The toolbar will use the previous settings.';
        console.error('Preference error:', error);
      } finally {
        listStyleSelect.disabled = false;
        maxDepthSelect.disabled = false;
      }
    }
    listStyleSelect.addEventListener('change', updatePreferences);
    maxDepthSelect.addEventListener('change', updatePreferences);

    // Enable inject button
    injectBtn.disabled = !canInject;
    injectBtn.textContent = canInject ? 'Inject into ' + (post.pageType === 'about' ? 'About Page' : 'Post') : 'Open the About editor to insert';
    document.querySelector('.hint').textContent = canInject
      ? 'Inserts ToC at cursor position in editor'
      : 'Copy the ToC here, or edit your About page to insert it.';

    // Copy all button handler
    copyAllBtn.addEventListener('click', () => {
      const html = renderNestedHtml(tocData, listStyle);
      const plainText = renderIndentedText(tocData, listStyle);
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
  if (!currentTab || !canInject || tocData.length === 0) return;

  const injectBtn = document.getElementById('inject-btn');
  injectBtn.disabled = true;
  injectBtn.textContent = 'Injecting...';

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: globalThis.SubstackTocEditor.pasteToc,
      args: [createPastePayload(tocData, listStyle)]
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

init();
