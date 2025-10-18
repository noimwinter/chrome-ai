let summarizer = null;

document.addEventListener("click", (e) => {
  if (e.target.closest('#btn-close')) {
    window.parent.postMessage({ type: "CLOSE_OVERLAY" }, "*");
  }

  if (e.target.closest('#btn-settings')) {
    window.loadView("views/settings.html");
  }
  
  if (e.target.closest('#btn-summarize-page')) {
    window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "page" }, "*");
  }

  if (e.target.closest('#btn-summarize-selection')) {
    window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "selection" }, "*");
  }
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
        const elStatus = document.getElementById("status");
        if (elStatus) {
          elStatus.textContent = (progress === 0 || progress === 100) ? "" : `Downloading model: ${progress}%`;
        }
      });
    }
  });
}

// Summarize the given text
async function summarizeText(text, source) {
  const elOut = document.getElementById("out");
  const elStatus = document.getElementById("status");
  const btnSummarizePage = document.getElementById("btn-summarize-page");
  const btnSummarizeSelection = document.getElementById("btn-summarize-selection");

  console.log("text to summarize : " + text);
  if (!text.trim()) {
    if (elOut) {
      elOut.textContent = source === "selection" ? "No text selected to summarize." : "No page content to summarize.";
    }
    return;
  }

  const length = document.querySelector('input[name="len"]:checked')?.value || "medium";
  const outputLanguage = pickOutputLang();

  try {
    if (elOut) elOut.textContent = `Summarizing ${source}...`;

    // Update button states
    if (btnSummarizePage) btnSummarizePage.disabled = true;
    if (btnSummarizeSelection) btnSummarizeSelection.disabled = true;

    // Do NOT reference an undefined variable here.
    // Either reuse a cached instance, or (simplest) recreate each time:
    summarizer = await makeSummarizer({
      type: "key-points",
      format: 'markdown',
      length,
      outputLanguage
    });

    const result = await summarizer.summarize(text, {
      outputLanguage,
      context: "General audience summary."
    });

  if (elOut) elOut.innerHTML = window.marked.parse(result) || "(Empty result)";
  } catch (err) {
    if (elStatus) elStatus.textContent = "Error occurred";
    if (elOut) elOut.innerHTML = `Error: ${err.message || err}`;
  } finally {
    // Re-enable buttons
    if (btnSummarizePage) btnSummarizePage.disabled = false;
    if (btnSummarizeSelection) btnSummarizeSelection.disabled = false;
  }
}