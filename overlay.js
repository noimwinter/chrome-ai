// On initial load, show the main view
window.addEventListener("load", () => {
  window.loadView("views/main.html");
});

// set default settings
const DEFAULT_SETTINGS = {
  occupation: "student",
  customPrompt: "",
  summaryType: "key-points",
};
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

// Load a view into the content area
async function loadView(path) {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  const html = await res.text();

  const container = document.getElementById("content");

  // Inject HTML
  container.innerHTML = html;

  // Inject scripts
  const scripts = Array.from(container.querySelectorAll("script"));
  for (const oldScript of scripts) {
    const newScript = document.createElement("script");
    if (oldScript.type) newScript.type = oldScript.type;
    if (oldScript.src) newScript.src = oldScript.src;
    oldScript.replaceWith(newScript);
  }

  try {
    // Dispatch view loaded event
    const evt = new CustomEvent("view:loaded", { detail: { path } });
    document.dispatchEvent(evt);
  } catch (_) {
    // ignore
  }
}
window.loadView = loadView;
