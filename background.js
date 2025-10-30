chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // Create the root menu item
    chrome.contextMenus.create({
      id: "clearmind-root",
      title: "ClearMind",
      contexts: ["selection", "page"],
    });

    // --- Create "Summarize as..." parent menu ---
    chrome.contextMenus.create({
      id: "clearmind-summarize-parent",
      parentId: "clearmind-root",
      title: "Summarize as...",
      contexts: ["selection"],
    });
    const summaryModes = {
      "bullets": "Bullet points",
      "tldr": "TL;DR (1-2 sentences)",
      "qa": "Q&A style",
      "action": "Action items"
    };
    for (const [mode, title] of Object.entries(summaryModes)) {
      chrome.contextMenus.create({
        id: `clearmind-summarize-${mode}`,
        parentId: "clearmind-summarize-parent",
        title: title,
        contexts: ["selection"],
      });
    }

    // --- Create other root-level actions ---
    chrome.contextMenus.create({
      id: `clearmind-proofread`,
      parentId: "clearmind-root",
      title: "Proofread",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: `clearmind-translate`,
      parentId: "clearmind-root",
      title: "Translate (EN→ES)",
      contexts: ["selection"],
    });

    // --- Create YouTube "Summarize as..." parent menu ---
    chrome.contextMenus.create({
      id: "clearmind-summarize-video-parent",
      parentId: "clearmind-root",
      title: "Summarize YouTube Video as...",
      contexts: ["page"],
      documentUrlPatterns: ["*://*.youtube.com/watch*"],
    });
    for (const [mode, title] of Object.entries(summaryModes)) {
      chrome.contextMenus.create({
        id: `clearmind-summarize_video-${mode}`,
        parentId: "clearmind-summarize-video-parent",
        title: title,
        contexts: ["page"],
        documentUrlPatterns: ["*://*.youtube.com/watch*"],
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const action = info.menuItemId.replace("clearmind-", "");
  let textToSend = info.selectionText;

  // Handle page actions (YouTube video)
  if (action.startsWith("summarize_video-")) {
    textToSend = ""; // No text is needed
  }
  // Handle text selection actions
  else if (!info.selectionText) {
    return; // Stop if it's a text action but no text is selected
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: "clearmind-action",
      action,
      text: textToSend,
    });
  } catch (err) {
    console.error("Error injecting or messaging content.js:", err);
  }
});

// --- NEW: Listen for Keyboard Shortcuts ---
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;

  // We'll map this command to a default summarize action
  if (command === "summarize-selection") {
    try {
      // 1. Inject content.js to make sure it's running
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      // 2. Send a message to content.js
      // "get_selection" tells content.js to find its own selected text
      // "summarize-bullets" is the default action we've chosen
      await chrome.tabs.sendMessage(tab.id, {
        type: "clearmind-action",
        action: "summarize-bullets", // Default action for the shortcut
        text: "get_selection" // Special flag
      });
    } catch (err) {
      console.error(`Error handling command '${command}':`, err);
    }
  }
});
// --- END NEW ---

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

