let overlayIframe = null;

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
    const hasSelection = window.getSelection()?.toString().trim().length > 0;
    const result = hasSelection ? extractSelection() : extractPage();
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

// --- listen for overlay requests (ADD selectionOnly support) ---
window.addEventListener("message", (e) => {
  const { type, mode } = e.data || {};
  if (type === "REQUEST_EXTRACTION") {
    let data = (mode === "selection") ? extractSelection() : extractPage();
    overlayIframe?.contentWindow?.postMessage({ type: "EXTRACTION_RESULT", data }, "*");
  }
});

window.addEventListener("message", (e) => {
  const { type } = e.data || {};

  if (type === "CLOSE_OVERLAY") {
    overlayIframe?.remove();
    overlayIframe = null;
  }
});