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

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type !== "clearmind-action") return;

  const { action, text } = msg;
  const bubble = showBubble(`Processing ${action}...`, true);

  try {
    if (action === "summarize") {
      if (!("Summarizer" in self)) throw new Error("Summarizer API not supported.");
      const availability = await Summarizer.availability();
      if (availability === "downloadable") {
        showBubble("Downloading summarizer model...", true);
        await Summarizer.create({
          monitor(m) {
            m.addEventListener("downloadprogress", (e) =>
              showBubble(`Downloading... ${Math.round(e.loaded * 100)}%`, true)
            );
          },
        });
      }
      const summarizer = await Summarizer.create({
        type: "key-points",
        format: "markdown",
        length: "medium",
      });
      const summary = await summarizer.summarize(text);
      showBubble(`<b>Summary:</b><br>${summary}`);
    }

    else if (action === "proofread") {
      if (!("Proofreader" in self))
        throw new Error("Proofreader API not supported.");
      const availability = await Proofreader.availability();
      if (availability === "downloadable") {
        showBubble("Downloading proofreader model...", true);
        await Proofreader.create({
          expectedInputLanguages: ["en"],
          expectedOutputLanguages: ["en"],
          monitor(m) {
            m.addEventListener("downloadprogress", (e) =>
              showBubble(`Downloading... ${Math.round(e.loaded * 100)}%`, true)
            );
          },
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
      showBubble(`<b>Proofread:</b><br>${corrected.join("")}`);
    }

    else if (action === "translate") {
      if (!("Translator" in self))
        throw new Error("Translator API not supported.");

      const sourceLang = "en";
      const targetLang = "es";

      let availability = await Translator.availability({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });

      async function ensureTranslator() {
        if (availability === "downloadable") {
          showBubble("Downloading translator model... please wait", true);
          await Translator.create({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            monitor(m) {
              m.addEventListener("downloadprogress", (e) =>
                showBubble(
                  `Downloading translator model... ${Math.round(e.loaded * 100)}%`,
                  true
                )
              );
            },
          });

          // Wait until model becomes available
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

        if (availability !== "available")
          throw new Error("Translator model unavailable after download.");

        return await Translator.create({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        });
      }

      const translator = await ensureTranslator();
      const translated = await translator.translate(text);
      showBubble(
        `<b>Translated (${targetLang.toUpperCase()}):</b><br>${translated}`
      );
    }

  } catch (err) {
    console.error("AI error:", err);
    showBubble(`<b>Error:</b> ${err.message}`);
  } finally {
    hideBubble();
  }
});
