# Substack ToC <!-- omit in toc -->

Generate clickable Table of Contents with anchor links for your Substack posts.

- [What It Does](#what-it-does)
- [Installation](#installation)
  - [From Chrome Web Store](#from-chrome-web-store)
  - [Manual Installation (Developer Mode)](#manual-installation-developer-mode)
- [Usage](#usage)
- [Features](#features)
- [Development](#development)
- [How It Works](#how-it-works)
- [Limitations](#limitations)
- [License](#license)

## What It Does

Substack doesn't provide a built-in way to add a Table of Contents with working anchor links. This extension:

1. Scans your post for headings (h1-h4)
2. Generates anchor URLs that link directly to each section
3. Lets you inject a formatted ToC into your post with one click

## Installation

### From Chrome Web Store

> Coming soon

### Manual Installation (Developer Mode)

```bash
# Clone the repo
git clone https://github.com/olshansky/substack-toc.git
cd substack-toc
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `substack-toc` folder

## Usage

1. Open any Substack post in **edit mode** (`yourname.substack.com/publish/post/...`)
2. Click the extension icon in your toolbar
3. Preview the generated ToC with clickable links
4. Click **Inject into Post** to insert the ToC at your cursor position

You can also:
- Click any link to test it in a new tab
- Use **Copy** to grab individual anchor URLs
- Use **Copy All** to get the full ToC as markdown

## Features

- Extracts h1-h4 headings from your post
- Generates Substack-compatible anchor URLs
- Handles duplicate headings (adds `-1`, `-2` suffixes)
- One-click injection into ProseMirror editor
- Copy individual links or full markdown ToC
- Works with both published and draft posts

## Development

```bash
# Show available commands
make help

# Validate all extension files exist
make validate

# Create release zip
make zip

# Bump version
make bump-patch  # 1.0.0 -> 1.0.1
make bump-minor  # 1.0.0 -> 1.1.0
```

To test changes:
1. Make your edits
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card

## How It Works

Substack uses a predictable anchor URL format:
```
https://{subdomain}.substack.com/i/{postId}/{slug}
```

The extension:
1. Extracts `subdomain` and `postId` from the edit URL
2. Generates slugs by lowercasing headings and replacing spaces with hyphens
3. Injects the ToC via a synthetic paste event (how Substack's editor expects content)

## Limitations

- Only works in Substack's post editor (not the reader view)
- Anchor links won't work until the post is published
- Slug generation follows Substack's algorithm but edge cases may exist

## License

MIT
