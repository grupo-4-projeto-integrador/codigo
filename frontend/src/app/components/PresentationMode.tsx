import React from 'react';
import { motion } from 'motion/react';
import { Shield, Activity, X, LineChart } from 'lucide-react';
import logo from "../../imports/image-4.png";
import { PresentationGrid } from "./PresentationGrid";
import { SegmentRiskChart } from "./SegmentRiskChart";
import { ActionQueuePanel } from "./ActionQueuePanel";
import { KpiChartModal, KpiMetricType } from "./KpiChartModal";

import { usePresentationData } from "../../hooks/usePresentationData";

interface PresentationModeProps {
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1, notation: "compact", compactDisplay: "short" }).format(value);
};

export function PresentationMode({
  onClose
}: PresentationModeProps) {
  const {
    complianceRate, totalPolicies, expiringPolicies, percAVencer,
    expiredPolicies, percVencidas, totalCobertura, weeklyVariation,
    healthScore, lastSyncTime, selectedMapLuc, setSelectedMapLuc,
    sparklines
  } = usePresentationData();
  const [modalAberto, setModalAberto] = React.useState<KpiMetricType | null>(null);

  const renderSparkline = (color: string, pathData: { line: string; area: string; values: number[] }, gradientId: string) => {
    if (!pathData.values || pathData.values.length === 0) return null;
    return (
      <div className="relative mt-4 -mx-[1.2rem] w-[calc(100%+2.4rem)] opacity-80" style={{ cursor: 'pointer' }}>
        <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-gray-500 dark:text-[rgba(255,255,255,0.35)] z-10 font-medium pointer-events-none">
          <LineChart className="w-3 h-3" />
          expandir
        </span>
        <svg
          width="100%"
          height="44"
          viewBox="0 0 280 44"
          preserveAspectRatio="none"
          className="block overflow-hidden"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="75%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {pathData.area && (
            <motion.path 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.6, delay: 0.2 }} 
              d={pathData.area} 
              fill={`url(#${gradientId})`} 
            />
          )}

          {pathData.line && (
            <>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                d={pathData.line}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="280" cy={(() => {
                const values = pathData.values;
                if (!values || values.length === 0) return 22;
                const minY = 36;
                const maxY = 8;
                const minValue = Math.min(...values);
                const maxValue = Math.max(...values);
                const range = Math.max(maxValue - minValue, 1);
                const normalized = (values[values.length - 1] - minValue) / range;
                return minY - normalized * (minY - maxY);
              })()} r="2.5" fill={color} />
            </>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-[#F7F4EF] dark:bg-[#0a0a0a] pres-main-grid"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr auto',
        height: '100dvh',
        padding: 'clamp(16px, 2vw, 28px)',
        gap: 'clamp(12px, 1.5vw, 20px)',
      }}
    >
      <style>{`
        .pres-dynamic-layout {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-template-rows: minmax(0, 1fr) minmax(0, 1.2fr);
          grid-template-areas: 
            "map map map risco"
            "map map map acao";
        }
        @media (max-height: 800px) {
          .pres-main-grid {
            padding: 16px !important;
            gap: 12px !important;
          }
          .pres-dynamic-layout {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            grid-template-rows: minmax(0, 1fr);
            grid-template-areas: 
              "map map risco acao";
          }
        }
        .pres-side-panel, .pres-side-panel * {
          font-size: clamp(10px, 0.9vw, 13px);
        }
      `}</style>
      {/* Absolute Toggle Button (Bottom Center) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-1.5 rounded-full shadow-xl bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <span className="text-[12px] font-semibold tracking-wide">Modo Apresentação</span>
        <span className="opacity-30 mx-1">·</span>
        <kbd className="text-[10px] opacity-60 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">Esc</kbd>
        <button
          onClick={onClose}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
          title="Sair do modo apresentação"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* Row 1: Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#D92D20] rounded-[10px] flex items-center justify-center shadow-lg">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              Flamboyant <span className="font-light opacity-80">Shopping</span>
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 tracking-wide font-medium">Gestão de Apólices - Visão Geral</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end pt-1" style={{ minWidth: '180px' }}>
          <div className="font-[100] tracking-[-0.04em] leading-none text-gray-900 dark:text-white" style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}>
            {healthScore ? healthScore.score : '--'}
          </div>
          <div className="text-[11px] tracking-[0.1em] uppercase opacity-30 text-gray-900 dark:text-white mt-2 font-medium">
            Score de Saúde do Portfólio
          </div>
          <div className={`text-[14px] font-medium mt-2 flex items-center gap-1 ${healthScore?.delta && healthScore.delta < 0 ? 'text-[#D92D20]' : 'text-[#639922]'}`}>
            {healthScore?.delta && healthScore.delta !== 0 ? (
              <>
                {healthScore.delta > 0 ? '↑' : '↓'} {Math.abs(healthScore.delta)} pontos esta semana
              </>
            ) : (
              'Estável esta semana'
            )}
          </div>
        </div>
      </header>

      {/* Row 2: KPIs — 4 colunas desktop, 2 em laptop/mobile (P2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {/* Card 1: Taxa de Conformidade */}
        <div 
          onClick={() => setModalAberto('conformidade')}
          className="group relative bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          style={{ padding: 'clamp(12px, 1.2vw, 20px)' }}
        >
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">Taxa de Conformidade</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-[200] leading-none text-gray-900 dark:text-white" style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{Math.round(complianceRate)}</span>
            <span className="text-[16px] text-gray-400 dark:text-gray-500 font-light">/{totalPolicies}</span>
          </div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 font-medium">apólices conformes</div>
          <div className="text-[12px] font-medium text-[#639922] mt-4">↑ 16% vs semana anterior</div>
          {renderSparkline('#639922', sparklines.compliance, 'pres-kpi-1')}
        </div>

        {/* Card 2: A Vencer */}
        <div 
          onClick={() => setModalAberto('avencer')}
          className="group relative bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          style={{ padding: 'clamp(12px, 1.2vw, 20px)' }}
        >
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">A Vencer</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-[200] leading-none text-gray-900 dark:text-white" style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{expiringPolicies}</span>
            <span className="text-[16px] text-gray-400 dark:text-gray-500 font-light">apólices</span>
          </div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 font-medium">nos próximos 15 dias</div>
          <div className="text-[12px] font-medium text-[#F59E0B] mt-4">{percAVencer}% do total</div>
          {renderSparkline('#F59E0B', sparklines.expiring, 'pres-kpi-2')}
        </div>

        {/* Card 3: Vencidas */}
        <div 
          onClick={() => setModalAberto('vencidas')}
          className="group relative bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          style={{ padding: 'clamp(12px, 1.2vw, 20px)' }}
        >
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">Vencidas</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-[200] leading-none text-[#D92D20]" style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{expiredPolicies}</span>
            <span className="text-[16px] text-gray-400 dark:text-gray-500 font-light">apólices</span>
          </div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 font-medium">requerem ação imediata</div>
          <div className="text-[12px] font-medium text-[#D92D20] mt-4">{percVencidas}% do total</div>
          {renderSparkline('#D92D20', sparklines.expired, 'pres-kpi-3')}
        </div>

        {/* Card 4: Cobertura Total */}
        <div 
          onClick={() => setModalAberto('cobertura')}
          className="group relative bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          style={{ padding: 'clamp(12px, 1.2vw, 20px)' }}
        >
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">Cobertura Total</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-[200] leading-none text-gray-900 dark:text-white" style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{formatCurrency(totalCobertura)}</span>
          </div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 font-medium">valor total assegurado</div>
          <div className="text-[12px] font-medium text-[#639922] mt-4">↑ 10% vs semana anterior</div>
          {/* Mock sparkline for Cobertura Total to match image if no real data */}
          {renderSparkline('#639922', sparklines.compliance, 'pres-kpi-4')}
        </div>
      </div>

      {/* Row 3: Main Layout — Dynamic Grid Areas */}
      <div className="pres-dynamic-layout gap-4 lg:gap-5 min-h-0 w-full">
        
        {/* Left: Map */}
        <div style={{ gridArea: 'map' }} className="bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] px-6 pt-5 pb-1 flex flex-col min-h-0">
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-3 shrink-0">
            Mapa de Conformidade - {totalPolicies} lojas
          </div>
          <div className="flex-1 overflow-hidden min-h-0 pr-2 flex flex-col" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <PresentationGrid 
              selectedLuc={selectedMapLuc} 
              onSelectLuc={setSelectedMapLuc}
              hideHeader={true}
            />
          </div>
        </div>

        {/* Right 1: Risco */}
        <div style={{ gridArea: 'risco' }} className="pres-side-panel bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] p-5 flex flex-col min-h-0 relative">
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-4 shrink-0">Risco por Segmento</div>
          <div className="absolute inset-0 top-[40px] p-5 pt-0">
            <SegmentRiskChart isPresentationMode={true} />
          </div>
        </div>
        
        {/* Right 2: Ação Urgente */}
        <div style={{ gridArea: 'acao' }} className="pres-side-panel bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-[#222] flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 pb-3">
            <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 shrink-0">Ação Urgente</div>
          </div>
          <div className="flex-1 overflow-hidden px-5 pb-5">
            <ActionQueuePanel onSelectLuc={setSelectedMapLuc} isPresentationMode={true} />
          </div>
        </div>

      </div>

      {/* Row 4: Footer */}
      <footer className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-white/20 mt-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#168821]"></span> Conforme</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> A Vencer (15d)</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#a0191e]"></span> Vencido</div>
        </div>
        <div>
          {lastSyncTime ? `Sincronizado há ${Math.floor((Date.now() - lastSyncTime.getTime()) / 60000)} min • dados: ${lastSyncTime.toLocaleString('pt-BR')}` : 'Sincronizado recentemente'}
        </div>
      </footer>
      {/* Modal */}
      {modalAberto && (
        <KpiChartModal
          isOpen={!!modalAberto}
          onClose={() => setModalAberto(null)}
          metrica={modalAberto}
          historyValues={
            modalAberto === 'conformidade' ? sparklines.compliance.values :
            modalAberto === 'avencer' ? sparklines.expiring.values :
            modalAberto === 'vencidas' ? sparklines.expired.values :
            sparklines.compliance.values // mock fallback for cobertura since we don't have it in sparklines object here
          }
          svgPathData={
            modalAberto === 'conformidade' ? sparklines.compliance :
            modalAberto === 'avencer' ? sparklines.expiring :
            modalAberto === 'vencidas' ? sparklines.expired :
            sparklines.compliance // mock fallback
          }
          color={
            modalAberto === 'conformidade' ? '#639922' :
            modalAberto === 'avencer' ? '#F59E0B' :
            modalAberto === 'vencidas' ? '#D92D20' :
            '#639922' // mock fallback
          }
          presentationMode={true}
        />
      )}
    </div>
  );
}
