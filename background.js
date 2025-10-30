chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // Create the root menu item
    chrome.contextMenus.create({
      id: "clearmind-root",
      title: "ClearMind",
      contexts: ["selection", "page"],
    });
    
    // --- Create 'Summarize as...' parent menu ---
    chrome.contextMenus.create({
      id: "clearmind-summarize-parent",
      parentId: "clearmind-root",
      title: "Summarize as...",
      contexts: ["selection"],
    });

    // Add summary mode children
    chrome.contextMenus.create({
      id: "clearmind-summarize-tldr",
      parentId: "clearmind-summarize-parent",
      title: "TL;DR (1-2 sentences)",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "clearmind-summarize-bullets",
      parentId: "clearmind-summarize-parent",
      title: "Bullet Points",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "clearmind-summarize-qa",
      parentId: "clearmind-summarize-parent",
      title: "Q&A Style",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "clearmind-summarize-action",
      parentId: "clearmind-summarize-parent",
      title: "Action Items",
      contexts: ["selection"],
    });
    
    // --- Add other text-based actions ---
    chrome.contextMenus.create({
      id: `clearmind-proofread`,
      parentId: "clearmind-root",
      title: "Proofread",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: `clearmind-translate`,
      parentId: "clearmind-root",
      title: "Translate",
      contexts: ["selection"],
    });
    
    // --- Add YouTube page action ---
    chrome.contextMenus.create({
      id: "clearmind-summarize_video-bullets", // Default to bullets
      parentId: "clearmind-root",
      title: "Summarize YouTube Video",
      contexts: ["page"],
      documentUrlPatterns: ["*://*.youtube.com/watch*"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  // Extract the core action
  // e.g., "clearmind-summarize-bullets" -> "summarize-bullets"
  const action = info.menuItemId.replace("clearmind-", "");
  
  let textToSend = info.selectionText;

  // Handle page action (YouTube video)
  if (action.startsWith("summarize_video")) {
    textToSend = ""; // No text is needed
  } 
  // Handle text selection actions
  else if (!info.selectionText) {
    // If it's a text action but there's no text, stop.
    return;
  }

  try {
    // Try injecting content.js dynamically
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Send the specific action (e.g., "summarize-bullets")
    await chrome.tabs.sendMessage(tab.id, {
      type: "clearmind-action",
      action,
      text: textToSend,
    });
  } catch (err) {
    console.error("Error injecting or messaging content.js:", err);
  }
});

// This function is no longer used here, but safe to keep
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

