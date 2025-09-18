// Pull references from popup.js
const ui = window.ClearMindUI;

ui.button.addEventListener("click", async () => {
  const inputText = ui.textarea.value.trim();
  if (!inputText) {
    ui.outputDiv.textContent = "Please enter some text first.";
    return;
  }

  ui.outputDiv.textContent = "Summarizing...";

  try {
    // Call Chrome’s built-in Summarizer API
    const summary = await chrome.ai.summarizer.summarize(inputText);
    ui.outputDiv.textContent = summary;
  } catch (err) {
    console.error("Summarizer API error:", err);
    ui.outputDiv.textContent = "Failed to summarize text.";
  }
});
