import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getSelectedApoliceLuc, setFullscreenTableOpen } from "../app/store";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger single key shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Close modal behavior (Escape is usually handled by Radix/Shadcn, but we broadcast just in case)
      if (e.key === "Escape") {
        if (isInput) {
          target.blur();
        }
        window.dispatchEvent(new CustomEvent("close-modals"));
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case "d":
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("toggle-dark-mode"));
              break;

            case "n":
              e.preventDefault();
              navigate("/seguros/apolice/nova");
              break;
            case "e":
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("export-filter"));
              break;
            case "f":
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("focus-search"));
              break;
            case "a":
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("open-audit-log"));
              break;
          }
        } else if (e.key.toLowerCase() === "k") {
          // handled by CommandPalette internally, but we can broadcast it too
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }
      } else if (!isInput) {
        if (e.altKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          setIsShortcutsModalOpen(true);
        } else if (e.altKey && e.key.toLowerCase() === "c") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("toggle-sidebar"));
        } else if (e.altKey && e.key.toLowerCase() === "h") {
          e.preventDefault();
          navigate("/seguros");
          window.dispatchEvent(new CustomEvent("go-visao-geral"));
        } else if (e.altKey && e.key.toLowerCase() === "n") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("abrir-notificacoes"));
        } else if (e.altKey && e.key.toLowerCase() === "t") {
          e.preventDefault();
          setFullscreenTableOpen(true);
        } else {
          switch (e.key) {
            case "r":
            case "R":
              const lucToView = getSelectedApoliceLuc();
              if (lucToView) {
                e.preventDefault();
                navigate(`/seguros/apolice/${lucToView}`);
              }
              break;
            case "e":
            case "E":
              const lucToEdit = getSelectedApoliceLuc();
              if (lucToEdit) {
                e.preventDefault();
                navigate(`/seguros/apolice/${lucToEdit}/editar`);
              }
              break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return { isShortcutsModalOpen, setIsShortcutsModalOpen };
}
