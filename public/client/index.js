"use strict";
const input = document.getElementById("name");
const btn = document.getElementById("enter");
if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing required input element: #name");
}
if (!(btn instanceof HTMLButtonElement)) {
    throw new Error("Missing required button element: #enter");
}
const nameInput = input;
const enterButton = btn;
nameInput.focus();
nameInput.addEventListener("input", () => {
    enterButton.disabled = nameInput.value.trim().length === 0;
});
function submit() {
    const name = nameInput.value.trim();
    if (!name)
        return;
    sessionStorage.setItem("playerName", name);
    globalThis.location.href = "/lobby.html";
}
enterButton.addEventListener("click", submit);
nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
        submit();
});
