# arXiv Translate

A Manifest V3 Chrome extension that translates arXiv HTML papers paragraph by paragraph while keeping the LaTeX/MathJax equations and the page's HTML structure intact. It has three interchangeable translation backends, one of which runs fully offline.

There is no screenshot here on purpose; see Limitations.

## Why

A general-purpose translator run over an arXiv paper's HTML breaks it: equations get mangled mid-markup, citation links and formatting tags are lost, and the page structure doesn't survive the round trip. Reading a paper in another language shouldn't cost you the equations.

## How it works

`content.js` does a double tokenization. Before any text goes to the translator, HTML tags and LaTeX/MathJax spans are masked; afterward they are restored identically. The equation you see is the one arXiv rendered, not a re-parsed approximation.

`background.js` handles the translation calls (which also gets around CORS). You pick the backend in the popup:
- Google Translate: free, no key;
- Gemini API: cloud, with your own key;
- Ollama: fully local, offline and private, no key.

Paragraphs are translated 4 at a time (`CONCURRENCY = 4`) rather than the whole page at once or one by one. From the popup you can switch live between a bilingual view and the translation alone.

For PDF export there is a print stylesheet (`@media print`: serif type, standardized margins, page breaks kept away from equations and figures), so the browser's own print dialog turns the translated page into a clean PDF. The extension also intercepts arXiv PDF URLs and offers the native HTML version instead, since that's the only format the translator can work with.

## Status

The extension works (`manifest.json`, `background.js`, `content.js`, `popup.*`, `styles.css`, a full icon set) and comes with a `PRIVACY_POLICY.md`: it only calls the translation backend you pick, and Ollama's is entirely local. It isn't on the Chrome Web Store yet, so for now you load it unpacked (below).

## Limitations

- The free Google Translate backend rate-limits under heavy use. Gemini needs your own API key, and Ollama needs a local install with a running model.
- I haven't tested the tokenizer exhaustively against complex nested LaTeX (multi-line aligned environments, custom macros).
- Only arXiv papers that have a native HTML version are supported. Older, PDF-only listings aren't.
- No before/after screenshot yet. The image used for this project elsewhere turned out, when I looked closely while writing this README, to be an AI-generated store-style mockup (fabricated author names, garbled body text) rather than a capture of the extension, so I removed it. A real screenshot is the next thing to add.

## Install (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions/` (also works in Brave, Edge, Opera).
3. Enable **Developer mode** (top right).
4. **Load unpacked** → select this folder.
5. Pin the extension and open any `arxiv.org` HTML paper.

## Usage

On an arXiv HTML page, open the popup, pick a translation engine and a target language, and run the translation. Then toggle **Hide original text** to read only the translation, or use **Export to PDF** to print it with the academic stylesheet.

## Project layout

```
manifest.json      Manifest V3 config and permissions (Gemini API, Ollama localhost, arXiv)
background.js      Translation API calls (works around CORS) + PDF-URL redirect
content.js          Double tokenization, translation queue, DOM injection
popup.html/js       Engine + language + display settings
styles.css           Injected styles for the translated layout and the print stylesheet
PRIVACY_POLICY.md    What the extension does and does not send anywhere
```
