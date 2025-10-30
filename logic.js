document.addEventListener("DOMContentLoaded", () => {
  const ui = window.ClearMindUI;
  if (!ui) {
    console.error("ClearMindUI not found. popup.js must run first.");
    return;
  }

  // --- Load Saved API Key ---
  chrome.storage.local.get("geminiApiKey", (data) => {
    if (data.geminiApiKey) {
      ui.apiKeyInput.value = data.geminiApiKey;
    }
  });

  // --- Load and Render History on Popup Open ---
  loadAndRenderHistory();

  // --- Save API Key Event ---
  ui.saveApiKeyButton.addEventListener("click", () => {
    const apiKey = ui.apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        ui.saveApiKeyButton.textContent = "Saved!";
        setTimeout(() => (ui.saveApiKeyButton.textContent = "Save Key"), 2000);
      });
    }
  });

  // --- Clear History Event ---
  ui.clearHistoryButton.addEventListener("click", () => {
    chrome.storage.local.remove("aiHistory", () => {
      loadAndRenderHistory(); // Re-render to show it's empty
    });
  });

  // --- Main AI Action Handler ---
  const handleAiAction = async (event) => {
    const action = event.target.dataset.action;
    let inputText = ui.textarea.value.trim();
    let isUrl = false;
    let rawTextForCopy = "";

    clearMessages();
    ui.outputDiv.innerHTML = `<span style="opacity:0.7">Processing...</span>`;
    const button = event.target;
    button.disabled = true;
    button.textContent = "Working...";
    
    if (action === "summarize" && (inputText.includes("youtube.com/watch") || inputText.includes("youtu.be/"))) {
      isUrl = true;
      if (!ui.apiKeyInput.value.trim()) {
        showError("Please save a Gemini API key to summarize YouTube URLs.");
        resetButton(button, "Summarize Text / URL");
        return;
      }
    } else if (!inputText) {
      showError("Please enter some text first.");
      resetButton(button, capitalize(action));
      return;
    }

    try {
      if (action === "proofread") {
        const result = await handleProofread(inputText);
        rawTextForCopy = result.correctedText;
        ui.outputDiv.innerHTML = result.htmlOutput;
        ui.modelStatusDiv.textContent = `Using: ${result.modelUsed}`;
        
        // Save to history
        await saveToHistory(inputText, result.correctedText, action, result.htmlOutput);
        loadAndRenderHistory();
      }
      
      else if (action === "summarize") {
        const mode = ui.summaryModeSelect.value;
        const result = await handleSummarize(inputText, mode, isUrl);
        rawTextForCopy = result.summary;
        const summaryHtml = result.summary.replace(/\n/g, '<br>');
        ui.outputDiv.innerHTML = summaryHtml;
        ui.modelStatusDiv.textContent = `Using: ${result.modelUsed}`;
        
        // Save to history
        const fullAction = `summarize-${mode}`;
        await saveToHistory(inputText, result.summary, fullAction, summaryHtml);
        loadAndRenderHistory(); // Refresh history list
      }

      else if (action === "translate") {
        const result = await handleTranslate(inputText);
        rawTextForCopy = result.translated;
        ui.outputDiv.innerHTML = result.htmlOutput;
        ui.modelStatusDiv.textContent = `Using: ${result.modelUsed}`;
        
        // Save to history
        await saveToHistory(inputText, result.translated, action, result.htmlOutput);
        loadAndRenderHistory();
      }

      if (rawTextForCopy) {
        ui.copyButton.style.display = 'block';
        ui.copyButton.onclick = () => copyToClipboard(rawTextForCopy, ui.copyButton);
      }

    } catch (err) {
      console.error("AI API error:", err);
      showError(err.message);
    } finally {
      let originalText = "Summarize Text / URL";
      if (action === "proofread") originalText = "Proofread Text";
      if (action === "translate") originalText = "Translate Text (EN→ES)";
      resetButton(button, originalText);
    }
  };

  // --- Specific AI Logic Functions ---

  async function handleSummarize(text, mode, isUrl) {
    let modelUsed = "Local Model (Gemini Nano)";
    let availability = "unavailable";
    
    if (!isUrl && "Summarizer" in self) {
       availability = await Summarizer.availability();
    }

    if (!isUrl && (availability === "available" || availability === "downloadable")) {
      if (availability === "downloadable") {
        ui.outputDiv.innerHTML = `<span style="opacity:0.7">Downloading local model...</span>`;
        await Summarizer.create({ monitor: createDownloadMonitor() });
      }
      const summarizerOptions = getLocalSummarizerOptionsForAction(mode);
      const summarizer = await Summarizer.create(summarizerOptions);
      ui.outputDiv.innerHTML = `<span style="opacity:0.7">Summarizing (local)...</span>`;
      const summary = await summarizer.summarize(text);
      return { summary, modelUsed };
    } else {
      modelUsed = "Cloud Model (Gemini 2.5 Flash)";
      const apiKey = ui.apiKeyInput.value.trim();
      if (!apiKey) {
        throw new Error("Local model unavailable. Please set your Gemini API key in the extension popup to use the cloud fallback.");
      }
      ui.outputDiv.innerHTML = `<span style="opacity:0.7">Calling Cloud API...</span>`;
      
      let contentToSummarize = text;
      const prompt = isUrl 
        ? getCloudPromptForAction(contentToSummarize, `summarize_video-${mode}`)
        : getCloudPromptForAction(contentToSummarize, `summarize-${mode}`);
        
      const summary = await callGeminiCloudApi(prompt, apiKey);
      return { summary, modelUsed };
    }
  }

  async function handleProofread(text) {
    let modelUsed = "Local Model (Gemini Nano)";
    if (!("Proofreader" in self)) {
      throw new Error("Proofreader API not supported in this browser.");
    }
    const availability = await Proofreader.availability();
    if (availability === "unavailable") {
      throw new Error("Proofreader model unavailable. Check requirements.");
    }
    if (availability === "downloadable") {
      ui.outputDiv.innerHTML = `<span style="opacity:0.7">Downloading proofreader model...</span>`;
      await Proofreader.create({
        expectedInputLanguages: ["en"],
        expectedOutputLanguages: ["en"],
        monitor: createDownloadMonitor(),
      });
    }
    const proofreader = await Proofreader.create({
      expectedInputLanguages: ["en"],
      expectedOutputLanguages: ["en"],
    });
    const result = await proofreader.proofread(text);
    let corrected = text.split("");
    for (let i = result.corrections.length - 1; i >= 0; i--) {
      const c = result.corrections[i];
      corrected.splice(c.startIndex, c.endIndex - c.startIndex, c.replacement);
    }
    const correctedText = corrected.join("");
    const htmlOutput = `
      <b>Original:</b><br>${escapeHtml(text)}<br><br>
      <b>Corrected:</b><br>${escapeHtml(correctedText)}
    `;
    return { correctedText, htmlOutput, modelUsed };
  }

  async function handleTranslate(text) {
    let modelUsed = "Local Model (Gemini Nano)";
    const sourceLang = "en";
    const targetLang = "es";
    if (!("Translator" in self)) {
      throw new Error("Translator API not supported. (Requires Chrome 138+)");
    }
    let availability = await Translator.availability({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
    
    async function ensureTranslator() {
      if (availability === "downloadable") {
        ui.outputDiv.innerHTML = `<span style="opacity:0.7">Downloading translator model...</span>`;
        await Translator.create({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          monitor: createDownloadMonitor(),
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
    const translated = await translator.translate(text);
    const htmlOutput = `
      <b>Original (${sourceLang.toUpperCase()}):</b><br>${escapeHtml(text)}<br><br>
      <b>Translated (${targetLang.toUpperCase()}):</b><br>${escapeHtml(translated)}
    `;
    return { translated, htmlOutput, modelUsed };
  }
  
  // --- Cloud API Call ---
  async function callGeminiCloudApi(prompt, apiKey) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(prompt.includes("youtube.com") && { 
            tools: [{ "google_search": {} }] 
          })
        })
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Cloud API Error: ${response.status} ${response.statusText}. Response: ${errorBody}`);
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

  // --- Prompt Generation ---
  function getCloudPromptForAction(text, action) {
    const mode = action.split('-').pop();
    
    if (action.startsWith("summarize_video-")) {
       const videoUrl = text;
       switch (mode) {
         case "tldr":
           return `Summarize this YouTube video in one or two concise sentences: ${videoUrl}`;
         case "qa":
           return `Generate a list of questions and their answers from this YouTube video: ${videoUrl}`;
         case "action":
           return `Extract all action items from this YouTube video as a bulleted list: ${videoUrl}`;
         case "bullets":
         default:
           return `Summarize this YouTube video as a concise, bulleted list: ${videoUrl}`;
       }
    }
    
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

  function getLocalSummarizerOptionsForAction(mode) {
    switch (mode) {
      case "tldr":
        return { prompt: "Summarize this text in one or two concise sentences.", length: "short" };
      case "qa":
        return { prompt: "Generate a list of questions and answers from this text." };
      case "action":
        return { type: "key-points", prompt: "Extract action items from this text." };
      case "bullets":
      default:
        return { type: "key-points", format: "markdown", length: "medium" };
    }
  }

  // --- History Functions ---
  async function saveToHistory(original, result, action, htmlOutput = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get("aiHistory", (data) => {
        const history = data.aiHistory || [];
        const newItem = {
          original,
          result,
          action, // e.g., "summarize-bullets", "proofread", "translate"
          htmlOutput, // For proofread/translate
          timestamp: new Date().toISOString(),
        };
        history.unshift(newItem); // Add to front
        const limitedHistory = history.slice(0, 20); // Keep last 20
        chrome.storage.local.set({ aiHistory: limitedHistory }, resolve);
      });
    });
  }

  function loadAndRenderHistory() {
    chrome.storage.local.get("aiHistory", (data) => {
      const history = data.aiHistory || [];
      ui.historyContainer.innerHTML = ""; // Clear current list
      
      if (history.length === 0) {
        ui.historyContainer.innerHTML = `<span style="padding: 8px; display: block; color: #777;">No history yet.</span>`;
        return;
      }

      history.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.style.padding = "8px";
        itemDiv.style.borderBottom = "1px solid #eee";
        itemDiv.style.cursor = "pointer";
        itemDiv.style.display = "flex";
        itemDiv.style.flexDirection = "column";
        
        // --- Create Title & Action Indicator ---
        const resultText = document.createElement("span");
        resultText.textContent = item.result.substring(0, 70) + "...";
        
        const actionText = document.createElement("span");
        actionText.textContent = `Action: ${item.action}`;
        actionText.style.fontSize = "10px";
        actionText.style.color = "#333";
        actionText.style.fontWeight = "bold";
        actionText.style.marginTop = "4px";

        const dateText = document.createElement("span");
        dateText.textContent = new Date(item.timestamp).toLocaleString();
        dateText.style.fontSize = "10px";
        dateText.style.color = "#777";
        dateText.style.marginTop = "4px";
        
        itemDiv.appendChild(resultText);
        itemDiv.appendChild(actionText);
        itemDiv.appendChild(dateText);

        // Add hover effect
        itemDiv.onmouseenter = () => itemDiv.style.backgroundColor = "#f9f9f9";
        itemDiv.onmouseleave = () => itemDiv.style.backgroundColor = "transparent";

        // Add click to restore
        itemDiv.onclick = () => {
          ui.textarea.value = item.original;
          ui.errorDiv.style.display = "none";
          ui.modelStatusDiv.textContent = "Loaded from history.";
          
          // Restore output based on type
          if (item.htmlOutput) {
            ui.outputDiv.innerHTML = item.htmlOutput;
          } else {
            // Default for summaries
            ui.outputDiv.innerHTML = item.result.replace(/\n/g, '<br>');
          }
          
          ui.copyButton.style.display = 'block';
          ui.copyButton.onclick = () => copyToClipboard(item.result, ui.copyButton);
        };
        
        ui.historyContainer.appendChild(itemDiv);
      });
    });
  }
  // --- END History Functions ---

  // --- Helpers ---
  function createDownloadMonitor() {
    return (m) => {
      m.addEventListener("downloadprogress", (e) => {
        const percent = Math.round(e.loaded * 100);
        ui.outputDiv.innerHTML = `<span style="opacity:0.7">Downloading model... ${percent}%</span>`;
      });
    };
  }
  
  function showError(message) {
    ui.outputDiv.innerHTML = "";
    ui.errorDiv.textContent = `Error: ${message}`;
    ui.errorDiv.style.display = "block";
    ui.copyButton.style.display = "none";
  }

  function clearMessages() {
    ui.outputDiv.innerHTML = "";
    ui.errorDiv.textContent = "";
    ui.errorDiv.style.display = "none";
    ui.modelStatusDiv.textContent = "";
    ui.copyButton.style.display = "none";
    ui.copyButton.onclick = null;
  }

  function resetButton(button, text) {
    button.disabled = false;
    button.textContent = text;
  }

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function copyToClipboard(text, buttonElement) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (buttonElement) {
        buttonElement.textContent = 'Copied!';
        setTimeout(() => { buttonElement.textContent = 'Copy'; }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      if (buttonElement) buttonElement.textContent = 'Failed!';
    }
    document.body.removeChild(textarea);
  }

  // --- Attach Main Event Listeners ---
  [ui.summarizeButton, ui.proofreadButton, ui.translateButton].forEach((btn) => {
    btn.addEventListener("click", handleAiAction);
  });
});

