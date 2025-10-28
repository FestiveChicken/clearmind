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
textarea.placeholder = "Paste text here:";
textarea.style.width = "100%";
textarea.style.height = "80px";
textarea.style.marginBottom = "10px";
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
  buttonContainer.appendChild(button);
  return button;
}

// Create buttons
const summarizeButton = createActionButton("summarize", "Summarize");
const proofreadButton = createActionButton("proofread", "Proofread");
const translateButton = createActionButton("translate", "Translate");

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
  summarizeButton,
  proofreadButton,
  translateButton,
  outputDiv,
  errorDiv,
};
