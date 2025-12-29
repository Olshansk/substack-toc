# Chrome Web Store Listing <!-- omit in toc -->

Assets and copy for Chrome Web Store submission.

- [Store Description](#store-description)
- [Short Description (132 chars max)](#short-description-132-chars-max)
- [Required Assets](#required-assets)
  - [Screenshots (1280x800 or 640x400)](#screenshots-1280x800-or-640x400)
  - [Promotional Images](#promotional-images)
- [Category](#category)
- [Permissions Justification](#permissions-justification)

## Store Description

**Substack ToC** generates clickable Table of Contents with anchor links for your Substack posts.

**The Problem**
Substack doesn't provide a built-in way to add a Table of Contents with working anchor links. Long-form writers have to manually create and maintain links to each section.

**The Solution**
This extension automatically:
- Scans your post for headings (h1-h4)
- Generates anchor URLs that link directly to each section
- Injects a formatted ToC into your post with one click

**Features**
- One-click ToC generation
- Preview links before injecting
- Copy individual anchor URLs
- Copy full ToC as markdown
- Handles duplicate headings automatically
- Works with drafts and published posts

**How to Use**
1. Open any Substack post in edit mode
2. Click the extension icon
3. Review the generated ToC
4. Click "Inject into Post"

**Privacy**
This extension:
- Only runs on substack.com
- Does not collect any data
- Does not make any network requests
- All processing happens locally in your browser

## Short Description (132 chars max)

Generate clickable Table of Contents with anchor links for your Substack posts. One-click ToC injection.

## Required Assets

### Screenshots (1280x800 or 640x400)

1. **Extension popup showing ToC** - Show the popup with a real ToC preview
2. **Before/After** - Post without ToC vs. with injected ToC
3. **Copy feature** - Hovering over a link showing the copy button

### Promotional Images

- **Small tile (440x280)** - Logo + "Substack ToC" text
- **Large tile (920x680)** - optional but recommended
- **Marquee (1400x560)** - optional

## Category

Productivity

## Permissions Justification

| Permission | Justification |
|------------|---------------|
| `activeTab` | Required to read headings from the current Substack post and inject the ToC |
| `scripting` | Required to execute content script that extracts headings and injects ToC HTML |

No host permissions needed - extension only activates when user clicks the icon.
