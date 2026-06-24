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
        // Correção infalível para mobile e telas longas:
        // O index.html tem html, body e #root travados em 100% com overflow hidden.
        // Precisamos destravar todos os pais até o <main> para o html-to-image renderizar o scroll
        const htmlEl = document.documentElement;
        const bodyEl = document.body;
        const rootEl = document.getElementById('root');
        const layoutEl = document.querySelector('.app-root') as HTMLElement;
        const mainContentEl = document.querySelector('.main-content') as HTMLElement;
        const mainEl = document.querySelector('main') as HTMLElement;
        
        const originalHtmlHeight = htmlEl.style.height;
        const originalHtmlOverflow = htmlEl.style.overflow;
        const originalBodyHeight = bodyEl.style.height;
        const originalBodyOverflow = bodyEl.style.overflow;
        const originalRootHeight = rootEl ? rootEl.style.height : '';
        const originalRootOverflow = rootEl ? rootEl.style.overflow : '';
        const originalLayoutHeight = layoutEl ? layoutEl.style.height : '';
        const originalLayoutOverflow = layoutEl ? layoutEl.style.overflow : '';
        const originalMainContentOverflow = mainContentEl ? mainContentEl.style.overflow : '';
        const originalMainContentHeight = mainContentEl ? mainContentEl.style.height : '';
        const originalMainOverflow = mainEl ? mainEl.style.overflow : '';
        const originalMainHeight = mainEl ? mainEl.style.height : '';

        // Expande o layout globalmente
        htmlEl.style.setProperty('height', 'auto', 'important');
        htmlEl.style.setProperty('overflow', 'visible', 'important');
        bodyEl.style.setProperty('height', 'auto', 'important');
        bodyEl.style.setProperty('overflow', 'visible', 'important');
        if (rootEl) {
          rootEl.style.setProperty('height', 'auto', 'important');
          rootEl.style.setProperty('overflow', 'visible', 'important');
        }
        if (layoutEl) {
          layoutEl.style.setProperty('height', 'auto', 'important');
          layoutEl.style.setProperty('overflow', 'visible', 'important');
        }
        if (mainContentEl) {
          mainContentEl.style.setProperty('height', 'auto', 'important');
          mainContentEl.style.setProperty('overflow', 'visible', 'important');
        }
        if (mainEl) {
          mainEl.style.setProperty('height', 'auto', 'important');
          mainEl.style.setProperty('overflow', 'visible', 'important');
        }

        // Aguarda 150ms para a DOM recalcular a altura e largura totais
        await new Promise(r => setTimeout(r, 150));

        try {
          const target = document.documentElement; // Pega o html todo
          const totalWidth = target.scrollWidth;
          const totalHeight = target.scrollHeight;

          const dataUrl = await toPng(target, {
            filter: (node: HTMLElement | Node) => {
              // Filtra notificações do Sonner e do driver.js para não saírem na imagem
              const el = node as HTMLElement;
              if (el?.hasAttribute && el.hasAttribute('data-sonner-toaster')) return false;
              if (el?.classList && el.classList.contains('driver-popover')) return false;
              if (el?.classList && el.classList.contains('snapshot-ignore')) return false;
              return true;
            },
            pixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 1.5,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#0F1117' : '#F7F4EF',
            width: totalWidth,
            height: totalHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: totalWidth + 'px',
              height: totalHeight + 'px',
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
          // Reverte os estilos
          htmlEl.style.height = originalHtmlHeight;
          htmlEl.style.overflow = originalHtmlOverflow;
          bodyEl.style.height = originalBodyHeight;
          bodyEl.style.overflow = originalBodyOverflow;
          if (rootEl) {
            rootEl.style.height = originalRootHeight;
            rootEl.style.overflow = originalRootOverflow;
          }
          if (layoutEl) {
            layoutEl.style.height = originalLayoutHeight;
            layoutEl.style.overflow = originalLayoutOverflow;
          }
          if (mainContentEl) {
            mainContentEl.style.overflow = originalMainContentOverflow;
            mainContentEl.style.height = originalMainContentHeight;
          }
          if (mainEl) {
            mainEl.style.overflow = originalMainOverflow;
            mainEl.style.height = originalMainHeight;
          }
          setIsCapturing(false);
        }
      }, 100);
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
