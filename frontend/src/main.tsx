import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ProductionApp from "./App-Production";
import "./styles/theme.css";
import "./styles/index.css";

// Global error boundary for development
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProductionApp />
  </StrictMode>
);
