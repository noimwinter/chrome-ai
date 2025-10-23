let highlights = [];

document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-back")) {
    window.loadView("views/main.html");
  }

  if (e.target.closest("#btn-clear-all")) {
    if (confirm("Are you sure you want to clear all highlights on this page?")) {
      clearAllHighlights();
    }
  }

  if (e.target.closest(".btn-delete")) {
    const highlightId = e.target.closest(".btn-delete").dataset.highlightId;
    deleteHighlight(highlightId);
  }

  if (e.target.closest(".btn-edit-comment")) {
    const highlightId = e.target.closest(".btn-edit-comment").dataset.highlightId;
    editComment(highlightId);
  }
});

async function loadHighlights() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_HIGHLIGHTS" }, (response) => {
          if (response?.highlights) {
            highlights = response.highlights;
            renderHighlights();
          } else {
            highlights = [];
            renderHighlights();
          }
        });
      }
    });
  } catch (e) {
    console.error("Error loading highlights:", e);
    highlights = [];
    renderHighlights();
  }
}

function renderHighlights() {
  const container = document.getElementById("highlights-list");
  
  if (highlights.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>No highlights yet</p>
        <p class="dim">Select text and right-click to create a highlight</p>
      </div>
    `;
    return;
  }

  container.innerHTML = highlights
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(
      (h) => `
    <div class="highlight-item">
      <div class="highlight-text">"${h.text.substring(0, 100)}${h.text.length > 100 ? "..." : ""}"</div>
      ${h.comment ? `<div class="highlight-comment">💬 ${h.comment}</div>` : ""}
      <div class="highlight-meta">
        <div>
          <span class="highlight-color-badge" style="background-color: ${h.color}"></span>
          <span class="dim" style="margin-left: 8px;">${new Date(h.timestamp).toLocaleString()}</span>
        </div>
        <div class="highlight-actions">
          <button class="btn-small btn-edit-comment" data-highlight-id="${h.id}">
            ${h.comment ? "Edit" : "Add"} Comment
          </button>
          <button class="btn-small btn-danger btn-delete" data-highlight-id="${h.id}">Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function deleteHighlight(highlightId) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "DELETE_HIGHLIGHT", highlightId });
      highlights = highlights.filter((h) => h.id !== highlightId);
      renderHighlights();
    }
  });
}

function editComment(highlightId) {
  const highlight = highlights.find((h) => h.id === highlightId);
  if (!highlight) return;

  const comment = prompt("Enter your comment:", highlight.comment || "");
  if (comment !== null) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_COMMENT", highlightId, comment });
        highlight.comment = comment;
        renderHighlights();
      }
    });
  }
}

function clearAllHighlights() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "CLEAR_ALL_HIGHLIGHTS" });
      highlights = [];
      renderHighlights();
    }
  });
}

document.addEventListener("view:loaded", (e) => {
  if (e.detail.path === "views/highlights.html") {
    loadHighlights();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadHighlights);
} else {
  loadHighlights();
}
