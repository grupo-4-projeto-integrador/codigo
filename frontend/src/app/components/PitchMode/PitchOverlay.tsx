import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getPitchState, subscribePitchState, setPitchMinimized, setPitchActive } from '../../stores/pitchStore';
import { FloatingCard } from './FloatingCard';
import { Presentation, X as XIcon } from 'lucide-react';
import { useLocation } from 'react-router';

export function PitchOverlay() {
  const [pitchState, setPitchState] = useState(getPitchState());
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = subscribePitchState(() => {
      setPitchState(getPitchState());
    });
    return unsubscribe;
  }, []);

  if (!pitchState.isActive) return null;

  const currentSlide = pitchState.slides[pitchState.currentIndex];

  return (
    // Wrapper global, fixo acima de modais, ignorando cliques (pointer-events-none)
    // Permite que o mouse passe livremente para a aplicação por trás.
    <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        {!pitchState.isMinimized ? (
          // Removemos a key={currentSlide.id} para que o componente FloatingCard não seja destruído/recriado a cada slide.
          // Isso preserva perfeitamente as coordenadas X e Y do drag do framer-motion durante toda a apresentação.
          <FloatingCard 
            key="main-pitch-card"
            slide={currentSlide} 
            current={pitchState.currentIndex} 
            total={pitchState.slides.length} 
          />
        ) : (
          <motion.div
            key="minimized-widget"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-2"
          >
            <div className="bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 max-w-[280px]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  Pitch Minimizado
                </div>
                <button
                  onClick={() => setPitchActive(false)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Encerrar pitch definitivamente"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                A navegação está 100% livre. Clique abaixo ou use <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-zinc-700">Ctrl+Shift+T</kbd> para retomar.
              </p>
              <button
                onClick={() => setPitchMinimized(false)}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
              >
                <Presentation className="w-4 h-4" />
                Retomar Apresentação
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
