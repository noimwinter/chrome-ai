let overlayIframe = null;

// --- cache the user's latest selection ---
let lastSelectionText = "";
document.addEventListener("selectionchange", () => {
  const t = window.getSelection()?.toString().trim() || "";
  if (t) lastSelectionText = t;
});

function extractSelection() {
  const t = (window.getSelection()?.toString() || "").trim();
  // use live selection if present, else fall back to cached
  const text = t || lastSelectionText;
  if (text && text.length > 10) {
    return {
      url: location.href,
      title: document.title,
      paragraphs: [{ text }]
    };
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_OVERLAY") {
    toggleOverlay(msg.open ?? null);
  }
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
  overlayIframe.allow = 'summarizer';  
  overlayIframe.style.cssText = `
    position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
    border: 0; border-left: 1px solid #e5e7eb; z-index: 2147483647; background: #fff;
    box-shadow: -2px 0 8px rgba(0,0,0,.1);
  `;
  overlayIframe.addEventListener("load", () => {
    // send initial extraction as soon as overlay is ready
    const result = extractPage();
    overlayIframe.contentWindow?.postMessage(
      { type: "EXTRACTION_RESULT", data: result },
      "*"
    );
  });
  document.documentElement.appendChild(overlayIframe);
}

// Simple extraction (text only)
function extractPage() {
  const containers = document.querySelectorAll("article, main, [role=main]");
  const container = containers[0] || document.body;
  const paragraphs = Array.from(container.querySelectorAll("p"))
    .map(p => p.innerText.trim())
    .filter(t => t.length > 30)
    .map(text => ({ text }));

  return { url: location.href, title: document.title, paragraphs };
}

// --- listen for overlay requests (ADD selectionOnly support) ---
window.addEventListener("message", (e) => {
  const { type, selectionOnly } = e.data || {};
  if (type === "REQUEST_EXTRACTION") {
    const data = selectionOnly ? (extractSelection() || extractPage()) : extractPage();
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data }, "*");
  }
});

window.addEventListener("message", (e) => {
  const { type } = e.data || {};

  if (type === "CLOSE_OVERLAY") {
    overlayIframe?.remove();
    overlayIframe = null;
  } else if (type === "REQUEST_EXTRACTION") {
    const data = extractPage();
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data }, "*");
  }
});