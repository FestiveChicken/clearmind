// --- Bubble UI Functions ---
function showBubble(message, loading = false) {
  let bubble = document.getElementById("clearmind-bubble");
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = "clearmind-bubble";
    bubble.style.position = "fixed";
    bubble.style.bottom = "20px";
    bubble.style.right = "20px";
    bubble.style.maxWidth = "300px";
    bubble.style.background = "#1e1e1e";
    bubble.style.color = "white";
    bubble.style.padding = "12px";
    bubble.style.borderRadius = "8px";
    bubble.style.fontSize = "14px";
    bubble.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
    bubble.style.zIndex = "999999";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.wordWrap = "break-word";
    document.body.appendChild(bubble);
  }
  bubble.innerHTML = loading
    ? `<span style="opacity:0.7">${message}</span>`
    : message;
  return bubble;
}

function hideBubble(delay = 8000) {
  setTimeout(() => {
    const bubble = document.getElementById("clearmind-bubble");
    if (bubble) bubble.remove();
  }, delay);
}

// --- Transcript Function ---
function getTranscript() {
  const segments = document.querySelectorAll(
    "ytd-transcript-segment-renderer .segment-text, .ytd-transcript-body-renderer .cue-group .cue"
  );
  if (!segments || segments.length === 0) return null;
  const textParts = [];
  segments.forEach(segment => textParts.push((segment.textContent || "").trim()));
  return textParts.join(" ");
}

// --- API Option Helpers ---
function getLocalSummarizerOptionsForAction(action) {
  const mode = action.split('-').pop();
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

function getCloudPromptForAction(text, action) {
  const mode = action.split('-').pop();
  if (action.startsWith("summarize_video-")) {
     const videoUrl = text;
     switch (mode) {
       case "tldr": return `Summarize this YouTube video in one or two concise sentences: ${videoUrl}`;
       case "qa": return `Generate a list of questions and their answers from this YouTube video: ${videoUrl}`;
       case "action": return `Extract all action items from this YouTube video as a bulleted list: ${videoUrl}`;
       default: return `Summarize this YouTube video as a concise, bulleted list: ${videoUrl}`;
     }
  }
  // Regular text
  switch (mode) {
    case "tldr": return `Summarize the following text in one or two concise sentences:\n\n${text}`;
    case "qa": return `Generate a list of questions and their answers from the following text:\n\n${text}`;
    case "action": return `Extract all action items from the following text as a bulleted list:\n\n${text}`;
    default: return `Summarize the following text as a concise, bulleted list:\n\n${text}`;
  }
}

// --- Cloud API Call ---
async function callGeminiCloudApi(text, apiKey, action) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const prompt = getCloudPromptForAction(text, action);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(action.startsWith("summarize_video-") && { 
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
    if (!summary) throw new Error("Cloud API returned an empty response.");
    return summary;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// --- Save to History Function ---
async function saveToHistory(original, result, action) {
  return new Promise((resolve) => {
    chrome.storage.local.get("aiHistory", (data) => {
      const history = data.aiHistory || [];
      const newItem = {
        original,
        result,
        action, // e.g., "summarize-bullets", "proofread"
        timestamp: new Date().toISOString(),
      };
      history.unshift(newItem); // Add to front
      const limitedHistory = history.slice(0, 20); // Keep last 20
      chrome.storage.local.set({ aiHistory: limitedHistory }, resolve);
    });
  });
}
// --- END ---

// --- Main Message Listener ---
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type !== "clearmind-action") return;

  let { action, text } = msg;

  if (text === "get_selection") {
    text = window.getSelection().toString().trim();
    if (!text) {
      showBubble("<b>Error:</b> No text selected. Select text and try the shortcut again.");
      hideBubble(4000);
      return;
    }
  }

  const bubble = showBubble(`Processing ${action}...`, true);

  try {
    // === YOUTUBE & TEXT SUMMARIZE ACTIONS ===
    if (action.startsWith("summarize-") || action.startsWith("summarize_video-")) {
      let contentToSummarize = text;
      let isVideo = action.startsWith("summarize_video-");
      let title = isVideo ? "Video Summary" : "Summary";
      let modelUsed = "Local Model (Gemini Nano)";
      
      if (isVideo) {
        showBubble("Finding transcript...", true);
        const transcript = getTranscript();
        if (!transcript) {
          throw new Error("Could not find transcript. Please open the video's transcript panel ('...') and try again.");
        }
        contentToSummarize = transcript;
      }
      
      let availability = "unavailable";
      if (!isVideo && "Summarizer" in self) {
         availability = await Summarizer.availability();
      }

      let summary = "";
      if (!isVideo && (availability === "available" || availability === "downloadable")) {
        // --- USE LOCAL MODEL ---
        if (availability === "downloadable") {
          showBubble("Downloading local model...", true);
          await Summarizer.create({ monitor: (m) => m.addEventListener("downloadprogress", (e) => showBubble(`Downloading... ${Math.round(e.loaded * 100)}%`, true)) });
        }
        const summarizerOptions = getLocalSummarizerOptionsForAction(action);
        const summarizer = await Summarizer.create(summarizerOptions);
        showBubble("Summarizing (local)...", true);
        summary = await summarizer.summarize(contentToSummarize);
      } else {
        // --- FALLBACK TO CLOUD API ---
        modelUsed = "Cloud Model (Gemini 2.5 Flash)";
        const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
        if (!geminiApiKey) {
          throw new Error("Local model unavailable. Please set your Gemini API key in the extension popup to use the cloud fallback.");
        }
        
        let apiText = isVideo ? text : contentToSummarize;
        showBubble("Calling Cloud API...", true);
        summary = await callGeminiCloudApi(apiText, geminiApiKey, action);
      }

      // Save Summary to History
      await saveToHistory(contentToSummarize, summary, action);

      let formattedSummary = summary.replace(/\n/g, '<br>');
      showBubble(`<b>${title} (${modelUsed}):</b><br>${formattedSummary}`);
    }

    // === PROOFREAD ===
    else if (action === "proofread") {
      if (!("Proofreader" in self)) throw new Error("Proofreader API not supported.");
      const availability = await Proofreader.availability();
      if (availability === "downloadable") {
        showBubble("Downloading proofreader model...", true);
        await Proofreader.create({
          expectedInputLanguages: ["en"],
          expectedOutputLanguages: ["en"],
          monitor: (m) => m.addEventListener("downloadprogress", (e) => showBubble(`Downloading... ${Math.round(e.loaded * 100)}%`, true)),
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
      let correctedText = corrected.join("");
      
      // Save Proofread to History
      await saveToHistory(text, correctedText, action);
      
      showBubble(`<b>Proofread:</b><br>${correctedText.replace(/\n/g, '<br>')}`);
    }

    // === TRANSLATE ===
    else if (action === "translate") {
      if (!("Translator" in self)) throw new Error("Translator API not supported.");
      const sourceLang = "en";
      const targetLang = "es";
      let availability = await Translator.availability({ sourceLanguage: sourceLang, targetLanguage: targetLang });

      async function ensureTranslator() {
        if (availability === "downloadable") {
          showBubble("Downloading translator model... please wait", true);
          await Translator.create({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            monitor: (m) => m.addEventListener("downloadprogress", (e) => showBubble(`Downloading translator... ${Math.round(e.loaded * 100)}%`, true)),
          });
          let attempts = 0;
          do {
            await new Promise((r) => setTimeout(r, 1000));
            availability = await Translator.availability({ sourceLanguage: sourceLang, targetLanguage: targetLang });
            attempts++;
          } while (availability !== "available" && attempts < 10);
        }
        if (availability !== "available") throw new Error("Translator model unavailable after download.");
        return await Translator.create({ sourceLanguage: sourceLang, targetLanguage: targetLang });
      }

      const translator = await ensureTranslator();
      const translated = await translator.translate(text);
      
      // Save Translation to History
      await saveToHistory(text, translated, action);
      
      showBubble(`<b>Translated (${targetLang.toUpperCase()}):</b><br>${translated.replace(/\n/g, '<br>')}`);
    }

  } catch (err) {
    console.error("AI error:", err);
    showBubble(`<b>Error:</b> ${err.message}`);
  } finally {
    if (bubble.innerHTML.includes("<b>")) {
      hideBubble(10000);
    } else {
      hideBubble(4000);
    }
  }
});

