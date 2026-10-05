# Privacy Policy <!-- omit in toc -->

- [Data Collection](#data-collection)
- [How It Works](#how-it-works)
- [Permissions](#permissions)
- [Third Parties](#third-parties)
- [Contact](#contact)
- [Changes](#changes)

**Substack ToC** is a browser extension that generates a Table of Contents for Substack posts.

## Data Collection

This extension does **not** collect or transmit personal data or post content.
It stores only your Numbered/Bulleted list-style preference locally in your browser.
The preference is not synced or sent to any external server.

## How It Works

- The extension runs entirely in your browser
- It reads headings from the Substack post or About page you are viewing or editing
- It generates anchor links using the post URL visible in your browser
- No data is sent to any external server

## Permissions

The extension requests these permissions:

- **activeTab**: To read headings from the current Substack editor tab
- **scripting**: To inject the Table of Contents into the editor
- **storage**: To remember your list-style preference locally for the popup and toolbar
- **Host access (`*://*.substack.com/*`)**: To run the toolbar integration on Substack post and About settings editor pages

Copying runs in response to a button click; the manifest does not request `clipboardWrite`.

These permissions are used solely to provide the extension's functionality.

## Third Parties

This extension does not use analytics, tracking, or any third-party services.

## Contact

For questions, open an issue at: https://github.com/Olshansk/substack-toc

## Changes

Any changes to this policy will be reflected in this document.

*Last updated: October 4, 2026*
