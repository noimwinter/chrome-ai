// Create a context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-overlay",
    title: "Summarize with AI",
    contexts: ["page", "selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "open-overlay" || !tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", open: true }); } catch {}
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