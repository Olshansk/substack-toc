# Substack ToC <!-- omit in toc -->

Generate clickable Table of Contents with anchor links for your Substack posts.

- [What It Does](#what-it-does)
- [Installation](#installation)
  - [From Chrome Web Store](#from-chrome-web-store)
  - [Manual Installation (Developer Mode)](#manual-installation-developer-mode)
- [Usage](#usage)
- [Features](#features)
- [Development](#development)
- [Project Structure](#project-structure)
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

[Install Substack ToC](https://chromewebstore.google.com/detail/gppehidldaogdcnmnkjhdknlkmaigdph)

### Manual Installation (Developer Mode)

Clone the repository:

```bash
git clone https://github.com/Olshansk/substack-toc.git
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `substack-toc` folder

## Usage

1. Open a Substack post in **edit mode**, or open **Settings → Website → About page → Edit**
2. Click the extension icon in your toolbar
3. Preview the generated ToC with clickable links and choose **Numbered** or **Bulleted**
4. Click **Inject into Post** to insert the ToC at your cursor position

You can also:
- Click any link to test it in a new tab
- Use **Copy** to copy an individual linked heading
- Use **Copy All** to copy the formatted ToC, with matching plain text as a fallback
- Click **ToC** beside the list buttons in the editor toolbar to insert directly using your saved list style

## Features

- Extracts h1-h4 headings from your post
- Nests headings beneath their nearest preceding shallower heading, including skipped levels
- Supports numbered or bulleted lists and remembers your choice on this device
- Generates Substack-compatible anchor URLs
- Handles duplicate headings (adds `-1`, `-2` suffixes)
- One-click injection into ProseMirror editor
- Copy individual links or the full formatted ToC
- Works with both published and draft posts in the editor
- Supports About-page editing and preview/copy from the published About page

## Development

Use Node.js 22 or newer, Make, zip, and unzip.
The extension has no runtime or development dependencies, so no npm install step is needed.
The private Node package is named `substack-toc`; the Chrome manifest is the sole source of the release version.

List available commands:

```bash
make help
```

Run unit tests and browser-adapter tests using lightweight test doubles (no browser):

```bash
make dev-test
```

Run tests, validate source and the extracted release ZIP, and check whitespace:

```bash
make dev-check
```

Build a ZIP without changing the version:

```bash
make build-zip
```

When preparing a release, run the checks and choose a version bump interactively:

```bash
make build-release
```

On macOS, if Make is blocked by the Xcode license prompt and Command Line Tools are installed:

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools make dev-check
```

After editing, reload the extension at `chrome://extensions` and refresh the Substack editor tab.
Keep the repository root selected for **Load unpacked**; `manifest.json` remains there.
For a reinstall smoke test, remove the development extension, load the repository root again, refresh an editor tab, and check both popup and toolbar injection in a disposable draft.
Unit tests do not establish compatibility with Substack's live editor or Chrome clipboard behavior.

Store assets and listing copy live in [docs/store/listing.md](docs/store/listing.md).
Submission fields and manual test steps live in [docs/store/submission.md](docs/store/submission.md).
Use the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/446b693b-d8b6-4077-b9b3-e50be55ad3d6/gppehidldaogdcnmnkjhdknlkmaigdph/edit/privacy) to upload a release; build commands do not publish it.

## Project Structure

```text
manifest.json           Chrome entry points, permissions, and release version
icons/                  Extension icons
src/shared/            Pure ToC functions and local list-style preferences
src/content/            Heading extraction, paste adapter, and toolbar entry point
src/popup/              Popup HTML, CSS, and UI entry point
tests/                  Node unit tests and browser-adapter test doubles
scripts/                Package validation and release helpers
makefiles/              Build and development targets
docs/store/             Listing copy, submission details, and screenshots
build/                  Generated release ZIPs (ignored by Git)
```

Both browser entry points reuse `SubstackToc`, `SubstackTocEditor`, and `SubstackTocPreferences`.
The `storage` permission saves only your list-style choice locally; the default is Numbered.
The shared core also exports through CommonJS for Node tests and reuse without a DOM.
Classic scripts keep the extension bundler-free; manifest and popup script order load shared helpers before their consumers.
The paste adapter receives pre-rendered HTML and plain text so Chrome can serialize it without closure dependencies.

## How It Works

Substack uses a predictable anchor URL format:
```text
https://{subdomain}.substack.com/i/{postId}/{slug}
```

About pages use section fragments such as `https://yourname.substack.com/about#%C2%A7why-subscribe`.
The extension recognizes the About settings editor by `bodyField=subscribe_content` and reuses existing heading IDs when copying from the published About page.
Published About pages offer preview and copy; insertion requires opening their editor.

The extension:
1. Extracts `subdomain` and `postId` from the edit URL
2. Generates slugs by lowercasing headings and replacing spaces with hyphens
3. Injects the ToC via a synthetic paste event (how Substack's editor expects content)

## Limitations

- Post insertion requires the post editor; About-page insertion requires the About settings editor
- Published About-page preview excludes navigation, subscription prompts, and the People section
- New or changed heading links work after the post or About page is saved/published
- Slug generation follows Substack's algorithm but edge cases may exist

## License

MIT
