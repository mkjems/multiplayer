import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "../touch-controls.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing required element: #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
