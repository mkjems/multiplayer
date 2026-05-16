import { initializeHomeScreenSuggestion } from "./home-screen-suggestion.ts";

const input = document.getElementById("name");
const btn = document.getElementById("enter");
const form = document.getElementById("landing-form");

if (!(input instanceof HTMLInputElement)) {
  throw new Error("Missing required input element: #name");
}
if (!(btn instanceof HTMLButtonElement)) {
  throw new Error("Missing required button element: #enter");
}
if (!(form instanceof HTMLFormElement)) {
  throw new Error("Missing required form element: #landing-form");
}

const nameInput = input;
const enterButton = btn;
const landingForm = form;
let isSubmitting = false;

nameInput.focus();
initializeHomeScreenSuggestion();

nameInput.addEventListener("input", () => {
  enterButton.disabled = isSubmitting || nameInput.value.trim().length === 0;
});

async function notifyVisitor(name: string): Promise<void> {
  await fetch("/api/visitor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
    keepalive: true,
  });
}

async function submit(): Promise<void> {
  const name = nameInput.value.trim();
  if (!name || isSubmitting) return;

  isSubmitting = true;
  enterButton.disabled = true;
  sessionStorage.setItem("playerName", name);

  try {
    await notifyVisitor(name);
  } catch (error) {
    console.error("Failed to notify visitor endpoint", error);
  }

  globalThis.location.href = "/lobby.html";
}

landingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void submit();
});
