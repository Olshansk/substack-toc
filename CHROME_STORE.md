# Chrome Web Store Submission Details

## Single Purpose Description

Generates a Table of Contents with anchor links for Substack posts.

## Detailed Description

**Substack Table of Contents Generator**

Automatically generate and insert a linked Table of Contents into your Substack posts with one click.

**What it does:**
- Scans your draft for headings (H1-H4)
- Generates working anchor links that jump to each section
- Inserts a formatted, clickable ToC directly into your editor
- Copy individual section links or the entire ToC to share

**Why install it:**
Long-form Substack posts need navigation. Readers want to scan topics before committing to read, and jump to sections that interest them. A Table of Contents improves readability, looks professional, and keeps readers engaged longer.

Without this extension, creating anchor links in Substack is tedious—you'd need to publish first, manually copy each section URL, and paste them back into your draft. This extension does it instantly while you're still editing.

**How to use:**
1. Open any Substack post in edit mode
2. Click the "ToC" button in the editor toolbar (next to the list buttons)
3. A formatted Table of Contents appears at your cursor

Works entirely in your browser. No account required, no data collected.

## Permission Justifications

### activeTab

Reads heading elements (H1-H4) from the current Substack editor tab to generate the Table of Contents. The extension needs to access the page DOM to extract heading text and build anchor links.

### scripting

Injects the generated Table of Contents HTML into the Substack post editor. The extension uses chrome.scripting.executeScript to insert the formatted ToC at the user's cursor position.

### Host Permission: *://*.substack.com/*

Required for chrome.scripting.executeScript to inject content scripts into Substack editor pages. The extension only operates on Substack domains where users edit their posts.

## Privacy Practices Tab

### Host permission justification

This extension requires access to substack.com to read headings from the post editor and inject the generated Table of Contents. It only activates on Substack's post editing pages (/publish/post/*) and does not access any other websites or user data.

## Test Instructions

1. Go to https://substack.com and sign in (or create a free account)
2. Click "New post" to create a draft
3. Add a few headings using the toolbar (H1, H2, or H3)
4. Click the extension icon
5. Click "Inject" to insert the Table of Contents into your post

## Privacy Policy URL

https://github.com/olshansky/substack-toc/blob/main/PRIVACY.md

## Category

Productivity

## Language

English
