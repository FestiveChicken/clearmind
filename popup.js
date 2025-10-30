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
textarea.placeholder = "Paste text here to summarize, proofread, or translate.";
textarea.style.width = "100%";
textarea.style.height = "80px";
textarea.style.marginBottom = "10px";
root.appendChild(textarea);

// --- Summarizer Mode Selector ---
const summaryLabel = document.createElement("label");
summaryLabel.textContent = "Summary Mode:";
summaryLabel.style.fontSize = "12px";
summaryLabel.style.display = "block";
summaryLabel.style.marginBottom = "4px";
root.appendChild(summaryLabel);

const summaryModeSelect = document.createElement("select");
summaryModeSelect.id = "summaryMode";
summaryModeSelect.style.width = "100%";
summaryModeSelect.style.padding = "6px";
summaryModeSelect.style.marginBottom = "10px";
const modes = {
  "tldr": "TL;DR (1-2 sentences)",
  "bullets": "Bullet Points",
  "qa": "Q&A Style",
  "action": "Action Items"
};
for (const [value, text] of Object.entries(modes)) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  summaryModeSelect.appendChild(option);
}
root.appendChild(summaryModeSelect);


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
  buttonContainer.appendChild(button);
  return button;
}

// Create text-based buttons
const summarizeButton = createActionButton("summarize", "Summarize Text");
const proofreadButton = createActionButton("proofread", "Proofread");
const translateButton = createActionButton("translate", "Translate");

// --- Separator ---
const separator = document.createElement("hr");
separator.style.border = "none";
separator.style.borderTop = "1px solid #ccc";
separator.style.margin = "12px 0";
root.appendChild(separator);

// Create YouTube button
const youtubeButton = createActionButton("summarize_video", "Summarize Active YouTube Video");
youtubeButton.style.background = "#c00";
youtubeButton.style.color = "white";
youtubeButton.style.border = "none";
youtubeButton.style.fontWeight = "bold";

// --- API Key Input ---
const apiLabel = document.createElement("label");
apiLabel.textContent = "Gemini Cloud API Key (for Fallback):";
apiLabel.style.fontSize = "12px";
apiLabel.style.display = "block";
apiLabel.style.marginBottom = "4px";
apiLabel.style.marginTop = "10px";
root.appendChild(apiLabel);

const apiKeyInput = document.createElement("input");
apiKeyInput.id = "apiKeyInput";
apiKeyInput.type = "password";
apiKeyInput.placeholder = "Enter your API key";
apiKeyInput.style.width = "100%";
apiKeyInput.style.padding = "6px";
apiKeyInput.style.marginBottom = "6px";
root.appendChild(apiKeyInput);

const saveApiButton = document.createElement("button");
saveApiButton.id = "saveApiButton";
saveApiButton.textContent = "Save Key";
saveApiButton.style.width = "100%";
saveApiButton.style.padding = "6px";
saveApiButton.style.fontSize = "12px";
root.appendChild(saveApiButton);


// Output area
const outputDiv = document.createElement("div");
outputDiv.id = "output";
outputDiv.style.marginTop = "10px";
outputDiv.style.fontSize = "14px";
root.appendChild(outputDiv);

// --- Model Indicator ---
const modelIndicator = document.createElement("div");
modelIndicator.id = "modelIndicator";
modelIndicator.style.fontSize = "10px";
modelIndicator.style.color = "#888";
modelIndicator.style.marginTop = "4px";
modelIndicator.style.textAlign = "right";
root.appendChild(modelIndicator);

// Error area
const errorDiv = document.createElement("div");
errorDiv.id = "error";
errorDiv.style.marginTop = "8px";
errorDiv.style.color = "red";
errorDiv.style.display = "none";
root.appendChild(errorDiv);

// Export UI
window.ClearMindUI = {
  textarea,
  summaryModeSelect, // Export the new dropdown
  summarizeButton,
  proofreadButton,
  translateButton,
  youtubeButton,
  apiKeyInput, // Export new UI
  saveApiButton, // Export new UI
  outputDiv,
  modelIndicator, // Export new UI
  errorDiv,
};

