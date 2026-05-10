const input = document.getElementById("name");
const btn = document.getElementById("enter");

input.focus();

input.addEventListener("input", () => {
  btn.disabled = input.value.trim().length === 0;
});

function submit() {
  const name = input.value.trim();
  if (!name) return;
  sessionStorage.setItem("playerName", name);
  globalThis.location.href = "/lobby.html";
}

btn.addEventListener("click", submit);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});
