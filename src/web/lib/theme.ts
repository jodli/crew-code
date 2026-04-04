export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "crew-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme === "system" ? getSystemTheme() : theme);
}

export function initTheme() {
  const stored = getStoredTheme();
  applyTheme(stored === "system" ? getSystemTheme() : stored);

  // React to OS changes when set to "system"
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getStoredTheme() === "system") {
      applyTheme(getSystemTheme());
    }
  });
}
