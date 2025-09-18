document.getElementById("simplify").addEventListener("click", () => {
  const input = document.getElementById("input").value;
  document.getElementById("output").innerText = 
    "You entered: " + input;
});