// --- overlay.js (iframe) ---
let summarizer = null;

const elOut = document.getElementById("out");
const elStatus = document.getElementById("status");
const btnSummarizePage = document.getElementById("btn-summarize-page");
const btnSummarizeSelection = document.getElementById("btn-summarize-selection");

// Request page text on load
window.addEventListener("load", () => {
  elOut.textContent = "Click a button above to start summarizing!";
});

btnSummarizePage.addEventListener("click", () => {
  window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "page" }, "*");
});

btnSummarizeSelection.addEventListener("click", () => {
  window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "selection" }, "*");
});

const btnClose = document.getElementById("btn-close");

btnClose.addEventListener("click", () => {
  // Ask the parent page (content script) to remove the overlay
  window.parent.postMessage({ type: "CLOSE_OVERLAY" }, "*");
});

window.addEventListener("message", (e) => {
  if (e.data?.type === "EXTRACTION_RESULT") {
    const { paragraphs, mode } = e.data.data || {};
    const text = (paragraphs || []).map(p => p.text).join("\n\n");

    summarizeText(text, mode);
  }
});

// Supported output languages (avoid the warning)
const SUPPORTED = new Set(["en","es","ja"]);
function pickOutputLang(pref) {
  const l = (pref || navigator.language || "en").slice(0,2).toLowerCase();
  return SUPPORTED.has(l) ? l : "en";
}

// Create a summarizer instance on demand
async function makeSummarizer({ type, format, length, outputLanguage }) {
  if (!("Summarizer" in self)) throw new Error("Summarizer API not supported in this Chrome.");
  const availability = await Summarizer.availability();
  if (availability === "unavailable") throw new Error("Model unavailable on this device/browser.");

  // create a fresh instance each click (simple & robust)
  return await Summarizer.create({
    type, format, length, outputLanguage,
    sharedContext: "Summarize the provided text content.",
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const progress = Math.round(e.loaded * 100);
        elStatus.textContent = progress === 100 ? "" : `Downloading model: ${progress}%`;
      });
    }
  });
}

// Summarize the given text
async function summarizeText(text, source) {

  console.log("text to summarize : " + text);
  if (!text.trim()) { 
    elOut.textContent = source === "selection" ? "No text selected to summarize." : "No page content to summarize."; 
    return; 
  }

  const length = document.querySelector('input[name="len"]:checked')?.value || "medium";
  const outputLanguage = pickOutputLang();

  try {
    elOut.textContent = `Summarizing ${source}...`;

    // Update button states
    btnSummarizePage.disabled = true;
    btnSummarizeSelection.disabled = true;

    // Do NOT reference an undefined variable here.
    // Either reuse a cached instance, or (simplest) recreate each time:
    summarizer = await makeSummarizer({
      type: "key-points",
      format: "plain-text",           // use plain-text for safe textContent
      length,
      outputLanguage
    });

    const result = await summarizer.summarize(text, {
      outputLanguage,                 // keep passing here to silence warnings
      context: "General audience summary."
    });

    elOut.textContent = result || "(Empty result)";
  } catch (err) {
    elStatus.textContent = "Error occurred";
    elOut.textContent = `Error: ${err.message || err}`;
  } finally {
    // Re-enable buttons
    btnSummarizePage.disabled = false;
    btnSummarizeSelection.disabled = false;
  }
}