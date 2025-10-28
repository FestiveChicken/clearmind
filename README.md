# ClearMind – AI-Powered Chrome Extension

🧠 *“Your thought partner for focus, clarity, and productivity.”*

---

## 📌 Description
ClearMind is a Chrome extension that helps users structure their thoughts, reduce mental clutter, and stay focused.  
It leverages built-in AI APIs to provide quick summaries, task breakdowns, and personalized focus prompts — directly in your browser.

- **Problem**: Many people get overwhelmed by scattered ideas and distractions while working online.  
- **Solution**: ClearMind offers an AI-powered companion that organizes thoughts and simplifies decision-making.

---

## 🚧 Status
⚠️ **Work in progress** – Currently under active development for the Google Hackathon  

---

## 🛠️ How to Use (Developer Mode)
1. Clone or download this repository.  
2. Open `chrome://extensions/` in Chrome.  
3. Enable **Developer Mode** (toggle top-right).  
4. Click **Load unpacked** and select the `clearmind-extension` folder.  
5. The extension will now be available in your toolbar.  

---

## 🧩 Built-in Chrome AI APIs

ClearMind integrates on-device generative AI features available in Chrome 138+ through the new family of browser-native APIs.
These features run entirely in the browser — no external API keys, servers, or user data uploads required.

## 🧠 1. Summarizer API

Purpose: Condenses long passages of text into concise summaries or bullet points.

Namespace: Summarizer

Used in: logic.js, content.js

Availability check:

if ('Summarizer' in self) { /* supported */ }
const availability = await Summarizer.availability();


Modes:

type: "key-points" – returns bullet summaries

format: "markdown" – preserves structure

length: "medium" – balanced summary length

When the model is not yet downloaded, ClearMind automatically handles the model download progress and retries once it becomes available.

## ✍️ 2. Proofreader API

Purpose: Detects and corrects grammar, punctuation, and style issues in English text.

Namespace: Proofreader

Used in: logic.js, content.js

Availability check:

if ('Proofreader' in self) { /* supported */ }
const availability = await Proofreader.availability();


Options:

expectedInputLanguages: ['en']

expectedOutputLanguages: ['en']

Returns a set of text corrections (startIndex, endIndex, replacement) which are automatically applied to reconstruct a cleaned version of the original text.

## 🌐 3. Translator API

Purpose: Translates text locally between supported language pairs using on-device AI models.

Namespace: Translator

Used in: logic.js, content.js

Availability check:

if ('Translator' in self) { /* supported */ }
const availability = await Translator.availability({
  sourceLanguage: 'en',
  targetLanguage: 'es',
});


Automatic model download: ClearMind automatically starts downloading the translation model if it isn’t available and continues to translation once ready — no second click required.

Default configuration: English → Spanish
(Support for other target languages planned.)

## ⚙️ Origin Trial Setup (for Chrome Extensions)

To enable these APIs before full public release, ClearMind uses a Chrome Origin Trial token.

Add the token to your extension’s manifest.json:

"trial_tokens": [
  "YOUR_ORIGIN_TRIAL_TOKEN_HERE"
]


Chrome will automatically grant access to the Summarizer, Proofreader, and Translator APIs for the extension’s origin:

chrome-extension://<your-extension-id>/


For more details, see:

Chrome Summarizer API Documentation

Chrome Proofreader API Documentation

Chrome Translator API Documentation

Chrome Origin Trials Overview

## 🧱 Architecture Overview
File	Purpose
popup.html	Defines popup UI loaded by the extension toolbar button
popup.js	Builds the popup UI dynamically
logic.js	Core logic for Summarizer, Proofreader, Translator (popup actions)
background.js	Handles right-click (context menu) actions
content.js	Injected into pages; performs AI processing and shows floating results
manifest.json	Extension configuration, permissions, and trial tokens

## 📜 License
This project is licensed under the [MIT License](LICENSE).
