import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "reshaped/themes/slate/theme.css";
import "./app/global.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
