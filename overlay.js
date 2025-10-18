// Load marked library for markdown parsing
// window.marked = marked;

// On initial load, show the main view
window.addEventListener("load", () => {
  window.loadView("views/main.html");
});

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
}
window.loadView = loadView;