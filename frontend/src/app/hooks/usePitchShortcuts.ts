import { useEffect } from 'react';
import { getPitchState, nextPitchSlide, prevPitchSlide, setPitchActive, setPitchMinimized } from '../stores/pitchStore';

export function usePitchShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Pitch Mode: Ctrl+Shift+T
      if (e.key.toLowerCase() === 't' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        const { isActive, isMinimized, currentIndex, slides } = getPitchState();
        
        if (isActive && isMinimized) {
          // Retomar da minimização com o atalho
          setPitchMinimized(false);
          return;
        }

        setPitchActive(!isActive);
        return;
      }

      // Se Pitch Mode não estiver ativo, ignoramos as setas
      const { isActive } = getPitchState();
      if (!isActive) return;

      // Autocrítica (Self-Refine): Proteção contra digitação no sistema real
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toUpperCase();
        const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isContentEditable) {
          // Usuário está digitando em um campo do sistema. NÃO avance o slide.
          return;
        }
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextPitchSlide();
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPitchSlide();
      }
    };

    // Usando capture phase para garantir que o evento chegue antes de outros handlers da aplicação
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
