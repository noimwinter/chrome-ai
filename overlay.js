// --- overlay.js (iframe) ---

let latestText = "";
let summarizer = null;             // <-- declare the variable here

const elOut = document.getElementById("out");
const elStatus = document.getElementById("status");
const btnRefreshSel = document.getElementById("btn-refresh-selection");
const btnSummarize = document.getElementById("btn-summarize");

btnRefreshSel.addEventListener("click", () => {
  window.parent.postMessage({ type: "REQUEST_EXTRACTION", selectionOnly: true }, "*");
});

const btnClose = document.getElementById("btn-close");

btnClose.addEventListener("click", () => {
  // Ask the parent page (content script) to remove the overlay
  window.parent.postMessage({ type: "CLOSE_OVERLAY" }, "*");
});

window.addEventListener("message", (e) => {
  if (e.data?.type === "EXTRACTION_RESULT") {
    const { paragraphs } = e.data.data || {};
    latestText = (paragraphs || []).map(p => p.text).join("\n\n");
    // give clear feedback so you know it updated:
    elOut.textContent = latestText ? "(Text loaded. Click Summarize.)" : "No text found.";
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
    sharedContext: "Summarize the provided page text.",
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        elStatus.textContent = `Downloading model: ${Math.round(e.loaded * 100)}%`;
      });
    }
  });
}

// Click → summarize (provides user activation)
btnSummarize.addEventListener("click", async () => {
  if (!latestText.trim()) { elOut.textContent = "No text to summarize."; return; }

  const length = document.querySelector('input[name="summary-length"]')?.value
              || document.querySelector('input[name="len"]:checked')?.value
              || "medium";
  const outputLanguage = pickOutputLang();

  try {
    elStatus.textContent = "";
    elOut.textContent = "Summarizing…";

    // Do NOT reference an undefined variable here.
    // Either reuse a cached instance, or (simplest) recreate each time:
    summarizer = await makeSummarizer({
      type: "key-points",
      format: "plain-text",           // use plain-text for safe textContent
      length,
      outputLanguage
    });

    const result = await summarizer.summarize(latestText, {
      outputLanguage,                 // keep passing here to silence warnings
      context: "General audience summary."
    });

    elOut.textContent = result || "(Empty result)";
    elStatus.textContent = "Done";
  } catch (err) {
    elStatus.textContent = "";
    elOut.textContent = `Error: ${err.message || err}`;
  }
});