# arXiv Translate

> A Manifest V3 Chrome extension that translates arXiv HTML papers paragraph by paragraph while
> keeping LaTeX/MathJax equations and the page's HTML structure byte-for-byte intact — with three
> interchangeable translation backends, one of them fully offline.

*No screenshot below on purpose: the one previously used for this project turned out to be an
AI-generated mockup with garbled text, not a real capture (see Limitations). Pulled rather than
published here.*

## Problem

A naive translator that runs over an arXiv paper's HTML breaks it: LaTeX/MathJax equations get
mangled mid-markup, citation links and formatting tags get lost, and the page structure doesn't
survive the round trip. Reading papers in a non-native language shouldn't mean losing the equations.

## Approach

- **Double tokenization** (`content.js`): HTML tags and LaTeX/MathJax spans are masked before the
  text is sent to translation, then restored identically afterward — the equation a reader sees is
  the exact one arXiv rendered, not a re-parsed approximation.
- **Three interchangeable backends** (`background.js`, picked in the popup): Google Translate
  (free, keyless), Gemini API (cloud, brings your own key), and Ollama (fully local — offline,
  private, no key).
- **Bounded concurrency**: translates 4 paragraphs at a time (`CONCURRENCY = 4`), not the whole
  page at once and not one paragraph at a time.
- **Bilingual or translated-only display**, toggled live from the popup.
- **Academic PDF export**: a dedicated print stylesheet (`@media print`, serif type, standardised
  margins, page breaks kept clear of equations and figures) turns the translated page into a clean
  PDF via the browser's own print dialog.
- **arXiv PDF → HTML redirect**: intercepts arXiv PDF URLs and offers the native HTML version,
  since that's what the translator can actually work with.

## What's real

A working Manifest V3 extension (`manifest.json`, `background.js`, `content.js`, `popup.*`,
`styles.css`), a full icon set, and a `PRIVACY_POLICY.md` — the extension calls only the
translation backend you pick, and Ollama's is entirely local. Not yet published on the Chrome Web
Store; installing today means loading it unpacked (below).

## Limitations

- The free Google Translate backend rate-limits under heavy use; Gemini needs your own API key;
  Ollama needs a local install and a running model.
- Complex nested LaTeX (multi-line aligned environments, custom macros) is not exhaustively tested
  against the tokenizer.
- Only arXiv pages that have a native HTML version are supported — older, PDF-only listings aren't.
- No before/after screenshot yet. The image used for this project elsewhere turned out, on a closer
  look while writing this README, to be an AI-generated store-style mockup (fabricated author
  names, garbled body text) rather than a real capture of the extension — so it's been removed
  rather than kept. A genuine screenshot is the next thing to add here, not a cleanup detail.

## Install (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions/` (also works in Brave, Edge, Opera).
3. Enable **Developer mode** (top right).
4. **Load unpacked** → select this folder.
5. Pin the extension and open any `arxiv.org` HTML paper.

## Try it

On an arXiv HTML page: open the popup, pick a translation engine and target language, run the
translation, then toggle **Hide original text** to read the translated version alone, or
**Export to PDF** to print it with the academic stylesheet.

## Project layout

```
manifest.json      Manifest V3 config and permissions (Gemini API, Ollama localhost, arXiv)
background.js      Translation API calls (works around CORS) + PDF-URL redirect
content.js          Double tokenization, translation queue, DOM injection
popup.html/js       Engine + language + display settings
styles.css           Injected styles for the translated layout and the print stylesheet
PRIVACY_POLICY.md    What the extension does and does not send anywhere
```
