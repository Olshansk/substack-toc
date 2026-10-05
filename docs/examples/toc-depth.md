# ToC depth example <!-- omit in toc -->

Keep the full document structure while choosing how much appears in its ToC.
These examples use the extension's shared renderer. The source begins with H2, so H2 counts as the top outline level.

- [All levels](#all-levels)
- [First two levels](#first-two-levels)
- [Top level only](#top-level-only)
- [Manual review](#manual-review)

## All levels

```text
1. About this publication
  1.1. What you receive
    1.1.1. Weekly edition
    1.1.2. Member archive
2. About the author
  2.1. Contact
```

## First two levels

```text
1. About this publication
  1.1. What you receive
2. About the author
  2.1. Contact
```

The same selection with Bulleted format:

```text
- About this publication
  - What you receive
- About the author
  - Contact
```

## Top level only

```text
1. About this publication
2. About the author
```

## Manual review

1. Load this branch as an unpacked extension and refresh the editor tab.
2. Open a disposable post or About-page draft with H2, H3, and H4 headings.
3. Choose **First two levels**; confirm the preview hides H4 and shows the visible/total heading count.
4. Try both Numbered and Bulleted. Confirm Copy All and insertion include exactly the previewed entries.
5. Reopen the popup; confirm style and depth are remembered.
6. Insert with the editor toolbar ToC button; confirm it uses the same settings.
7. Save and reopen the draft; check that Substack preserves the nested list.
8. Switch to **All levels**; confirm the omitted entries return without changing their links.

The depth setting applies when generating or copying a ToC. It does not rewrite an already inserted ToC or remove headings from the document.
