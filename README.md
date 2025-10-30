# **ClearMind: Your AI Thought Partner**

**ClearMind** is a powerful Chrome extension that integrates on-device AI (Gemini Nano) with a cloud fallback (Gemini 2.5 Flash) to help you summarize, proofread, and translate the web.

It works from the extension popup, a right-click context menu, and a keyboard shortcut, saving all your results to a convenient history tab.

## **✨ Features**

* **Hybrid AI:** Automatically uses the local Gemini Nano model for speed and privacy. If Nano is unavailable, it seamlessly falls back to the powerful Gemini 2.5 Flash cloud API (requires a user-provided API key).  
* **Multiple Summarizers:**  
  * **Text Summary:** Summarize any selected text on the web.  
  * **YouTube Video Summary:** Summarize YouTube videos by pasting the URL into the popup or right-clicking on a video page.  
* **Advanced Summary Modes:** Choose your summary format:  
  * TL;DR (1-2 sentences)  
  * Bullet Points  
  * Q\&A Style  
  * Action Items  
* **On-Device Proofreader:** Fix grammar and spelling in any selected text (en-US).  
* **On-Device Translator:** Translate selected text from English to Spanish (en → es).  
* **Convenient Access:**  
  * **Extension Popup:** Paste text or a YouTube URL.  
  * **Context Menu:** Right-click selected text or a YouTube page.  
  * **Keyboard Shortcut:** Press Ctrl+Shift+S (or Cmd+Shift+S) to summarize selected text.  
* **Persistent History:** Automatically saves your last 20 summaries, proofreads, and translations. View them, reload them, and copy them from the "History" tab in the popup.  
* **Copy to Clipboard:** Instantly copy any AI-generated result with a single click.

## **🛠️ How to Use**

1. **Clone or download** this repository.  
2. Open chrome://extensions/ in your Chrome browser.  
3. Enable **Developer Mode** (top-right toggle).  
4. Click **Load unpacked** and select the folder containing this code.  
5. Pin the ClearMind icon to your toolbar.

**Setup (Required for Cloud Fallback):**

1. Click the ClearMind icon to open the popup.  
2. Go to the "Settings" tab.  
3. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).  
4. Paste your API key into the input field and click **Save Key**.

## **🧠 Core AI Technology**

ClearMind uses a "local-first" approach for speed and privacy.

### **1\. On-Device AI (Gemini Nano)**

The extension primarily uses the AI APIs built directly into Chrome:

* **Summarizer**: Used for all text summarization modes (TL;DR, Bullets, etc.) when the local model is available.  
* **Proofreader**: Used for the "Proofread" function.  
* **Translator**: Used for the "Translate" function.

This logic is triggered by checking if ("Summarizer" in self), etc.

### **2\. Cloud AI Fallback (Gemini 2.5 Flash)**

If a local model is unavailable (e.g., Summarizer.availability() returns "unavailable"), the extension automatically switches to the cloud-based gemini-2.5-flash-preview-09-2025 model via the Google AI API.

* This provides a robust and reliable experience for all users.  
* It is **required** for summarizing YouTube video URLs, as this action uses the Google Search tool to fetch video information.

## **🧱 Architecture**

| File | Purpose |
| :---- | :---- |
| popup.html | The HTML structure for the extension popup. |
| popup.js | Dynamically builds all UI elements for the popup (buttons, tabs, history list, etc.). |
| logic.js | The "main" function for the popup. Handles all button clicks, API calls (local and cloud), and history management. |
| background.js | Creates all right-click context menu items (for text and YouTube pages). Listens for the Ctrl+Shift+S keyboard shortcut. |
| content.js | Injected into web pages to show the floating result bubble. Contains all logic for handling messages from the background.js script. |
| manifest.json | Configures the extension, sets permissions (storage, contextMenus, scripting), registers AI features, and defines the keyboard shortcut. |

## **📜 License**

This project is licensed under the [MIT License](https://www.google.com/search?q=LICENSE).