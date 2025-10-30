// Wait for the UI to be built
document.addEventListener("DOMContentLoaded", () => {
  const ui = window.ClearMindUI;
  if (!ui) {
    console.error("ClearMindUI not found. popup.js must run first.");
    return;
  }

  /**
   * Gets the correct Summarizer API options based on the selected mode.
   * @param {string} mode - The value from the summaryModeSelect dropdown.
   * @returns {object} Options for Summarizer.create()
   */
  function getSummarizerOptions(mode) {
    switch (mode) {
      case "tldr":
        return { type: "passage", length: "short" };
      case "qa":
        return { type: "passage", prompt: "Generate a list of questions and answers from this text." };
      case "action":
        return { type: "key-points", prompt: "Extract action items from this text." };
      case "bullets":
      default:
        return { type: "key-points", format: "markdown", length: "medium" };
    }
  }

  // --- Main Handler ---
  const handleAiAction = async (event) => {
    const action = event.target.dataset.action;
    console.log("Button clicked, action =", action);

    const button = event.target;
    const originalButtonText = button.textContent; // Store original text
    button.disabled = true;
    button.textContent = "Working...";
    clearMessages();

    try {
      // === YOUTUBE VIDEO ACTION ===
      if (action === "summarize_video") {
        ui.outputDiv.textContent = "Checking for active YouTube tab...";
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
          ui.outputDiv.textContent = "Injecting script... See page for summary.";
          
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ["content.js"],
          });
          
          // Send message to content.js to start summarization
          // We default to "bullets" for video summaries, but you could add a dropdown for this too.
          await chrome.tabs.sendMessage(currentTab.id, {
            type: "clearmind-action",
            action: "summarize_video-bullets", // Use a default summary mode
            text: "", 
          });
          
          await new Promise(r => setTimeout(r, 2500));
          window.close(); // Close the popup
        } else {
          throw new Error("This only works on an active YouTube video page. Please navigate to a video and try again.");
        }
      }
      
      // === TEXT-BASED ACTIONS ===
      else {
        const inputText = ui.textarea.value.trim();
        if (!inputText) {
          showError("Please enter some text first.");
          button.disabled = false;
          button.textContent = originalButtonText;
          return;
        }
        
        ui.outputDiv.textContent = "Processing...";

        // === PROOFREAD ===
        if (action === "proofread") {
          // (Proofread logic remains unchanged)
          if (!("Proofreader" in self)) {
            throw new Error("Proofreader API not supported in this browser.");
          }
          const availability = await Proofreader.availability();
          if (availability === "unavailable") {
            throw new Error("Proofreader model unavailable. Check requirements.");
          }
          if (availability === "downloadable") {
            ui.outputDiv.textContent = "Model is downloading... Please wait.";
            await Proofreader.create({
              expectedInputLanguages: ["en"],
              expectedOutputLanguages: ["en"],
              monitor(m) {
                m.addEventListener("downloadprogress", (e) => {
                  const percent = Math.round(e.loaded * 100);
                  ui.outputDiv.textContent = `Downloading model... ${percent}%`;
                });
              },
            });
          }
          const proofreader = await Proofreader.create({
            expectedInputLanguages: ["en"],
            expectedOutputLanguages: ["en"],
          });
          const result = await proofreader.proofread(inputText);
          if (!result || !result.corrections) {
            throw new Error("Proofreader returned no corrections.");
          }
          let correctedText = inputText.split("");
          for (let i = result.corrections.length - 1; i >= 0; i--) {
            const c = result.corrections[i];
            correctedText.splice(
              c.startIndex,
              c.endIndex - c.startIndex,
              c.replacement
            );
          }
          correctedText = correctedText.join("");
          ui.outputDiv.innerHTML = `
            <b>Original:</b><br>${escapeHtml(inputText)}<br><br>
            <b>Corrected:</b><br>${escapeHtml(correctedText)}
          `;
        }

        // === SUMMARIZE ===
        else if (action === "summarize") {
          if (!("Summarizer" in self)) {
            throw new Error("Summarizer API not supported. (Requires Chrome 138+)");
          }

          const availability = await Summarizer.availability();
          if (availability === "unavailable") {
            throw new Error("Summarizer model unavailable. Check hardware requirements.");
          }
          if (availability === "downloadable") {
            ui.outputDiv.textContent = "Model is downloading... Please wait.";
            await Summarizer.create({
              monitor(m) {
                m.addEventListener("downloadprogress", (e) => {
                  const percent = Math.round(e.loaded * 100);
                  ui.outputDiv.textContent = `Downloading model... ${percent}%`;
                });
              },
            });
          }

          // Get the selected mode from the dropdown
          const selectedMode = ui.summaryModeSelect.value;
          const summarizerOptions = getSummarizerOptions(selectedMode);
          
          console.log("Summarizing with options:", summarizerOptions);
          const summarizer = await Summarizer.create(summarizerOptions);

          const summary = await summarizer.summarize(inputText);
          if (!summary) throw new Error("No summary returned. Try different input.");

          // Use innerHTML for markdown, textContent for others
          if (summarizerOptions.format === "markdown") {
             ui.outputDiv.innerHTML = `<b>Summary:</b><br>${summary.replace(/\n/g, '<br>')}`;
          } else {
             ui.outputDiv.textContent = summary;
          }
        }

        // === TRANSLATE ===
        else if (action === "translate") {
          // (Translate logic remains unchanged)
          if (!("Translator" in self)) {
            throw new Error("Translator API not supported. (Requires Chrome 138+)");
          }
          const sourceLang = "en";
          const targetLang = "es";
          let availability = await Translator.availability({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
          });
          async function ensureTranslator() {
            if (availability === "downloadable") {
              ui.outputDiv.textContent = "Downloading translator model... Please wait.";
              await Translator.create({
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                monitor(m) {
                  m.addEventListener("downloadprogress", (e) => {
                    const percent = Math.round(e.loaded * 100);
                    ui.outputDiv.textContent = `Downloading model... ${percent}%`;
                  });
                },
              });
              let attempts = 0;
              do {
                await new Promise((r) => setTimeout(r, 1000));
                availability = await Translator.availability({
                  sourceLanguage: sourceLang,
                  targetLanguage: targetLang,
                });
                attempts++;
              } while (availability !== "available" && attempts < 10);
            }
            if (availability !== "available") {
              throw new Error("Translator model unavailable after download.");
            }
            return await Translator.create({
              sourceLanguage: sourceLang,
              targetLanguage: targetLang,
            });
          }
          const translator = await ensureTranslator();
          const translated = await translator.translate(inputText);
          if (!translated)
            throw new Error("Translation failed or returned empty text.");
          ui.outputDiv.innerHTML = `
            <b>Original (${sourceLang.toUpperCase()}):</b><br>${escapeHtml(inputText)}<br><br>
            <b>Translated (${targetLang.toUpperCase()}):</b><br>${escapeHtml(translated)}
          `;
        }

        else {
          throw new Error(`Feature '${action}' not yet implemented.`);
        }
      }
    } catch (err) {
      console.error("AI API error:", err);
      showError(err.message);
    } finally {
      if (action !== "summarize_video") {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
    }
  };

  // --- Helpers ---
  const showError = (message) => {
    ui.outputDiv.textContent = "";
    ui.errorDiv.textContent = `Error: ${message}`;
    ui.errorDiv.style.display = "block";
  };

  const clearMessages = () => {
    ui.outputDiv.textContent = "";
    ui.errorDiv.textContent = "";
    ui.errorDiv.style.display = "none";
  };

  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  [ui.summarizeButton, ui.proofreadButton, ui.translateButton, ui.youtubeButton].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", handleAiAction);
    }
  });
});

