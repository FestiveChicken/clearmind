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


// Output area
const outputDiv = document.createElement("div");
outputDiv.id = "output";
outputDiv.style.marginTop = "10px";
outputDiv.style.fontSize = "14px";
root.appendChild(outputDiv);

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
  outputDiv,
  errorDiv,
};

