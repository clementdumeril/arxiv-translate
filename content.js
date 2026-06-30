// Content script for arXiv Translate

let isTranslating = false;

// Listen for translation triggers and view mode toggles
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    if (isTranslating) {
      sendResponse({ status: 'already_running' });
      return;
    }
    startTranslation();
    sendResponse({ status: 'started' });
  } else if (request.action === 'toggleViewMode') {
    toggleViewMode(request.hideOriginal);
    sendResponse({ status: 'ok' });
  } else if (request.action === 'printArticle') {
    window.print();
    sendResponse({ status: 'ok' });
  }
});

// Helper to toggle class on body
function toggleViewMode(hideOriginal) {
  if (hideOriginal) {
    document.body.classList.add('arxiv-hide-original');
  } else {
    document.body.classList.remove('arxiv-hide-original');
  }
}

// Load initial settings on page load
chrome.storage.local.get(['autoTranslate', 'geminiKey', 'translateEngine', 'hideOriginal'], (result) => {
  // Apply initial hideOriginal state
  if (result.hideOriginal) {
    toggleViewMode(true);
  }

  // If autoTranslate is enabled, trigger translation
  const engine = result.translateEngine || 'google';
  const hasKey = result.geminiKey && result.geminiKey.trim() !== '';
  
  if (result.autoTranslate && (engine !== 'gemini' || hasKey)) {
    // Wait a brief moment to let MathJax finish rendering
    setTimeout(() => {
      startTranslation();
    }, 1500);
  }
});

async function startTranslation() {
  isTranslating = true;
  
  // 1. Select translatable elements
  const selectors = [
    'p', 
    'li', 
    'h1', 
    'h2', 
    'h3', 
    'h4', 
    'h5', 
    'h6', 
    'figcaption',
    '.ltx_p', 
    '.ltx_title',
    '.ltx_metadata_title',
    '.abstract', 
    '.ltx_abstract'
  ];
  
  const allElements = Array.from(document.querySelectorAll(selectors.join(', ')));
  
  // Filter out bibliography, header, footer, etc.
  const elementsToTranslate = allElements.filter(el => {
    if (el.closest('.ltx_bibliography') || 
        el.closest('footer') || 
        el.closest('header') || 
        el.closest('.ltx_page_footer') ||
        el.closest('.ltx_page_header')) {
      return false;
    }
    
    // Skip if it's already translated or contains translation
    if (el.classList.contains('arxiv-translated-paragraph') || 
        el.querySelector('.arxiv-translated-paragraph')) {
      return false;
    }
    
    // Skip if text is empty or too short
    const text = el.textContent.trim();
    if (text.length < 10 || !/[a-zA-Z]/.test(text)) {
      return false;
    }
    
    return true;
  });

  if (elementsToTranslate.length === 0) {
    showFloatingIndicator('Aucun contenu traduisible trouvé', true);
    isTranslating = false;
    return;
  }

  // 2. Create Floating Indicator
  const indicator = createFloatingIndicator(elementsToTranslate.length);
  indicator.classList.add('show');

  // Get Target Language
  const settings = await chrome.storage.local.get(['targetLang']);
  const targetLang = settings.targetLang || 'fr';

  // 3. Queue processing
  let completedCount = 0;
  let errorCount = 0;
  const CONCURRENCY = 4; // Concurrently translate 4 paragraphs
  
  const queue = [...elementsToTranslate];
  
  async function worker() {
    while (queue.length > 0) {
      const element = queue.shift();
      if (!element) continue;
      
      try {
        await translateElement(element, targetLang);
        completedCount++;
      } catch (err) {
        console.error('Failed to translate element:', err, element);
        errorCount++;
      }
      
      updateFloatingIndicator(indicator, completedCount, elementsToTranslate.length, errorCount);
    }
  }

  // Launch workers
  const workers = Array(Math.min(CONCURRENCY, queue.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);

  // Complete indication
  finishFloatingIndicator(indicator, completedCount, errorCount);
  isTranslating = false;
}

// Translate a single DOM element
async function translateElement(element, targetLang) {
  // 1. Protect Math and HTML tags, getting plain text with placeholders
  const { textToTranslate, mathPlaceholders, tagPlaceholders } = protectElements(element);
  
  if (!textToTranslate.trim()) return;

  // 2. Call background script to translate via selected engine
  const response = await sendMessagePromise({
    action: 'translateText',
    text: textToTranslate,
    targetLang: targetLang
  });

  if (!response || !response.success) {
    throw new Error(response?.error || 'Unknown translation error');
  }

  // 3. Restore HTML tags and MathJax placeholders in the translated text
  const translatedHtml = restoreElements(response.translatedText, tagPlaceholders, mathPlaceholders);

  // 4. Inject bilingual translation in the DOM
  injectTranslation(element, translatedHtml);
}

// Replaces math equations and HTML tags with placeholders to preserve structure
function protectElements(element) {
  const clone = element.cloneNode(true);
  const mathPlaceholders = [];
  const tagPlaceholders = [];
  
  // A. Protect Math Jax elements first
  const mathSelectors = [
    '.ltx_Math', 
    'math', 
    '.MathJax', 
    '.math', 
    'script[type^="math"]', 
    '.MathJax_Display'
  ];
  
  const mathElements = Array.from(clone.querySelectorAll(mathSelectors.join(', ')));
  
  // Only keep top-level math elements (avoid nested replacements)
  const topLevelMath = mathElements.filter(el => {
    let parent = el.parentElement;
    while (parent && parent !== clone) {
      if (mathElements.includes(parent)) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });

  topLevelMath.forEach((mathEl, index) => {
    const placeholderId = `__MATH_PLACEHOLDER_${index}__`;
    
    // Store original markup
    mathPlaceholders.push({
      id: placeholderId,
      outerHTML: mathEl.outerHTML
    });
    
    // Replace math element in cloned DOM with placeholder text node
    const textNode = document.createTextNode(` ${placeholderId} `);
    mathEl.parentNode.replaceChild(textNode, mathEl);
  });

  // B. Protect all remaining HTML tags in the innerHTML
  let htmlString = clone.innerHTML;
  
  let tagIndex = 0;
  // Match any HTML tag: <tag attr="val"> or </tag>
  const tagRegex = /<[^>]+>/g;
  
  htmlString = htmlString.replace(tagRegex, (match) => {
    const placeholderId = `__HTML_TAG_PLACEHOLDER_${tagIndex}__`;
    tagPlaceholders.push({
      id: placeholderId,
      originalTag: match
    });
    tagIndex++;
    return ` ${placeholderId} `;
  });

  return {
    textToTranslate: htmlString,
    mathPlaceholders: mathPlaceholders,
    tagPlaceholders: tagPlaceholders
  };
}

// Restores placeholders back to original HTML tags and Math elements
function restoreElements(translatedText, tagPlaceholders, mathPlaceholders) {
  let result = translatedText;
  
  // 1. Restore HTML tags (e.g. <a>, <strong>, etc.)
  tagPlaceholders.forEach(placeholder => {
    // Create regex matching the placeholder, allowing for potential surrounding spaces or casing shifts
    const escapedId = placeholder.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\s*${escapedId}\\s*`, 'gi');
    
    // Replace with original tag. Note: we do not add spaces around restored tags
    // to preserve tight layout (e.g. "<strong>word</strong>" instead of " <strong> word </strong> ")
    result = result.replace(regex, `${placeholder.originalTag}`);
  });
  
  // 2. Restore Math equations
  mathPlaceholders.forEach(placeholder => {
    const escapedId = placeholder.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\s*${escapedId}\\s*`, 'gi');
    
    // Replace with math markup, keeping a space around equations for spacing
    result = result.replace(regex, ` ${placeholder.outerHTML} `);
  });
  
  return result;
}

// Injects the translated paragraph in the DOM
function injectTranslation(originalElement, translatedHtml) {
  const nextSibling = originalElement.nextElementSibling;
  if (nextSibling && nextSibling.classList.contains('arxiv-translated-paragraph')) {
    nextSibling.innerHTML = translatedHtml;
    return;
  }

  // Create new element for translation
  const translatedElement = document.createElement(originalElement.tagName);
  translatedElement.className = 'arxiv-translated-paragraph';
  translatedElement.innerHTML = translatedHtml;

  // Insert right below the original element
  if (originalElement.nextSibling) {
    originalElement.parentNode.insertBefore(translatedElement, originalElement.nextSibling);
  } else {
    originalElement.parentNode.appendChild(translatedElement);
  }
}

// Promise wrapper for chrome.runtime.sendMessage
function sendMessagePromise(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

// UI Indicators
function createFloatingIndicator(total) {
  const existing = document.getElementById('arxiv-translate-status');
  if (existing) existing.remove();

  const ind = document.createElement('div');
  ind.id = 'arxiv-translate-status';
  ind.className = 'arxiv-translate-indicator';
  ind.innerHTML = `
    <div class="spinner"></div>
    <span class="status-text">Traduction lancée... (0/${total})</span>
  `;
  document.body.appendChild(ind);
  
  ind.offsetHeight; // force reflow
  return ind;
}

function updateFloatingIndicator(ind, current, total, errors) {
  const spinner = ind.querySelector('.spinner');
  const statusText = ind.querySelector('.status-text');
  
  if (spinner && spinner.style.display === 'none') {
    spinner.style.display = 'block';
  }
  
  let errorMsg = errors > 0 ? ` (${errors} échecs)` : '';
  statusText.textContent = `Traduction : ${current}/${total} paragraphes${errorMsg}...`;
}

function finishFloatingIndicator(ind, total, errors) {
  const spinner = ind.querySelector('.spinner');
  const statusText = ind.querySelector('.status-text');
  
  if (spinner) {
    spinner.remove();
  }
  
  const successIcon = document.createElement('span');
  successIcon.className = 'success-icon';
  successIcon.innerHTML = '✓ ';
  ind.insertBefore(successIcon, statusText);

  if (errors > 0) {
    statusText.textContent = `Traduction terminée avec ${errors} erreurs.`;
    ind.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  } else {
    statusText.textContent = 'Traduction terminée avec succès !';
    ind.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  }

  // Remove indicator after 3.5s
  setTimeout(() => {
    ind.classList.remove('show');
    setTimeout(() => ind.remove(), 300);
  }, 3500);
}

function showFloatingIndicator(message, isError = false) {
  const ind = document.createElement('div');
  ind.className = 'arxiv-translate-indicator show';
  ind.innerHTML = `
    <span style="color: ${isError ? '#ef4444' : '#10b981'}">${isError ? '⚠' : '✓'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(ind);
  setTimeout(() => {
    ind.classList.remove('show');
    setTimeout(() => ind.remove(), 300);
  }, 3000);
}
