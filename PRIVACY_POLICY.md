# Privacy policy: arXiv Translate

This page describes the privacy policy of the arXiv Translate browser extension.

Last updated: 30 June 2026 (translated from the original French version on 3 November 2026, with no change in content).

## 1. Data collection
- No personal data is collected. The extension does not ask for, collect or store any information that identifies you (name, email address, account identifiers, etc.).
- No intermediate server. The extension talks directly from your browser to the translation service you configured. No server run by the extension's author sees your data.

## 2. Storage of your settings
The settings chosen in the popup (target language, translation engine, local Ollama model name and Gemini API key) are stored on your device with the `chrome.storage.local` API. They stay in your browser and are never sent to the extension's author or to third parties.

## 3. Data sent for translation
To translate the paragraphs of an arXiv paper, the extension reads the text of the active HTML page and sends it to the engine you chose:
- Google Translate (free): the text is sent to Google Translate's public endpoint.
- Google Gemini API: the text is sent directly to the Google Gemini API with your personal API key.
- Ollama (local model): requests go to your own machine (`http://localhost:11434`) and do not leave it.

## 4. Analytics and cookies
The extension uses no tracking cookies, no analytics and no advertising scripts.

## 5. Contact
For any question about this policy, open an issue on the project repository:
[https://github.com/clementdumeril/arxiv-translate/issues](https://github.com/clementdumeril/arxiv-translate/issues)
