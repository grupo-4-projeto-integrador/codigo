import { motion } from 'motion/react';
import type { PitchSlide } from '../../stores/pitchStore';
import { X, ChevronLeft, ChevronRight, GripHorizontal, Minus } from 'lucide-react';
import { setPitchActive, nextPitchSlide, prevPitchSlide, setPitchMinimized } from '../../stores/pitchStore';

interface Props {
  slide: PitchSlide;
  current: number;
  total: number;
}

export function FloatingCard({ slide, current, total }: Props) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-8 top-24 w-80 bg-white dark:bg-[#18181B] rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col"
      style={{ zIndex: 999999 }}
    >
      {/* Drag Handle & Header */}
      <div className="bg-gray-50 dark:bg-[#1f1f22] border-b border-gray-200 dark:border-zinc-800 p-2 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex flex-col ml-2">
          <GripHorizontal className="w-4 h-4 text-gray-400" />
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
          Pitch Mode
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setPitchMinimized(true)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 transition-colors"
            title="Minimizar Pitch Mode"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setPitchActive(false)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 transition-colors"
            title="Sair do Pitch Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 cursor-default">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
          {slide.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">
          {slide.content}
        </p>
      </div>

      {/* Footer & Navigation */}
      <div className="p-4 bg-gray-50 dark:bg-[#1f1f22] border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between cursor-default">
        <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">
          Slide {current + 1} de {total}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => prevPitchSlide()}
            disabled={current === 0}
            className="p-1.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Anterior (Setinha Esquerda)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => nextPitchSlide()}
            disabled={current === total - 1}
            className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Próximo (Setinha Direita)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
