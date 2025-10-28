chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const actions = ["summarize", "proofread", "translate"];
    chrome.contextMenus.create({
      id: "clearmind-root",
      title: "ClearMind",
      contexts: ["selection"],
    });

    for (const action of actions) {
      chrome.contextMenus.create({
        id: `clearmind-${action}`,
        parentId: "clearmind-root",
        title: capitalize(action),
        contexts: ["selection"],
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  const action = info.menuItemId.replace("clearmind-", "");

  try {
    // Try injecting content.js dynamically (ensures it runs on this page)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Once injected, send message to it
    await chrome.tabs.sendMessage(tab.id, {
      type: "clearmind-action",
      action,
      text: info.selectionText,
    });
  } catch (err) {
    console.error("Error injecting or messaging content.js:", err);
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
