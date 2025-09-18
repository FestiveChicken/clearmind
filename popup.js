// Root Container
const root = document.body;
root.style.fontFamily = "Arial, sans-serif"
root.style.width = "300px"
root.style.padding = "10px"

//Title
const title = document.createElement("h3")
title.textContent = "Summarize"
root.appendChild(title)

//Text Area
const textarea = document.createElement("textarea")
textarea.id = "inputText"
textarea.placeholder = "Paste text here:"
textarea.style.width = "100%"
textarea.style.height = "80px"
textarea.style.marginBottom = "10px"
root.appendChild(textarea)

//Summarize Button
const button = document.createElement("button")
button.id = "summarizeButton"
button.textContent = "Summarize"
button.style.width = "100%"
button.style.padding = "8px"
root.appendChild(button)

//Output
const outputDiv = document.createElement("div")
outputDiv.id = "output"
outputDiv.style.marginTop = "10px"
outputDiv.style.fontSize = "14px"
root.appendChild(outputDiv)

window.ClearMindUI = { textarea, button, outputDiv };