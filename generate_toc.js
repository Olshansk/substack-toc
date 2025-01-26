function generateTableOfContents() {
  const headers = document.querySelectorAll(
    "h1.header-anchor-post, h1:not(.header-anchor-post)"
  );

  const title =
    document.title.match(/Editing "(.*?)" -/)?.[1] || document.title;
  const postSlug = title
    .toLowerCase()
    .replace(/[`'"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  const tocContainer = document.createElement("nav");
  tocContainer.className = "table-of-contents";
  tocContainer.style.cssText =
    "margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;";

  const tocTitle = document.createElement("h2");
  tocTitle.textContent = "Table of Contents";
  tocTitle.style.marginTop = "0";
  tocContainer.appendChild(tocTitle);

  const ol = document.createElement("ol");
  ol.style.cssText = "margin: 0; padding-left: 20px;";

  headers.forEach((header) => {
    const headerText = header.childNodes[0].textContent.trim();
    const headerSlug = headerText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const baseUrl = `${window.location.origin}/p/${postSlug}?open=false`;
    const href = `${baseUrl}#§${headerSlug}`;

    const li = document.createElement("li");
    li.style.margin = "8px 0";

    const a = document.createElement("a");
    a.href = href;
    a.textContent = headerText;
    a.style.textDecoration = "none";
    a.style.color = "#333";

    a.onmouseover = () => (a.style.textDecoration = "underline");
    a.onmouseout = () => (a.style.textDecoration = "none");

    li.appendChild(a);
    ol.appendChild(li);
  });

  tocContainer.appendChild(ol);

  const firstHeader = headers[0];
  if (firstHeader && firstHeader.parentNode) {
    firstHeader.parentNode.insertBefore(tocContainer, firstHeader.nextSibling);
  }
}

if (document.readyState === "complete") {
  generateTableOfContents();
} else {
  window.addEventListener("load", generateTableOfContents);
}
