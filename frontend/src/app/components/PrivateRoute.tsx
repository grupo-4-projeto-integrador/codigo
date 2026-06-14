import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { FullscreenTable } from "./FullscreenTable";
import { ShortcutsModal } from "./ShortcutsModal";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export function PrivateRoute() {
  const { token, loading } = useAuth();
  const location = useLocation();
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useKeyboardShortcuts();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const handleCaptureSnapshot = () => {
      if (isCapturing) return;
      setIsCapturing(true);
      toast.info("Processando snapshot da tela inteira, aguarde...");

      setTimeout(async () => {
        try {
          const dataUrl = await toPng(document.body, {
            pixelRatio: 1.5,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#0F1117' : '#F7F4EF',
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }
          });
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `sistema-snapshot-${new Date().toISOString().slice(0, 10)}.png`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.success("Snapshot capturado com sucesso!");
        } catch (err) {
          console.error("Erro ao capturar snapshot", err);
          toast.error("Erro ao capturar a imagem. Verifique o console.");
        } finally {
          setIsCapturing(false);
        }
      }, 150);
    };

    window.addEventListener("trigger-snapshot", handleCaptureSnapshot);
    return () => window.removeEventListener("trigger-snapshot", handleCaptureSnapshot);
  }, [isCapturing]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c4151f]" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <Outlet />
      <CommandPalette />
      <FullscreenTable />
      <ShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
    </>
  );
}
