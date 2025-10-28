// Wait for the UI to be built
document.addEventListener("DOMContentLoaded", () => {
  const ui = window.ClearMindUI;
  if (!ui) {
    console.error("ClearMindUI not found. popup.js must run first.");
    return;
  }

  // --- Main Handler ---
  const handleAiAction = async (event) => {
    const action = event.target.dataset.action;
    console.log("Button clicked, action =", action);

    const inputText = ui.textarea.value.trim();
    if (!inputText) {
      showError("Please enter some text first.");
      return;
    }

    clearMessages();
    ui.outputDiv.textContent = "Processing...";
    const button = event.target;
    button.disabled = true;
    button.textContent = "Working...";

    try {
      // === PROOFREAD ===
      if (action === "proofread") {
        if (!("Proofreader" in self)) {
          throw new Error("Proofreader API not supported in this browser.");
        }

        const availability = await Proofreader.availability();
        console.log("Proofreader.availability() returned:", availability);

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

        // Model is ready
        const proofreader = await Proofreader.create({
          expectedInputLanguages: ["en"],
          expectedOutputLanguages: ["en"],
        });

        const result = await proofreader.proofread(inputText);
        console.log("Proofread result object:", result);

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
        console.log("Summarizer.availability() returned:", availability);

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

        const summarizer = await Summarizer.create({
          type: "key-points",
          format: "markdown",
          length: "medium",
        });

        const summary = await summarizer.summarize(inputText);
        if (!summary) throw new Error("No summary returned. Try different input.");

        ui.outputDiv.textContent = summary;
      }

      // === TRANSLATE ===
      else if (action === "translate") {
        if (!("Translator" in self)) {
          throw new Error("Translator API not supported. (Requires Chrome 138+)");
        }

        const sourceLang = "en";
        const targetLang = "es";

        let availability = await Translator.availability({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        });
        console.log("Translator.availability() returned:", availability);

        // Helper: ensure model download and readiness
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

            // Wait for model readiness
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

    } catch (err) {
      console.error("AI API error:", err);
      showError(err.message);
    } finally {
      button.disabled = false;
      button.textContent = capitalize(action);
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

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  [ui.summarizeButton, ui.proofreadButton, ui.translateButton].forEach((btn) => {
    btn.addEventListener("click", handleAiAction);
  });
});
