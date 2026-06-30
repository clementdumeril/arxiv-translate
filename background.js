// Background service worker for arXiv Translate

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translateText') {
    handleTranslation(request.text, request.targetLang)
      .then(translatedText => {
        sendResponse({ success: true, translatedText: translatedText });
      })
      .catch(error => {
        console.error('Translation error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

// Route translation to the correct engine
async function handleTranslation(text, targetLang) {
  const settings = await chrome.storage.local.get(['translateEngine']);
  const engine = settings.translateEngine || 'google'; // default to Google Translate (Free)

  if (engine === 'gemini') {
    return translateWithGemini(text, targetLang);
  } else if (engine === 'ollama') {
    return translateWithOllama(text, targetLang);
  } else {
    return translateWithGoogle(text, targetLang);
  }
}

// 1. Google Translate (Free Web API - keyless)
async function translateWithGoogle(text, targetLang) {
  // Use public client endpoint
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur Google Translate: HTTP ${response.status}`);
  }
  
  const data = await response.json();
  if (data && data[0]) {
    // Google Translate splits translation into segments, join them
    const translatedText = data[0].map(item => item[0]).join('');
    return translatedText;
  }
  
  throw new Error('Réponse invalide de Google Translate.');
}

// 2. Google Gemini API (Cloud - API Key required)
async function translateWithGemini(text, targetLang) {
  const settings = await chrome.storage.local.get(['geminiKey']);
  const apiKey = settings.geminiKey;

  if (!apiKey) {
    throw new Error('Clé API Gemini manquante. Veuillez la configurer dans la popup.');
  }

  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const langNames = {
    fr: 'French (Français)',
    es: 'Spanish (Español)',
    de: 'German (Deutsch)',
    zh: 'Chinese (中文)',
    it: 'Italian (Italiano)',
    pt: 'Portuguese (Português)',
    ja: 'Japanese (日本語)',
    ar: 'Arabic (العربية)'
  };
  const targetLangName = langNames[targetLang] || 'French';

  const systemInstruction = `You are an expert scientific translator. Translate the given text from English into ${targetLangName}.
Follow these strict rules:
1. Keep all placeholders like __HTML_TAG_PLACEHOLDER_\\d+__ and __MATH_PLACEHOLDER_\\d+__ exactly as they are in the source. Do not translate them, do not change their case, and do not remove them.
2. Do not add any conversational greetings, markdown formatting, or explanations. Return ONLY the translated text.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: text }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.1,
        topP: 0.95
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Erreur API Gemini: ${message}`);
  }

  const data = await response.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Réponse vide de l\'API Gemini.');
  }
  
  return candidateText.trim();
}

// 3. Ollama (Local AI on localhost - keyless)
async function translateWithOllama(text, targetLang) {
  const settings = await chrome.storage.local.get(['ollamaModel']);
  const model = settings.ollamaModel || 'gemma2:2b';

  const langNames = {
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    zh: 'Chinese',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    ar: 'Arabic'
  };
  const targetLangName = langNames[targetLang] || 'French';

  const prompt = `You are an expert scientific translator. Translate the following English text into ${targetLangName}.
Keep all placeholders like __HTML_TAG_PLACEHOLDER_X__ and __MATH_PLACEHOLDER_X__ exactly as they are in the source. Do not translate or modify these placeholders.
Do not add conversational text or intro. Return ONLY the translation.

Text to translate:
${text}

Translation:`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur Ollama (HTTP ${response.status}). Vérifiez qu'Ollama est démarré localement et que le modèle '${model}' a été téléchargé.`);
  }

  const data = await response.json();
  const translatedText = data.response;
  if (!translatedText) {
    throw new Error("Réponse vide d'Ollama.");
  }

  return translatedText.trim();
}

// Helper to check if URL is arXiv PDF
function isArxivPdf(url) {
  return url && (url.includes('arxiv.org/pdf/') || url.match(/arxiv\.org\/[a-z\-]+\/\d+\.pdf/i));
}

// Convert PDF URL to HTML URL
function convertPdfToHtml(pdfUrl) {
  try {
    const url = new URL(pdfUrl);
    let path = url.pathname;
    if (path.startsWith('/pdf/')) {
      let id = path.substring(5); // remove '/pdf/'
      if (id.endsWith('.pdf')) {
        id = id.substring(0, id.length - 4);
      }
      return `https://arxiv.org/html/${id}`;
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && isArxivPdf(changeInfo.url)) {
    chrome.action.setBadgeText({ text: 'HTML', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId: tabId });

    // Perform auto-redirect if enabled in settings
    chrome.storage.local.get(['autoRedirect'], (result) => {
      if (result.autoRedirect) {
        const htmlUrl = convertPdfToHtml(changeInfo.url);
        if (htmlUrl) {
          chrome.tabs.update(tabId, { url: htmlUrl });
        }
      }
    });
  } else if (changeInfo.url) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
});
