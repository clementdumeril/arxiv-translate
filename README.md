# arXiv Translate

A Manifest V3 Chrome extension that translates arXiv HTML papers paragraph by paragraph while keeping the LaTeX/MathJax equations and the page's HTML structure intact. One of its three translation backends runs fully offline.

## How it works

`content.js` masks HTML tags and LaTeX/MathJax spans before any text goes to the translator, then restores them identically. The equation you see is the one arXiv rendered.

`background.js` makes the translation calls (which also gets around CORS). You pick the backend in the popup:
- Google Translate: free, no key;
- Gemini API: your own key;
- Ollama: fully local, offline, no key.

Paragraphs are translated 4 at a time. The popup switches between a bilingual view and the translation alone. A print stylesheet turns the translated page into a clean PDF through the browser's print dialog. arXiv PDF URLs are redirected to the HTML version.

## Install (developer mode)

Not on the Chrome Web Store yet.

1. Clone this repository.
2. Open `chrome://extensions/` (also works in Brave, Edge, Opera) and enable Developer mode.
3. Click Load unpacked and select this folder.
4. Open an arXiv HTML paper, pick an engine and a language in the popup, and run the translation.

The extension only calls the backend you pick; see [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Limitations

- The free Google backend rate-limits under heavy use. Gemini needs your API key, Ollama a local install with a running model.
- I haven't tested the tokenizer exhaustively on complex nested LaTeX (multi-line aligned environments, custom macros).
- Only papers with a native arXiv HTML version work.
- No screenshot yet. The image I used for this project elsewhere was a mockup, not a capture of the extension, so I removed it.
