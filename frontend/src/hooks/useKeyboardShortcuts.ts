import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { getSelectedApoliceLuc, setFullscreenTableOpen, getFullscreenTableOpen } from "../app/store";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
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
        
        let handled = false;

        if (getFullscreenTableOpen()) {
          setFullscreenTableOpen(false);
          handled = true;
        }



        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          handled = true;
        }
        
        window.dispatchEvent(new CustomEvent("close-modals"));

        if (!handled && (location.pathname === "/apresentacao" || location.pathname === "/graph")) {
          navigate("/seguros");
        }
        return;
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
            case "p":
              e.preventDefault();
              if (location.pathname === "/apresentacao") {
                navigate("/seguros");
              } else {
                navigate("/apresentacao");
              }
              break;
          }
        } else if (e.key.toLowerCase() === "k") {
          // handled by CommandPalette internally, but we can broadcast it too
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }
      } else if (!isInput) {
        if (e.altKey && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
          e.preventDefault();
          setIsShortcutsModalOpen(true);
        } else if (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("toggle-sidebar"));
        } else if (e.altKey && (e.key.toLowerCase() === "h" || e.code === "KeyH")) {
          e.preventDefault();
          if (location.pathname === "/seguros") {
            navigate(-1);
          } else {
            navigate("/seguros");
          }
          window.dispatchEvent(new CustomEvent("go-visao-geral"));
        } else if (e.altKey && (e.key.toLowerCase() === "n" || e.code === "KeyN")) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("abrir-notificacoes"));
        } else if (e.altKey && (e.key.toLowerCase() === "t" || e.code === "KeyT")) {
          e.preventDefault();
          setFullscreenTableOpen(!getFullscreenTableOpen());
        } else if (e.altKey && (e.key.toLowerCase() === "g" || e.code === "KeyG")) {
          e.preventDefault();
          if (location.pathname === "/graph") {
            navigate("/seguros");
          } else {
            navigate("/graph");
          }
          return;
        } else if (e.altKey && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("trigger-snapshot"));
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
  }, [navigate, location.pathname, isShortcutsModalOpen]);

  return { isShortcutsModalOpen, setIsShortcutsModalOpen };
}
