// set default settings
const DEFAULT_SETTINGS = {
  occupation: "student",
  customPrompt: "",
  summaryType: "key-points",
};

let overlayIframe = null;
let highlighter = null;
let floatingToolbar = null;
let commentBox = null;

// Initialize highlighter when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHighlighter);
} else {
  initHighlighter();
}

function initHighlighter() {
  if (typeof TextHighlighter !== 'undefined') {
    highlighter = new TextHighlighter();
    highlighter.loadHighlights();
  }
  
  if (typeof FloatingToolbar !== 'undefined') {
    floatingToolbar = new FloatingToolbar({
      onHighlight: (color) => {
        if (highlighter) {
          highlighter.createHighlightFromSelection(color);
        }
      },
      onComment: async () => {
        if (highlighter && commentBox) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const highlightData = await highlighter.createHighlightFromSelection('yellow');
            if (highlightData) {
              commentBox.show(rect, highlightData.comment ? [highlightData.comment] : [], highlightData.id);
            }
          }
        }
      },
      onSummarize: () => {
        toggleOverlay(true);
      }
    });
  }
  
  if (typeof CommentBox !== 'undefined') {
    commentBox = new CommentBox({
      onSave: (comments, highlightId) => {
        if (highlightId && highlighter) {
          highlighter.updateComment(highlightId, comments);
        }
      },
      onClose: () => {}
    });
    
    if (highlighter) {
      highlighter.setCommentBoxHandler((rect, comments, highlightId) => {
        commentBox.show(rect, comments, highlightId);
      });
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "TOGGLE_OVERLAY") {
    toggleOverlay(msg.open ?? null);
    sendResponse({ success: true });
  }
  
  if (msg?.type === "CREATE_HIGHLIGHT") {
    if (highlighter) {
      highlighter.createHighlightFromSelection(msg.color);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Highlighter not initialized" });
    }
  }
  
  if (msg?.type === "GET_HIGHLIGHTS") {
    if (highlighter) {
      const highlights = highlighter.getAllHighlights();
      sendResponse({ highlights: highlights });
    } else {
      sendResponse({ highlights: [] });
    }
    return true;
  }
  
  if (msg?.type === "DELETE_HIGHLIGHT") {
    if (highlighter) {
      highlighter.deleteHighlight(msg.highlightId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  
  if (msg?.type === "UPDATE_COMMENT") {
    if (highlighter) {
      highlighter.updateComment(msg.highlightId, msg.comment);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  
  if (msg?.type === "CLEAR_ALL_HIGHLIGHTS") {
    if (highlighter) {
      highlighter.clearAllHighlights();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  
  return true;
});

function toggleOverlay(forceOpen = null) {
  // Close if open and not explicitly asked to open
  if (overlayIframe && forceOpen !== true) {
    overlayIframe.remove();
    overlayIframe = null;
    return;
  }
  // Already open
  if (overlayIframe) return;

  createOverlay();
}

function createOverlay() {
  overlayIframe = document.createElement("iframe");
  overlayIframe.src = chrome.runtime.getURL("overlay.html");
  overlayIframe.allow = 'summarizer; language-model';
  overlayIframe.style.cssText = `
    position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
    border: 0; border-left: 1px solid #e5e7eb; z-index: 2147483647; background: #fff;
    box-shadow: -2px 0 8px rgba(0,0,0,.1);
  `;

  overlayIframe.addEventListener("load", () => {
    // send initial extraction as soon as overlay is ready
    const hasSelection = window.getSelection()?.toString().trim().length > 0;
    const result = (typeof extractContext === "function")
      ? extractContext(hasSelection ? "selection" : "page")
      : (hasSelection ? extractSelection() : extractPage());
    overlayIframe.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: result }, "*");
  });
  
  document.documentElement.appendChild(overlayIframe);
}

function extractSelection() {
  const text = (window.getSelection()?.toString() || "").trim();
  return {
    url: location.href,
    title: document.title,
    paragraphs: [{ text: (text && text.length > 0) ? text : "" }],
    mode: "selection"
  };
}

// Simple extraction (text only)
function extractPage() {
  const containers = document.querySelectorAll("article, main, [role=main]");
  const container = containers[0] || document.body;
  const paragraphs = Array.from(container.querySelectorAll("p"))
    .map(p => p.innerText.trim())
    .filter(t => t.length > 30)
    .map(text => ({ text }));

  return { 
    url: location.href, 
    title: document.title, 
    paragraphs,
    mode: "page"
  };
}

window.addEventListener("message", (e) => {
  if (e.data?.type === "LM_SUMMARY_RESULT") {
    document.getElementById("out").textContent =
      typeof e.data.result === "string" ? e.data.result : String(e.data.result || "");
    _pendingSummarizer = false;
    maybeEnableButtons();
  }

  if (e.data?.type === "LM_SUMMARY_ERROR") {
    document.getElementById("status").textContent = "Error occurred";
    document.getElementById("out").textContent = `Error: ${e.data.error}`;
    _pendingSummarizer = false;
    maybeEnableButtons();
  }
});

// Handle Extraction event
window.addEventListener("message", async (e) => {
  if (e.data.type === "REQUEST_EXTRACTION") {
    let data = (typeof extractContext === "function")
      ? extractContext(e.data.mode === "selection" ? "selection" : "page")
      : (e.data.mode === "selection" ? extractSelection() : extractPage());
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data }, "*");
  }
});

// Handle Summarizer event
window.addEventListener("message", async (e) => {
  if (e.data.type === "REQUEST_SUMMARIZATION") {
    try {
      const summarizer = await makeSummarizer(e.data.summaryLength);
      const result = await summarizer.summarize(e.data.text);
      overlayIframe?.contentWindow?.postMessage({ type: "SUMMARIZER_RESULT", result: result }, "*");
    } catch (err) {
      overlayIframe?.contentWindow?.postMessage({ type: "SUMMARIZER_ERROR", error: err.message || String(err) }, "*");
      return;
    }
  }
});

// Handle Language Model events
window.addEventListener("message", async (e) => {
  if (e.data.type === 'REQUEST_LANGUAGE_MODEL_PROMPT') {
    try {
      const languageModel = await makeLanguageModel();
      const result = await languageModel.prompt(e.data.text);
      overlayIframe?.contentWindow?.postMessage({ type: 'LANGUAGE_MODEL_RESULT', result: result }, '*');
    } catch (err) {
      overlayIframe?.contentWindow?.postMessage({ type: 'LANGUAGE_MODEL_ERROR', error: err.message || String(err) }, '*');
      return;
    }
  }
});

// Handle Prompt-API TL;DR summary
window.addEventListener("message", async (e) => {
  if (e.data?.type === 'REQUEST_LM_SUMMARY') {
    try {
      const languageModel = await makeLanguageModel();
      const result = await languageModel.prompt(e.data.text);
      overlayIframe?.contentWindow?.postMessage({ type: 'LM_SUMMARY_RESULT', result }, '*');
    } catch (err) {
      overlayIframe?.contentWindow?.postMessage({ type: 'LM_SUMMARY_ERROR', error: err.message || String(err) }, '*');
    }
  }
});

// Supported output languages (avoid the warning)
const SUPPORTED_LANGUAGES = new Set(["en", "es", "ja"]);
function pickOutputLang(pref) {
  const l = (pref || navigator.language || "en").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.has(l) ? l : "en";
}

// Get the summary type setting
async function getSummaryType() {
  return await chrome.storage.local.get({ summaryType: DEFAULT_SETTINGS.summaryType }).then((res) => res.summaryType);
}

// Generate the summary context based on occupation and custom prompt
async function getSummaryContext() {
  const { occupation, customPrompt } = await chrome.storage.local.get({
    occupation: DEFAULT_SETTINGS.occupation,
    customPrompt: DEFAULT_SETTINGS.customPrompt,
  });

  return `Summary for a ${occupation}.` + customPrompt.trim();
}

// Create a summarizer instance
async function makeSummarizer(summaryLength) {
  if (!("Summarizer" in self)) throw new Error("Summarizer API not supported in this Chrome.");
  const availability = await Summarizer.availability();
  if (availability === "unavailable") throw new Error("Summarizer Model unavailable on this device/browser.");

  return await Summarizer.create({
    type: await getSummaryType(),
    format: "markdown",
    length: summaryLength,
    sharedContext: await getSummaryContext(),
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const progress = Math.round(e.loaded * 100);
        overlayIframe?.contentWindow?.postMessage({ type: 'SUMMARIZER_PROGRESS', progress: progress }, '*');
      });
    },
  });
}

// Get the language model system prompt
async function getLanguageModelSystemPrompt() {
  if (getLanguageModelSystemPrompt._cache) return getLanguageModelSystemPrompt._cache;

  const url = chrome.runtime.getURL('prompts/language-model-system.md');
  const res = await fetch(url, { cache: 'no-cache' });
  const text = await res.text();

  getLanguageModelSystemPrompt._cache = text;
  return text;
}

// Create a language model instance
async function makeLanguageModel() {
  if (!("LanguageModel" in self)) throw new Error("LanguageModel API not supported in this Chrome.");
  const availability = await LanguageModel.availability();
  if (availability === "unavailable") throw new Error("LanguageModel unavailable on this device/browser.");

  return await LanguageModel.create({
    initialPrompts: [
      { role: 'system', content: await getLanguageModelSystemPrompt() },
    ],
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const progress = Math.round(e.loaded * 100);
        overlayIframe?.contentWindow?.postMessage({ type: 'LANGUAGE_MODEL_PROGRESS', progress: progress }, '*');
      });
    },
  });
}

// --- DOM helpers (add to end of file) ---

function getSelectedElement() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function getCaptionFor(el) {
  const fig = el?.closest("figure, .figure, .ltx_figure");
  const cap = fig?.querySelector("figcaption, .caption, [role=caption], .ltx_caption");
  return cap?.innerText?.trim() || null;
}

function findNearbyElements(el, selectors = "figure, table, svg, canvas, img") {
  if (!el) return [];
  const figure = el.closest?.("figure, .figure, .ltx_figure");
  const region =
    figure ||
    el.closest?.("article, main, [role=main]") ||
    el.parentElement ||
    document.body;

  const elements = [];
  if (figure) {
    elements.push(figure);
    elements.push(...Array.from(figure.querySelectorAll("svg, canvas, img, table")));
    if (figure.previousElementSibling) elements.push(figure.previousElementSibling);
    if (figure.nextElementSibling) elements.push(figure.nextElementSibling);
  } else {
    elements.push(...Array.from(region.querySelectorAll(selectors)).slice(0, 5));
  }
  return Array.from(new Set(elements)).slice(0, 6);
}

function extractElementData(el) {
  const tag = (el.tagName || "").toLowerCase();

  if (tag === "figure" || el.classList?.contains("figure") || el.classList?.contains("ltx_figure")) {
    const visual = el.querySelector("svg, canvas, img, table");
    if (visual) {
      const inner = extractElementData(visual);
      inner.caption = inner.caption || getCaptionFor(visual);
      return inner;
    }
    return { kind: "figure", caption: getCaptionFor(el) || null };
  }

  if (tag === "svg") {
    const caption = getCaptionFor(el);

    const rects = Array.from(el.querySelectorAll("rect"));
    if (rects.length) {
      const labels = Array.from(el.querySelectorAll("text")).map(t => t.textContent.trim());
      const values = rects.map(r => {
        const h = parseFloat(r.getAttribute("height") || "0");
        if (h) return h;
        try { return r.getBBox?.().height || 0; } catch { return 0; }
      });
      if (values.some(v => v > 0)) {
        return { kind: "svg-bar", labels: labels.slice(0, rects.length), values, caption };
      }
    }

    const texts = Array.from(el.querySelectorAll("text")).map(t => t.textContent.trim());
    const pct = texts
      .map(tx => {
        const m = tx.match(/([\d.]+)\s*%/);
        return m ? { label: tx.replace(m[0], "").trim() || null, value: parseFloat(m[1]) } : null;
      })
      .filter(Boolean);
    if (pct.length >= 3) {
      return {
        kind: "svg-pie",
        labels: pct.map(p => p.label || `${p.value}%`),
        values: pct.map(p => p.value),
        caption
      };
    }

    return { kind: "svg", text: texts.join(" "), caption };
  }

  if (tag === "table") {
    const rows = Array.from(el.querySelectorAll("tr")).map(tr =>
      Array.from(tr.querySelectorAll("th,td")).map(td => td.textContent.trim())
    );
    return { kind: "table", rows, caption: getCaptionFor(el) || null };
  }

  if (tag === "canvas") {
    const legend =
      el.parentElement?.querySelector(".legend, [role=legend], ul li")?.innerText?.trim() || null;
    return { kind: "canvas", hint: legend, caption: getCaptionFor(el) || null };
  }

  if (tag === "img") {
    return {
      kind: "image",
      src: el.currentSrc || el.src || null,
      alt: el.alt || el.getAttribute("aria-label") || null,
      caption: getCaptionFor(el) || null
    };
  }

  const inner = el.querySelector?.("svg, canvas, img, table");
  if (inner) return extractElementData(inner);

  return { kind: "unknown", tag, note: "No recognizable visuals found here." };
}

function extractContext(mode /* "page" | "selection" */) {
  const focusEl = mode === "page" ? document.body : (getSelectedElement() || document.body);
  const selectedText = mode === "page" ? "" : (window.getSelection()?.toString().trim() || "");

  const nearby = findNearbyElements(focusEl);
  const graphics = nearby.map(extractElementData);

  const textAround =
    focusEl.closest?.("article, main, [role=main]")?.innerText?.slice(0, 3000) ||
    document.body.innerText.slice(0, 3000) ||
    "";

  return {
    url: location.href,
    title: document.title,
    text: (selectedText || textAround),
    graphics,
    imageCount: graphics.filter(g => g.kind === "image").length,
    mode
  };
}