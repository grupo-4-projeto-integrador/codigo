import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subWeeks } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export type KpiMetricType = 'conformidade' | 'avencer' | 'vencidas' | 'cobertura';

interface KpiChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrica: KpiMetricType;
  historyValues: number[];
  svgPathData?: { line: string; area: string };
  color: string;
  presentationMode?: boolean;
}

const formatValue = (metrica: KpiMetricType, value: number) => {
  if (metrica === 'cobertura') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1, notation: 'compact' }).format(value);
  }
  if (metrica === 'conformidade') {
    return `${Math.round(value)}%`;
  }
  return value.toString();
};

export function KpiChartModal({ isOpen, onClose, metrica, historyValues, svgPathData, color, presentationMode }: KpiChartModalProps) {
  if (!isOpen) return null;

  const titleMap: Record<KpiMetricType, { title: string; subtitle: string }> = {
    conformidade: { title: 'Taxa de Conformidade', subtitle: 'Evolução histórica de lojas com apólices vigentes' },
    avencer: { title: 'Apólices a Vencer', subtitle: 'Apólices que vencerão nos próximos 15 dias' },
    vencidas: { title: 'Apólices Vencidas', subtitle: 'Total de apólices vencidas necessitando ação' },
    cobertura: { title: 'Cobertura Total', subtitle: 'Valor total segurado no shopping' }
  };

  const values = historyValues.length ? historyValues : Array(8).fill(0);
  const labels = values.map((_, i) => {
    if (presentationMode) {
      return format(subWeeks(new Date(), values.length - 1 - i), 'dd/MM');
    }
    return i === values.length - 1 ? 'Atual' : `Semana -${values.length - 1 - i}`;
  });
  
  // Calculate stats
  const atual = values[values.length - 1];
  const pico = Math.max(...values);
  const vale = Math.min(...values);
  const startValue = values[0];
  const variacao = startValue > 0 ? ((atual - startValue) / startValue) * 100 : 0;
  
  const { title, subtitle } = titleMap[metrica];

  const svgW = presentationMode ? 812 : 632;
  const svgH = presentationMode ? 200 : 120;
  const yMin = svgH - 4;
  const yMax = 10;
  const range = Math.max(pico - vale, 1);
  const getCy = (val: number) => yMin - ((val - vale) / range) * (yMin - yMax);
  const getCx = (idx: number) => (idx / (Math.max(values.length - 1, 1))) * svgW;

  const linePath = values.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getCx(i)} ${getCy(val)}`).join(' ');
  const areaPath = `${linePath} L ${svgW} ${svgH} L 0 ${svgH} Z`;

  const media = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const yMedia = getCy(media);
  const yPico = getCy(pico);
  const yVale = getCy(vale);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`p-0 border-gray-200 dark:border-[#222] bg-white dark:bg-[#151515] overflow-hidden sm:rounded-2xl ${presentationMode ? 'w-full sm:max-w-[860px] md:max-w-[860px] lg:max-w-[860px]' : 'w-full sm:max-w-[680px] md:max-w-[680px] lg:max-w-[680px]'}`}
        style={{ backdropFilter: 'blur(6px)', minHeight: presentationMode ? '520px' : 'auto' }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col"
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Grid de Stats */}
            <div className="grid grid-cols-4 gap-4 divide-x divide-gray-100 dark:divide-white/10">
              <div className="flex flex-col pl-2 first:pl-0">
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Atual</span>
                <span className="text-2xl font-light text-gray-900 dark:text-white" style={{ color }}>{formatValue(metrica, atual)}</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Pico (8 sem)</span>
                <span className="text-xl font-light text-gray-900 dark:text-white">{formatValue(metrica, pico)}</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Vale (8 sem)</span>
                <span className="text-xl font-light text-gray-900 dark:text-white">{formatValue(metrica, vale)}</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Variação</span>
                <span className={`text-xl font-medium ${variacao > 0 ? 'text-[#639922]' : variacao < 0 ? 'text-[#D92D20]' : 'text-gray-500'}`}>
                  {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className={`w-full relative -mx-2 ${presentationMode ? 'h-[200px]' : 'h-[120px]'}`}>
              <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" className="block overflow-visible">
                <defs>
                  <linearGradient id={`modal-gradient-${metrica}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {presentationMode && (
                  <>
                    <rect x="0" y={yPico} width="100%" height={Math.max(yVale - yPico, 1)} fill={color} fillOpacity="0.08" />
                    <line x1="0" x2="100%" y1={yMedia} y2={yMedia} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <text x="100%" y={yMedia - 4} textAnchor="end" fontSize="9px" fill="rgba(255,255,255,0.3)">média</text>
                  </>
                )}
                <motion.path 
                  d={areaPath} 
                  fill={`url(#modal-gradient-${metrica})`} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: presentationMode ? 2 : 0.5, delay: presentationMode ? 0.8 : 0.2, ease: "easeOut" }}
                />
                <motion.path 
                  d={linePath} 
                  fill="none" 
                  stroke={color} 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: presentationMode ? 2.5 : 0.6, ease: [0.25, 1, 0.5, 1] }}
                />
                {/* Dots for all values */}
                {values.map((v, i) => (
                  <motion.circle 
                    key={i} 
                    cx={getCx(i)} 
                    cy={getCy(v)} 
                    r="3.5" 
                    fill={color} 
                    className="cursor-pointer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      duration: presentationMode ? 0.8 : 0.3, 
                      delay: presentationMode ? (i * (2.5 / values.length)) : i * 0.05,
                      ease: "easeOut"
                    }}
                    whileHover={{ scale: 1.5 }}
                  />
                ))}
              </svg>
            </div>

            {/* Grid de Barras */}
            <div 
              className="grid gap-2 pt-2 border-t border-gray-100 dark:border-white/10"
              style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
            >
              {values.map((val, idx) => {
                const barHeight = pico > 0 ? Math.max((val / pico) * 100, 4) : 4;
                const isPico = val === pico;
                return (
                  <div key={idx} className={`flex flex-col items-center justify-end group relative ${presentationMode ? 'h-[100px]' : 'h-24'}`}>
                    {presentationMode && isPico && (
                      <span className="absolute -top-4 text-[9px] text-white whitespace-nowrap">↑ pico</span>
                    )}
                    <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-medium">
                      {formatValue(metrica, val)}
                    </span>
                    <motion.div 
                      className="w-full max-w-[20px] rounded-t-sm" 
                      initial={{ height: "0%" }}
                      animate={{ height: `${barHeight}%` }}
                      transition={{ 
                        duration: presentationMode ? 1.5 : 0.5, 
                        delay: presentationMode ? 0.2 + (idx * 0.1) : idx * 0.05,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      style={{ 
                        backgroundColor: color, 
                        opacity: presentationMode ? (idx === values.length - 1 ? 1 : 0.45) : (idx === values.length - 1 ? 1 : 0.4),
                        borderTop: presentationMode && isPico ? '2px solid rgba(255,255,255,0.4)' : undefined
                      }} 
                    />
                    <span className="text-[9px] text-gray-400 mt-2 truncate w-full text-center">
                      {labels[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
