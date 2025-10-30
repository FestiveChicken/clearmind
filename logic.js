// Wait for the UI to be built
document.addEventListener("DOMContentLoaded", () => {
  const ui = window.ClearMindUI;
  if (!ui) {
    console.error("ClearMindUI not found. popup.js must run first.");
    return;
  }

  // --- API Key Logic ---
  // Load saved API key when popup opens
  chrome.storage.local.get("geminiApiKey", (data) => {
    if (data.geminiApiKey) {
      ui.apiKeyInput.value = data.geminiApiKey;
    }
  });

  // Save API key when button is clicked
  ui.saveApiButton.addEventListener("click", () => {
    const apiKey = ui.apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        ui.saveApiButton.textContent = "Saved!";
        setTimeout(() => { ui.saveApiButton.textContent = "Save Key"; }, 2000);
      });
    }
  });


  /**
   * Gets the correct Summarizer API options based on the selected mode.
   * @param {string} mode - The value from the summaryModeSelect dropdown.
   * @returns {object} Options for Summarizer.create()
   */
  function getLocalSummarizerOptions(mode) {
    switch (mode) {
      case "tldr":
        // Use a prompt to ask for a short summary, and specify short length
        return { prompt: "Summarize this text in one or two concise sentences.", length: "short" };
      case "qa":
        // Just use the prompt, the default type will be used
        return { prompt: "Generate a list of questions and answers from this text." };
      case "action":
        return { type: "key-points", prompt: "Extract action items from this text." };
      case "bullets":
      default:
        return { type: "key-points", format: "markdown", length: "medium" };
    }
  }

  /**
   * Generates a text prompt for the Gemini Cloud API.
   * @param {string} text - The input text.
   * @param {string} mode - The selected summary mode.
   * @returns {string} The full prompt for the API.
   */
  function getCloudPrompt(text, mode) {
    switch (mode) {
      case "tldr":
        return `Summarize the following text in one or two concise sentences:\n\n${text}`;
      case "qa":
        return `Generate a list of questions and their answers from the following text:\n\n${text}`;
      case "action":
        return `Extract all action items from the following text as a bulleted list:\n\n${text}`;
      case "bullets":
      default:
        return `Summarize the following text as a concise, bulleted list:\n\n${text}`;
    }
  }

  /**
   * Calls the Gemini Cloud API.
   * @param {string} text - The input text.
   * @param {string} apiKey - The user's API key.
   * @param {string} mode - The selected summary mode.
   * @returns {Promise<string>} The summarized text.
   */
  async function callGeminiCloudApi(text, apiKey, mode) {
    ui.outputDiv.textContent = "Calling Gemini Cloud API...";
    const prompt = getCloudPrompt(text, mode);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const summary = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!summary) {
        throw new Error("Cloud API returned an empty response.");
      }
      return summary;
    } catch (err) {
      console.error(err);
      throw err;
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
    ui.modelIndicator.textContent = ""; // Clear model indicator

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
          const selectedMode = ui.summaryModeSelect.value;
          let summary = "";
          let modelUsed = "Local Model (Gemini Nano)"; // Default to local

          if (availability === "available" || availability === "downloadable") {
            // --- USE LOCAL MODEL ---
            if (availability === "downloadable") {
              ui.outputDiv.textContent = "Downloading local model... Please wait.";
              await Summarizer.create({
                monitor(m) {
                  m.addEventListener("downloadprogress", (e) => {
                    const percent = Math.round(e.loaded * 100);
                    ui.outputDiv.textContent = `Downloading model... ${percent}%`;
                  });
                },
              });
            }

            const summarizerOptions = getLocalSummarizerOptions(selectedMode);
            console.log("Summarizing with local model:", summarizerOptions);
            const summarizer = await Summarizer.create(summarizerOptions);
            summary = await summarizer.summarize(inputText);
            
            // Format markdown for local model
            if (summarizerOptions.format === "markdown") {
              ui.outputDiv.innerHTML = `<b>Summary:</b><br>${summary.replace(/\n/g, '<br>')}`;
            } else {
              ui.outputDiv.textContent = summary;
            }

          } else {
            // --- FALLBACK TO CLOUD API ---
            modelUsed = "Cloud Model (Gemini 2.5 Flash)";
            ui.outputDiv.textContent = "Local model unavailable. Falling back to Cloud API...";
            const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
            
            if (!geminiApiKey) {
              throw new Error("Local model unavailable. Please enter and save a Gemini API key to use the cloud fallback.");
            }
            
            summary = await callGeminiCloudApi(inputText, geminiApiKey, selectedMode);
            // Cloud API returns markdown, so format it
            ui.outputDiv.innerHTML = `<b>Summary:</b><br>${summary.replace(/\n/g, '<br>')}`;
          }

          if (!summary) throw new Error("No summary returned. Try different input.");
          ui.modelIndicator.textContent = `Model used: ${modelUsed}`;
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



