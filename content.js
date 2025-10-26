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
          console.log('❌ Highlighter not initialized');
          return;
        }
        
        console.log('🔍 Checking storage...');
        console.log('Storage Key:', highlighter.storageKey);
        console.log('Current URL:', window.location.href);
        
        chrome.storage.local.get([highlighter.storageKey], (result) => {
          const highlights = result[highlighter.storageKey] || [];
          console.log(`✅ Found ${highlights.length} highlights in storage`);
          console.table(highlights);
        });
        
        // Show all highlight keys
        chrome.storage.local.get(null, (all) => {
          const keys = Object.keys(all).filter(k => k.startsWith('highlights:'));
          console.log(`📦 Total highlight keys in storage: ${keys.length}`);
          console.log('All keys:', keys);
        });
      },
      
      clearAll: async () => {
        if (confirm('Clear ALL highlights from storage?')) {
          chrome.storage.local.get(null, (all) => {
            const keys = Object.keys(all).filter(k => k.startsWith('highlights:'));
            chrome.storage.local.remove(keys, () => {
              console.log(`✅ Cleared ${keys.length} highlight keys`);
              location.reload();
            });
          });
        }
      },
      
      listHighlights: () => {
        if (!highlighter) {
          console.log('❌ Highlighter not initialized');
          return;
        }
        console.log(`Current highlights in memory: ${highlighter.highlights.size}`);
        console.table(Array.from(highlighter.highlights.values()).map(h => ({
          id: h.id,
          text: h.text.substring(0, 50) + '...',
          color: h.color,
          hasComment: Array.isArray(h.comment) ? h.comment.length > 0 : !!h.comment
        })));
      }
    };
    
    console.log('🧪 Debug tools available:');
    console.log('  window.debugHighlights.checkStorage() - Check storage');
    console.log('  window.debugHighlights.clearAll() - Clear all highlights');
    console.log('  window.debugHighlights.listHighlights() - List current highlights');
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
        savedSelection = currentSelection.toString();
        if (overlayIframe === null) {
          toggleOverlay(true);
        } else {
          overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: extractSelection() }, "*");
        }
      },
      onVisualize: async (currentSelection) => {
        savedSelection = currentSelection.toString();
        currentVisualizationContainer = await createVisualizationContainer(currentSelection);
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

function extractSelection() {
  const text = savedSelection || (window.getSelection()?.toString() || "").trim();

  return {
    url: location.href,
    title: document.title,
    paragraphs: [{ text: text && text.length > 0 ? text : "" }],
    mode: "selection",
  };
}

// Simple extraction (text only)
function extractPage() {
  const containers = document.querySelectorAll("article, main, [role=main]");
  const container = containers[0] || document.body;
  const paragraphs = Array.from(container.querySelectorAll("p"))
    .map((p) => p.innerText.trim())
    .filter((t) => t.length > 30)
    .map((text) => ({ text }));

  return {
    url: location.href,
    title: document.title,
    paragraphs,
    mode: "page",
  };
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
    let data = e.data.mode === "selection" ? extractSelection() : extractPage();
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data }, "*");
  }

  // Handle initial extraction request when overlay is ready
  if (e.data.type === "OVERLAY_READY") {
    const hasSelection = savedSelection && savedSelection.length > 0;
    if (hasSelection) {
      overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data: extractSelection() }, "*");
    }
    savedSelection = null;
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
  if (e.data.type === "REQUEST_LANGUAGE_MODEL_PROMPT") {
    try {
      const languageModel = await makeLanguageModel();
      const result = await languageModel.prompt(e.data.text);
      overlayIframe?.contentWindow?.postMessage({ type: "LANGUAGE_MODEL_RESULT", result: result }, "*");
    } catch (err) {
      overlayIframe?.contentWindow?.postMessage({ type: "LANGUAGE_MODEL_ERROR", error: err.message || String(err) }, "*");
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

// Create visualization container near the selection
function createVisualizationContainer(currentSelection) {
  const range = currentSelection.getRangeAt(0);

  const container = document.createElement("div");
  container.id = "visualization-container";

  const content = document.createElement("div");
  content.className = "visualization-content";

  const skeleton = document.createElement("div");
  skeleton.className = "visualization-skeleton";

  const loadingText = document.createElement("span");
  loadingText.className = "visualization-loading-text";
  loadingText.textContent = "Generating diagram...";

  const closeBtn = document.createElement("button");
  closeBtn.className = "visualization-close-btn";
  closeBtn.onclick = () => {
    container.remove();
    if (currentVisualizationContainer === container) {
      currentVisualizationContainer = null;
    }
  };

  skeleton.appendChild(loadingText);
  content.appendChild(skeleton);
  container.appendChild(content);
  container.appendChild(closeBtn);

  const insertRange = range.cloneRange();
  insertRange.collapse(false);
  insertRange.insertNode(container);

  return container;
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
    const skeleton = currentVisualizationContainer.querySelector(".visualization-content .visualization-skeleton");
    skeleton.remove();

    const closeBtn = currentVisualizationContainer.querySelector(".visualization-close-btn");
    closeBtn.style.display = "flex";

    const contentDiv = currentVisualizationContainer.querySelector(".visualization-content");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderResult.output;
    const svgElement = tempDiv.querySelector("svg");
    
    contentDiv.appendChild(svgElement);

    // Add click event to show popup
    contentDiv.style.cursor = "pointer";
    contentDiv.addEventListener("click", () => {
      showDiagramPopup(renderResult.output);
    });
  }
}

// Show diagram in a popup modal
function showDiagramPopup(svgContent) {
  const popup = document.createElement("div");
  popup.id = "diagram-popup-overlay";

  const popupContent = document.createElement("div");
  popupContent.className = "diagram-popup-content";

  const closeBtn = document.createElement("button");
  closeBtn.className = "diagram-popup-close";
  closeBtn.onclick = () => popup.remove();

  const svgWrapper = document.createElement("div");
  svgWrapper.className = "diagram-popup-svg-wrapper";
  svgWrapper.innerHTML = svgContent;

  popupContent.appendChild(closeBtn);
  popupContent.appendChild(svgWrapper);
  popup.appendChild(popupContent);

  // Close on overlay click
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);

  document.body.appendChild(popup);
}

// Show error message in visualization container
function showDiagramError() {
  // Re-enable visualize button
  if (floatingToolbar) {
    floatingToolbar.enableVisualizeButton();
  }

  const errorDiv = document.createElement("div");
  errorDiv.className = "visualization-error";
  errorDiv.textContent = "Diagram generation failed";

  currentVisualizationContainer.innerHTML = "";
  currentVisualizationContainer.appendChild(errorDiv);

  // Remove after 5 seconds
  setTimeout(() => {
    currentVisualizationContainer.remove();
    currentVisualizationContainer = null;
  }, 5000);
}
