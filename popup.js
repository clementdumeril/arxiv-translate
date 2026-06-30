document.addEventListener('DOMContentLoaded', () => {
  const autoTranslateCheckbox = document.getElementById('auto-translate');
  const autoRedirectCheckbox = document.getElementById('auto-redirect');
  const hideOriginalCheckbox = document.getElementById('hide-original');
  const targetLangSelect = document.getElementById('target-lang');
  const translateEngineSelect = document.getElementById('translate-engine');
  const geminiKeyInput = document.getElementById('gemini-key');
  const ollamaModelInput = document.getElementById('ollama-model');
  const btnTranslate = document.getElementById('btn-translate');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnHtmlVersion = document.getElementById('btn-html-version');
  const statusMsg = document.getElementById('status-msg');

  const cardGemini = document.getElementById('card-gemini-config');
  const cardOllama = document.getElementById('card-ollama-config');

  // Load saved settings
  chrome.storage.local.get([
    'geminiKey', 
    'targetLang', 
    'autoTranslate', 
    'autoRedirect',
    'hideOriginal',
    'translateEngine',
    'ollamaModel'
  ], (result) => {
    if (result.geminiKey) geminiKeyInput.value = result.geminiKey;
    if (result.targetLang) targetLangSelect.value = result.targetLang;
    if (result.autoTranslate !== undefined) autoTranslateCheckbox.checked = result.autoTranslate;
    if (result.autoRedirect !== undefined) autoRedirectCheckbox.checked = result.autoRedirect;
    if (result.hideOriginal !== undefined) hideOriginalCheckbox.checked = result.hideOriginal;
    if (result.translateEngine) {
      translateEngineSelect.value = result.translateEngine;
    } else {
      translateEngineSelect.value = 'google'; // default to Google Translate
    }
    if (result.ollamaModel) {
      ollamaModelInput.value = result.ollamaModel;
    } else {
      ollamaModelInput.value = 'gemma2:2b'; // default Ollama model
    }
    toggleEngineConfigs(translateEngineSelect.value);
  });

  // Toggle visible config cards
  function toggleEngineConfigs(engine) {
    cardGemini.style.display = engine === 'gemini' ? 'block' : 'none';
    cardOllama.style.display = engine === 'ollama' ? 'block' : 'none';
  }

  // Save settings when changed
  function saveSettings() {
    chrome.storage.local.set({
      geminiKey: geminiKeyInput.value.trim(),
      targetLang: targetLangSelect.value,
      autoTranslate: autoTranslateCheckbox.checked,
      autoRedirect: autoRedirectCheckbox.checked,
      hideOriginal: hideOriginalCheckbox.checked,
      translateEngine: translateEngineSelect.value,
      ollamaModel: ollamaModelInput.value.trim()
    }, () => {
      showStatus('Paramètres sauvegardés ✓');
      
      // Notify content script of layout change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: "toggleViewMode", 
            hideOriginal: hideOriginalCheckbox.checked 
          });
        }
      });
    });
  }

  autoTranslateCheckbox.addEventListener('change', saveSettings);
  autoRedirectCheckbox.addEventListener('change', saveSettings);
  hideOriginalCheckbox.addEventListener('change', saveSettings);
  targetLangSelect.addEventListener('change', saveSettings);
  
  translateEngineSelect.addEventListener('change', () => {
    toggleEngineConfigs(translateEngineSelect.value);
    saveSettings();
  });
  
  geminiKeyInput.addEventListener('input', debounce(saveSettings, 1000));
  ollamaModelInput.addEventListener('input', debounce(saveSettings, 1000));

  // Detect active tab and display relevant buttons
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const activeTab = tabs[0];
    const url = activeTab.url || '';

    if (isArxivPdf(url)) {
      // It's an arXiv PDF, suggest switching to HTML
      btnTranslate.style.display = 'none';
      btnExportPdf.style.display = 'none';
      btnHtmlVersion.style.display = 'block';

      btnHtmlVersion.addEventListener('click', () => {
        const htmlUrl = convertPdfToHtml(url);
        if (htmlUrl) {
          chrome.tabs.update(activeTab.id, { url: htmlUrl });
          window.close(); // Close popup
        }
      });
    } else if (isArxivHtml(url)) {
      // It's an HTML page, translation and export are possible
      btnTranslate.style.display = 'block';
      btnExportPdf.style.display = 'block';
      btnHtmlVersion.style.display = 'none';

      btnTranslate.addEventListener('click', () => {
        btnTranslate.disabled = true;
        btnTranslate.textContent = 'Traduction lancée...';
        chrome.tabs.sendMessage(activeTab.id, { action: "translate" }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus('Erreur: rechargez la page', true);
            btnTranslate.disabled = false;
            btnTranslate.textContent = 'Traduire cet article';
          } else if (response && response.status === 'started') {
            showStatus('Traduction en cours...');
            window.close();
          }
        });
      });

      btnExportPdf.addEventListener('click', () => {
        chrome.tabs.sendMessage(activeTab.id, { action: "printArticle" });
        window.close();
      });
    } else {
      // Not on arXiv
      btnTranslate.style.display = 'block';
      btnTranslate.disabled = true;
      btnTranslate.textContent = 'Non disponible sur cette page';
      btnTranslate.title = 'Cette extension fonctionne uniquement sur les articles HTML arXiv.';
      
      btnExportPdf.style.display = 'none';
    }
  });

  // Helper functions
  function isArxivPdf(url) {
    return url.includes('arxiv.org/pdf/') || url.match(/arxiv\.org\/[a-z\-]+\/\d+\.pdf/i);
  }

  function isArxivHtml(url) {
    return url.includes('arxiv.org/html/') || url.includes('ar5iv.org') || url.includes('ar5iv.labs.arxiv.org');
  }

  function convertPdfToHtml(pdfUrl) {
    try {
      const url = new URL(pdfUrl);
      let path = url.pathname;
      
      // Remove leading slashes and parse
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

  function showStatus(text, isError = false) {
    statusMsg.textContent = text;
    statusMsg.style.color = isError ? '#ef4444' : 'var(--success)';
    statusMsg.classList.add('show');
    setTimeout(() => {
      statusMsg.classList.remove('show');
    }, 2500);
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});
