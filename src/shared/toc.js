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
      if (!/^https?:$/.test(parsed.protocol) || !host) return null;
      if (/^\/about\/?$/.test(parsed.pathname)) {
        return { subdomain: host[1], pageType: 'about', editable: false };
      }
      if (/^\/publish\/settings\/edit\/?$/.test(parsed.pathname) && parsed.searchParams.get('bodyField') === 'subscribe_content') {
        return { subdomain: host[1], pageType: 'about', editable: true };
      }
      if (!post) return null;
      return { subdomain: host[1], postId: post[1] };
    } catch {
      return null;
    }
  }

  function buildToc(headings, { subdomain, postId, pageType }) {
    const counts = new Map();
    return headings.map(({ text, level, anchorId }) => {
      const base = generateSlug(text);
      const count = counts.get(base) || 0;
      counts.set(base, count + 1);
      const slug = count === 0 ? base : `${base}-${count}`;
      const url = pageType === 'about'
        ? `https://${subdomain}.substack.com/about#${encodeURIComponent(anchorId || '§' + slug)}`
        : `https://${subdomain}.substack.com/i/${postId}/${slug}`;
      return { text, level, url };
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

  function normalizeMaxDepth(value) {
    return ['1', '2', '3'].includes(String(value)) ? Number(value) : 0;
  }

  // Filter already-built links so hidden headings still count toward duplicate slugs.
  function filterTocByDepth(items, maxDepth) {
    const limit = normalizeMaxDepth(maxDepth);
    if (!limit) return items;
    const depths = computeDepths(items);
    return items.filter((item, index) => depths[index] < limit);
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

  function normalizeListStyle(listStyle) {
    return listStyle === 'bulleted' ? 'bulleted' : 'numbered';
  }

  function renderNestedHtml(items, listStyle = 'numbered') {
    if (!items.length) return '';
    const depths = computeDepths(items);
    const tag = normalizeListStyle(listStyle) === 'bulleted' ? 'ul' : 'ol';
    let html = `<${tag}>`;
    let previousDepth = 0;
    items.forEach((item, index) => {
      const depth = depths[index];
      if (index > 0) {
        if (depth > previousDepth) {
          html += `<${tag}>`;
        } else {
          html += '</li>';
          for (let i = previousDepth; i > depth; i--) html += `</${tag}></li>`;
        }
      }
      html += `<li>${renderLink(item)}`;
      previousDepth = depth;
    });
    html += '</li>';
    for (let i = previousDepth; i > 0; i--) html += `</${tag}></li>`;
    return html + `</${tag}>`;
  }

  function renderIndentedText(items, listStyle = 'numbered') {
    const depths = computeDepths(items);
    const numbers = computeHierarchicalNumbers(depths);
    const bulleted = normalizeListStyle(listStyle) === 'bulleted';
    return items.map((item, i) => `${'  '.repeat(depths[i])}${bulleted ? '-' : numbers[i] + '.'} ${item.text}`).join('\n');
  }

  function createPastePayload(items, listStyle = 'numbered') {
    return {
      html: `<h1>Table of Contents</h1>${renderNestedHtml(items, listStyle)}<p></p>`,
      text: renderIndentedText(items, listStyle)
    };
  }

  const api = {
    normalizeMaxDepth, filterTocByDepth, normalizeListStyle, generateSlug, parseSubstackUrl, buildToc, computeDepths,
    computeHierarchicalNumbers, renderLink, renderNestedHtml,
    renderIndentedText, createPastePayload
  };
  root.SubstackToc = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
