import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { RouterProvider } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";

export default function App() {
  const themeStorageKey = "theme";
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (savedTheme === "dark") {
      return true;
    }
    if (savedTheme === "light") {
      return false;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    const theme = darkMode ? "dark" : "light";

    root.dataset.theme = theme;
    root.classList.toggle("dark", darkMode);
    window.localStorage.setItem(themeStorageKey, theme);
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      const isDark = root.dataset.theme === "dark" || root.classList.contains("dark");
      setDarkMode(isDark);
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

    window.addEventListener("storage", syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <button
        type="button"
        onClick={() => setDarkMode((current) => !current)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold"
        style={{
          backgroundColor: "var(--color-surface-2)",
          color: "var(--color-text-primary)",
          boxShadow: "var(--shadow-card)",
          borderWidth: "var(--border-width)",
          borderStyle: "solid",
          borderColor: "var(--color-brand)"
        }}
        aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
        title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">{darkMode ? "Claro" : "Escuro"}</span>
      </button>
      <Toaster />
    </>
  );
}
