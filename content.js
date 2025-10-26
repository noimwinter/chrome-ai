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
let visualizationManager = null;
let savedSelection = null;
let currentVisualizationContainer = null;

// Initialize highlighter when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHighlighter);
} else {
  initHighlighter();
}

function initHighlighter() {
  if (typeof TextHighlighter !== "undefined") {
    highlighter = new TextHighlighter();
    highlighter.loadHighlights();
    
    // Expose debug functions globally (accessible from console)
    window.debugHighlights = {
      checkStorage: async () => {
        if (!highlighter) {
          return;
        }
        
        chrome.storage.local.get([highlighter.storageKey], (result) => {
          const highlights = result[highlighter.storageKey] || [];
          console.table(highlights);
        });
        
        // Show all highlight keys
        chrome.storage.local.get(null, (all) => {
          const keys = Object.keys(all).filter(k => k.startsWith('highlights:'));
        });
      },
      
      clearAll: async () => {
        if (confirm('Clear ALL highlights from storage?')) {
          chrome.storage.local.get(null, (all) => {
            const keys = Object.keys(all).filter(k => k.startsWith('highlights:'));
            chrome.storage.local.remove(keys, () => {
              location.reload();
            });
          });
        }
      },
      
      listHighlights: () => {
        if (!highlighter) {
          return;
        }
        console.table(Array.from(highlighter.highlights.values()).map(h => ({
          id: h.id,
          text: h.text.substring(0, 50) + '...',
          color: h.color,
          hasComment: Array.isArray(h.comment) ? h.comment.length > 0 : !!h.comment
        })));
      }
    };
    
  }

  if (typeof VisualizationManager !== "undefined") {
    visualizationManager = new VisualizationManager();
    visualizationManager.loadVisualizations();
  }

  if (typeof FloatingToolbar !== "undefined") {
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

            const highlightData = await highlighter.createHighlightFromSelection("yellow");
            if (highlightData) {
              commentBox.show(rect, highlightData.comment ? [highlightData.comment] : [], highlightData.id);
            }
          }
        }
      },
      onSummarize: async (currentSelection) => {
        savedSelection = currentSelection;
        if (overlayIframe === null) {
          toggleOverlay(true);
        } else {
          overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: extractContext("selection") }, "*");
        }
      },
      onVisualize: async (currentSelection) => {
        currentVisualizationContainer = await visualizationManager.createVisualizationContainer(currentSelection);
        requestDiagramGeneration(currentSelection.toString());
      }
    });
  }

  if (typeof CommentBox !== "undefined") {
    commentBox = new CommentBox({
      onSave: (comments, highlightId) => {
        if (highlightId && highlighter) {
          highlighter.updateComment(highlightId, comments);
        }
      },
      onClose: () => {},
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

  overlayIframe.style.cssText = `
    position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
    border: 0; border-left: 1px solid #e5e7eb; z-index: 2130000000; background: #fff;
    box-shadow: -2px 0 8px rgba(0,0,0,.1);
  `;

  document.documentElement.appendChild(overlayIframe);
}


window.addEventListener("message", (e) => {
  const { type } = e.data || {};

  if (type === "CLOSE_OVERLAY") {
    overlayIframe?.remove();
    overlayIframe = null;
    savedSelection = null;
  }
  
  if (type === "ENABLE_SUMMARIZE_BUTTON") {
    // Re-enable summarize button when summarization is complete
    if (floatingToolbar) {
      floatingToolbar.enableSummarizeButton();
    }
  }

  if (type === "DISABLE_SUMMARIZE_BUTTON") {
    // Disable summarize button when summarization is in progress
    if (floatingToolbar) {
      floatingToolbar.disableSummarizeButton();
    }
  }
});

window.addEventListener("message", async (e) => {
  // Handle Extraction event
  if (e.data.type === "REQUEST_EXTRACTION") {
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: extractContext(e.data.mode) }, "*");
  }

  // Handle initial extraction request when overlay is ready
  if (e.data.type === "OVERLAY_READY") {
    if (savedSelection) {
      overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: extractContext("selection") }, "*");
    }
    savedSelection = null;
  }
});

// Handle Summarizer event
window.addEventListener("message", async (e) => {
  if (e.data.type === "REQUEST_SUMMARIZATION") {
    try {
      const { summaryType } = await chrome.storage.local.get({ summaryType: DEFAULT_SETTINGS.summaryType });

      let result;
      if (summaryType === "key-points") {
        const summarizer = await makeSummarizer(e.data.summaryLength);
        result = await summarizer.summarize(e.data.text);
      } else {
        const languageModel = await makeLanguageModel(await buildTLDRPrompt(e.data.graphics, e.data.summaryLength));
        result = await languageModel.prompt("text:\n\n" + e.data.text);
      }
      
      overlayIframe?.contentWindow?.postMessage({ type: "SUMMARIZER_RESULT", result: result }, "*");
    } catch (err) {
      overlayIframe?.contentWindow?.postMessage({ type: "SUMMARIZER_ERROR", error: err.message || String(err) }, "*");
      return;
    }
  }
});

// Handle Mermaid event
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "MERMAID_RENDER_RESULT") {
    renderMermaid(msg);
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
        overlayIframe?.contentWindow?.postMessage({ type: "SUMMARIZER_PROGRESS", progress: progress }, "*");
      });
    },
  });
}

// Get the system prompt for diagram generation
async function getDiagramPrompt() {
  if (getDiagramPrompt._cache) return getDiagramPrompt._cache;

  const url = chrome.runtime.getURL("prompts/diagram-system.md");
  const res = await fetch(url, { cache: "no-cache" });
  const text = await res.text();

  getDiagramPrompt._cache = text;
  return text;
}

// Generate visuals context for prompt
function visualsContextForPrompt(graphics = []) {
  const hints = (graphics || [])
    .map(g => {
      if (g.kind === "svg-bar") return `Bar labels: ${g.labels?.join(", ")}`;
      if (g.kind === "svg-pie") return `Pie segments: ${g.labels?.join(", ")}`;
      if (g.kind === "table")  return `Table rows: ${g.rows?.length}`;
      if (g.caption)           return `Caption: ${g.caption}`;
      if (g.alt)               return `Image alt: ${g.alt}`;
      return null;
    })
    .filter(Boolean)
    .join(" | ");
  return hints ? `Also consider visuals: ${hints}` : "";
}

async function buildTLDRPrompt(graphics, summaryLength) {
  const vis = visualsContextForPrompt(graphics);

  const lengthGuideMap = {
    short: "Write a **very concise summary** (1-2 sentences).",
    medium: "Write a **moderately detailed summary** (about 3-5 sentences).",
    long: "Write a **comprehensive summary** (up to 8 sentences) with sufficient context.",
  };
  const lengthGuide = lengthGuideMap[summaryLength] || lengthGuideMap.medium;
  
  const { occupation } = await chrome.storage.local.get({ occupation: DEFAULT_SETTINGS.occupation });
  const { customPrompt } = await chrome.storage.local.get({ customPrompt: DEFAULT_SETTINGS.customPrompt });

  // occupation/customPrompt based sentence construction
  let userContext = "";
  if (occupation || customPrompt) {
    const occText = occupation ? `Assume the reader is a **${occupation}**.` : "";
    const customText = customPrompt
      ? `Additionally, follow this custom instruction: "${customPrompt}".`
      : "";
    userContext = [occText, customText].filter(Boolean).join(" ");
  }

  return [
    "You are a concise assistant.",
    "Write the TL;DR summary in **Markdown format**.",
    "Keep it factual and highlight key outcomes and implications.",
    lengthGuide,
    userContext ? `\n${userContext}` : null,
    vis ? `\nVisual context:\n${vis}` : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Create a language model instance
async function makeLanguageModel(systemPrompt) {
  if (!("LanguageModel" in self)) throw new Error("LanguageModel API not supported in this Chrome.");
  const availability = await LanguageModel.availability();
  if (availability === "unavailable") throw new Error("LanguageModel unavailable on this device/browser.");

  return await LanguageModel.create({
    initialPrompts: [{ role: "system", content: systemPrompt }],
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const progress = Math.round(e.loaded * 100);
        overlayIframe?.contentWindow?.postMessage({ type: "LANGUAGE_MODEL_PROGRESS", progress: progress }, "*");
      });
    },
  });
}

// Send a diagram generation request to the language model
async function requestDiagramGeneration(text) {
  try {
    const languageModel = await makeLanguageModel(await getDiagramPrompt());
    const result = await languageModel.prompt("Generate a Mermaid diagram for the following text:\n\n" + text);

    const mermaidSyntax = result.match(/```mermaid\s*([\s\S]*?)```/i);
    if (!mermaidSyntax) {
      throw new Error("No valid Mermaid syntax found");
    }

    const mermaidCode = mermaidSyntax[1];

    // The content script cannot directly use mermaid.
    chrome.runtime.sendMessage({ type: "MERMAID_RENDER_REQUEST",  mermaidCode });
  } catch (err) {
    console.error("Diagram generation error:", err);
    showDiagramError();
  }
}

// Render Mermaid diagram in visualization container
async function renderMermaid(renderResult) {
  // Re-enable visualize button
  if (floatingToolbar) {
    floatingToolbar.enableVisualizeButton();
  }

  if (!renderResult.success) {
    showDiagramError();
  } else {
    const vizId = currentVisualizationContainer.dataset.vizId;
    await visualizationManager.updateVisualizationContent(vizId, renderResult.output);
  }
}

// Show error message in visualization container
function showDiagramError() {
  const errorDiv = document.createElement("div");
  errorDiv.className = "visualization-error";
  errorDiv.textContent = "Diagram generation failed";

  currentVisualizationContainer.innerHTML = "";
  currentVisualizationContainer.appendChild(errorDiv);

  // Remove after 5 seconds
  setTimeout(() => {
    const vizId = currentVisualizationContainer.dataset.vizId;
    visualizationManager.deleteVisualization(vizId);
    currentVisualizationContainer = null;
    // Re-enable visualize button
    if (floatingToolbar) {
      floatingToolbar.enableVisualizeButton();
    }
  }, 3000);
}

// --- DOM helpers ---

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
  const focusEl = mode === "page" ? document.body : (savedSelection || getSelectedElement());
  const selectedText = mode === "page" ? "" : window.getSelection()?.toString().trim() || "";

  const nearby = findNearbyElements(focusEl);
  const graphics = nearby.map(extractElementData);

  const textAround = focusEl.closest?.("article, main, [role=main]")?.innerText?.slice(0, 3000) || document.body.innerText.slice(0, 3000) || "";

  return {
    url: location.href,
    title: document.title,
    text: selectedText || textAround,
    graphics,
    imageCount: graphics.filter((g) => g.kind === "image").length,
    mode,
  };
}