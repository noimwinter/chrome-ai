// Post message to parent that overlay with main.html is ready
window.parent.postMessage({ type: "OVERLAY_READY" }, "*");

document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-close")) {
    window.parent.postMessage({ type: "CLOSE_OVERLAY" }, "*");
  }

  if (e.target.closest("#btn-settings")) {
    window.loadView("views/settings.html");
  }

  if (e.target.closest("#btn-summarize-page")) {
    window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "page" }, "*");
  }

  if (e.target.closest("#btn-summarize-selection")) {
    window.parent.postMessage({ type: "REQUEST_EXTRACTION", mode: "selection" }, "*");
  }

  if (e.target.closest("#btn-view-highlights")) {
    window.loadView("views/highlights.html");
  }
});

// Handle Extraction result
window.addEventListener("message", async (e) => {
  if (e.data?.type === "EXTRACTION_RESULT") {
    const { paragraphs, mode } = e.data.data || {};
    const text = (paragraphs || []).map((p) => p.text).join("\n\n");

    setSummarizeButtonsEnabled(false);
    
    requestSummarizeText(text, mode);
  }
});

// Handle Summarizer event
window.addEventListener("message", async (e) => {
  if (e.data?.type === "SUMMARIZER_PROGRESS") {
    document.getElementById("summarizer-status").textContent = e.data.progress === 0 || e.data.progress === 100 ? "" : `Downloading Summarizer : ${e.data.progress}%`;
  }

  if (e.data?.type === "SUMMARIZER_RESULT") {
    document.getElementById("out").innerHTML = window.marked.parse(e.data?.result) || "(Empty result)";
    setSummarizeButtonsEnabled(true);
  }

  if (e.data?.type === "SUMMARIZER_ERROR") {
    document.getElementById("status").textContent = "Error occurred";
    document.getElementById("out").innerHTML = `Error: ${e.data?.error}`;
    setSummarizeButtonsEnabled(true);
  }
});

// Handle Language Model events
window.addEventListener("message", async (e) => {
  if (e.data?.type === "LANGUAGE_MODEL_PROGRESS") {
    document.getElementById("language-model-status").textContent = e.data.progress === 0 || e.data.progress === 100 ? "" : `Downloading LanguageModel : ${e.data.progress}%`;
  }
});

// Enable or disable summarize buttons
function setSummarizeButtonsEnabled(isEnabled) {
  const buttons = [
    "btn-summarize-page",
    "btn-summarize-selection"
  ];

  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !isEnabled;
  });

  // Toggle summarize button in floating toolbar
  if (isEnabled) {
    window.parent.postMessage({ type: "ENABLE_SUMMARIZE_BUTTON" }, "*");
  } else {
    window.parent.postMessage({ type: "DISABLE_SUMMARIZE_BUTTON" }, "*");
  }
}

// Summarize the given text
async function requestSummarizeText(text, source) {
  console.log("text to summarize : " + text);

  if (!text.trim()) {
    document.getElementById("out").textContent = (source === "selection") ? "No text selected to summarize." : "No page content to summarize.";
    return;
  }

  document.getElementById("out").textContent = `Summarizing ${source}...`;
  const summaryLength = document.querySelector('input[name="len"]:checked').value;
  window.parent.postMessage({ type: "REQUEST_SUMMARIZATION", summaryLength: summaryLength, text: text }, "*");
}