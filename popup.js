// Root Container
const root = document.body;
root.style.fontFamily = "Arial, sans-serif";
root.style.width = "300px";
root.style.padding = "10px";

// Title
const title = document.createElement("h3");
title.textContent = "ClearMind";
root.appendChild(title);

// Text Area
const textarea = document.createElement("textarea");
textarea.id = "inputText";
textarea.placeholder = "Paste text here or a YouTube URL to summarize:";
textarea.style.width = "96%"; // Adjust width to fit padding
textarea.style.height = "80px";
textarea.style.marginBottom = "10px";
textarea.style.padding = "2%";
root.appendChild(textarea);

// --- Buttons container ---
const buttonContainer = document.createElement("div");
buttonContainer.style.display = "flex";
buttonContainer.style.flexDirection = "column";
buttonContainer.style.gap = "6px";
root.appendChild(buttonContainer);

// Helper to create buttons
function createActionButton(action, label) {
  const button = document.createElement("button");
  button.id = `${action}Button`;
  button.textContent = label;
  button.dataset.action = action; // 👈 store the action
  button.style.width = "100%";
  button.style.padding = "8px";
  button.style.cursor = "pointer";
  buttonContainer.appendChild(button);
  return button;
}

// --- Create Summary Mode Dropdown ---
const summaryModeSelect = document.createElement("select");
summaryModeSelect.id = "summaryMode";
summaryModeSelect.style.width = "100%";
summaryModeSelect.style.padding = "8px";
summaryModeSelect.style.marginBottom = "6px";
const modes = {
  "bullets": "Bullet points",
  "tldr": "TL;DR (1-2 sentences)",
  "qa": "Q&A style",
  "action": "Action items"
};
for (const [value, text] of Object.entries(modes)) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  summaryModeSelect.appendChild(option);
}
// Insert before the summarize button
buttonContainer.appendChild(summaryModeSelect);

// Create action buttons
const summarizeButton = createActionButton("summarize", "Summarize Text / URL");
const proofreadButton = createActionButton("proofread", "Proofread Text");
const translateButton = createActionButton("translate", "Translate Text (EN→ES)");


// --- Output Area ---
const outputContainer = document.createElement("div");
outputContainer.style.marginTop = "10px";
outputContainer.style.position = "relative"; // For copy button positioning

// Output Div
const outputDiv = document.createElement("div");
outputDiv.id = "output";
outputDiv.style.fontSize = "14px";
outputDiv.style.padding = "8px";
outputDiv.style.background = "#f4f4f4";
outputDiv.style.borderRadius = "4px";
outputDiv.style.minHeight = "50px";
outputDiv.style.whiteSpace = "pre-wrap";
outputDiv.style.wordWrap = "break-word";
outputContainer.appendChild(outputDiv);

// Copy Button
const copyButton = document.createElement("button");
copyButton.id = "copyButton";
copyButton.textContent = "Copy";
copyButton.style.position = "absolute";
copyButton.style.top = "5px";
copyButton.style.right = "5px";
copyButton.style.padding = "2px 6px";
copyButton.style.fontSize = "12px";
copyButton.style.background = "#ccc";
copyButton.style.border = "none";
copyButton.style.borderRadius = "4px";
copyButton.style.cursor = "pointer";
copyButton.style.display = "none"; // Hide by default
outputContainer.appendChild(copyButton);

root.appendChild(outputContainer);

// Error area
const errorDiv = document.createElement("div");
errorDiv.id = "error";
errorDiv.style.marginTop = "8px";
errorDiv.style.color = "red";
errorDiv.style.display = "none";
root.appendChild(errorDiv);

// Model status area
const modelStatusDiv = document.createElement("div");
modelStatusDiv.id = "modelStatus";
modelStatusDiv.style.marginTop = "8px";
modelStatusDiv.style.fontSize = "12px";
modelStatusDiv.style.color = "#555";
root.appendChild(modelStatusDiv);

// --- NEW: History Section ---
const historyTitleContainer = document.createElement("div");
historyTitleContainer.style.display = "flex";
historyTitleContainer.style.justifyContent = "space-between";
historyTitleContainer.style.alignItems = "center";
historyTitleContainer.style.marginTop = "16px";
historyTitleContainer.style.borderTop = "1px solid #ccc";
historyTitleContainer.style.paddingTop = "8px";

const historyTitle = document.createElement("h4");
historyTitle.textContent = "History";
historyTitle.style.margin = "0";
historyTitleContainer.appendChild(historyTitle);

const clearHistoryButton = document.createElement("button");
clearHistoryButton.id = "clearHistoryButton";
clearHistoryButton.textContent = "Clear";
clearHistoryButton.style.fontSize = "12px";
clearHistoryButton.style.background = "none";
clearHistoryButton.style.border = "1px solid #ccc";
clearHistoryButton.style.color = "#555";
clearHistoryButton.style.borderRadius = "4px";
clearHistoryButton.style.cursor = "pointer";
historyTitleContainer.appendChild(clearHistoryButton);

root.appendChild(historyTitleContainer);

const historyContainer = document.createElement("div");
historyContainer.id = "historyContainer";
historyContainer.style.maxHeight = "100px";
historyContainer.style.overflowY = "auto";
historyContainer.style.fontSize = "12px";
historyContainer.style.marginTop = "8px";
historyContainer.style.border = "1px solid #eee";
historyContainer.style.borderRadius = "4px";
root.appendChild(historyContainer);
// --- END NEW: History Section ---

// API Key input
const apiKeyLabel = document.createElement("label");
apiKeyLabel.textContent = "Gemini API Key (for cloud fallback):";
apiKeyLabel.style.fontSize = "12px";
apiKeyLabel.style.display = "block";
apiKeyLabel.style.marginTop = "10px";
root.appendChild(apiKeyLabel);

const apiKeyInput = document.createElement("input");
apiKeyInput.type = "password";
apiKeyInput.id = "apiKeyInput";
apiKeyInput.style.width = "96%";
apiKeyInput.style.padding = "2%";
apiKeyInput.style.marginTop = "4px";
root.appendChild(apiKeyInput);

const saveApiKeyButton = document.createElement("button");
saveApiKeyButton.id = "saveApiKeyButton";
saveApiKeyButton.textContent = "Save Key";
saveApiKeyButton.style.width = "100%";
saveApiKeyButton.style.padding = "8px";
saveApiKeyButton.style.marginTop = "6px";
saveApiKeyButton.style.cursor = "pointer";
root.appendChild(saveApiKeyButton);

// Export UI
window.ClearMindUI = {
  textarea,
  summarizeButton,
  proofreadButton,
  translateButton,
  summaryModeSelect,
  outputDiv,
  copyButton,
  errorDiv,
  modelStatusDiv,
  apiKeyInput,
  saveApiKeyButton,
  // --- NEW ---
  historyContainer,
  clearHistoryButton,
  // --- END NEW ---
};

