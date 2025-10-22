// Create a context menu on install and seed default storage values
chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.contextMenus.create({
    id: "open-overlay",
    title: "Summarize with AI",
    contexts: ["page", "selection"]
  });
  
  chrome.contextMenus.create({
    id: "highlight-text",
    title: "Highlight Text",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "highlight-yellow",
    parentId: "highlight-text",
    title: "Yellow 🟨",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "highlight-blue",
    parentId: "highlight-text",
    title: "Blue 🟦",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  if (info.menuItemId === "open-overlay") {
    try { await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", open: true }); } catch {}
  }
  
  if (info.menuItemId.startsWith("highlight-")) {
    const colorMap = {
      "highlight-yellow": "yellow",
      "highlight-blue": "lightblue"
    };
    const color = colorMap[info.menuItemId];
    if (color) {
      try { await chrome.tabs.sendMessage(tab.id, { type: "CREATE_HIGHLIGHT", color }); } catch {}
    }
  }
});

// Toolbar click opens overlay
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", open: true }); } catch {}
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd !== "toggle-overlay" || !tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY" }); } catch {}
});