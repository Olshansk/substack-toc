// Shared by classic Chrome content scripts, the popup, and Node unit tests.
(function(root) {
  'use strict';

  // Preserve the existing anchor algorithm, including digits and underscores.
  function generateSlug(text) {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function parseSubstackUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.match(/^([a-z0-9-]+)\.substack\.com$/);
      const post = parsed.pathname.match(/^\/publish\/post\/(\d+)(?:\/|$)/);
      if (!/^https?:$/.test(parsed.protocol) || !host || !post) return null;
      return { subdomain: host[1], postId: post[1] };
    } catch {
      return null;
    }
  }

  function buildToc(headings, { subdomain, postId }) {
    const counts = new Map();
    return headings.map(({ text, level }) => {
      const base = generateSlug(text);
      const count = counts.get(base) || 0;
      counts.set(base, count + 1);
      const slug = count === 0 ? base : `${base}-${count}`;
      return { text, level, url: `https://${subdomain}.substack.com/i/${postId}/${slug}` };
    });
  }

  // Nest under the nearest preceding shallower heading, without phantom levels.
  function computeDepths(items) {
    const ancestors = [];
    return items.map(({ level }) => {
      while (ancestors.length && ancestors.at(-1) >= level) ancestors.pop();
      const depth = ancestors.length;
      ancestors.push(level);
      return depth;
    });
  }

  function computeHierarchicalNumbers(depths) {
    const counters = [];
    return depths.map(depth => {
      counters.length = Math.min(counters.length, depth + 1);
      while (counters.length < depth + 1) counters.push(0);
      counters[depth]++;
      return counters.join('.');
    });
  }

  function escapeHtml(text) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, char => entities[char]);
  }

  function renderLink(item) {
    return `<a href="${escapeHtml(item.url)}">${escapeHtml(item.text)}</a>`;
  }

  function renderNestedHtml(items) {
    if (!items.length) return '';
    const depths = computeDepths(items);
    let html = '<ol>';
    let previousDepth = 0;
    items.forEach((item, index) => {
      const depth = depths[index];
      if (index > 0) {
        if (depth > previousDepth) {
          html += '<ol>';
        } else {
          html += '</li>';
          for (let i = previousDepth; i > depth; i--) html += '</ol></li>';
        }
      }
      html += `<li>${renderLink(item)}`;
      previousDepth = depth;
    });
    html += '</li>';
    for (let i = previousDepth; i > 0; i--) html += '</ol></li>';
    return html + '</ol>';
  }

  function renderIndentedText(items) {
    const depths = computeDepths(items);
    const numbers = computeHierarchicalNumbers(depths);
    return items.map((item, i) => `${'  '.repeat(depths[i])}${numbers[i]}. ${item.text}`).join('\n');
  }

  function createPastePayload(items) {
    return {
      html: `<h1>Table of Contents</h1>${renderNestedHtml(items)}<p></p>`,
      text: renderIndentedText(items)
    };
  }

  const api = {
    generateSlug, parseSubstackUrl, buildToc, computeDepths,
    computeHierarchicalNumbers, renderLink, renderNestedHtml,
    renderIndentedText, createPastePayload
  };
  root.SubstackToc = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
