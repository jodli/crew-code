import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { initTheme } from "./lib/theme.ts";
import "./styles/globals.css";

initTheme();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(<App />);
