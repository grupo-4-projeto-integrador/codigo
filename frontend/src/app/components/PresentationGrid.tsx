import { useEffect, useMemo, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { getDocumentos, getCoberturas } from "../../api/apolice";
import { downloadArquivo } from "../utils/downloadUtils";
import { exportApoliceParaPDF } from "../utils/exportUtils";
import { toast } from "sonner";
import { formatCNPJ } from "../utils/formatCNPJ";
import { ptBR } from "date-fns/locale";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { X, ChevronLeft, ChevronRight, FileText, Shield, Calendar, AlertTriangle, CheckCircle2, Clock, MapPin, FilePlus2, PencilLine, RefreshCw, Download, History, Loader2, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getSelectedApoliceLuc, subscribeSelectedApoliceLuc, getMapFilters, subscribeMapFilters, getSidebarCollapsed, subscribeSidebarCollapsed } from '../store';
import { useNavigate } from "react-router";
import { TIME_OFFSETS, WEEKS_PAST, getStatusAtDate, parseTooltipDate } from "../utils/timeline";

type MapLayoutItem = {
  luc: string;
  floor: number;
  position: number;
};

type ActivityRecentItem = {
  id: string;
  luc: string;
  nome_loja: string;
  acao: string;
  responsavel: string;
  timestamp: string;
};

// Colors based on user requirements
const COLORS = {
  conforme: { bg: "#168821", text: "#FFFFFF", label: "Conforme" },
  aVencer: { bg: "#f9e4a0", text: "#000000", label: "A vencer" },
  vencida: { bg: "#a0191e", text: "#FFFFFF", label: "Vencida" },
  semApolice: { bg: "#E5E7EB", text: "#374151", label: "Sem apólice" },
};

export function getStatusDetails(status?: string) {
  if (!status) return COLORS.semApolice;
  const s = status.toLowerCase().trim();
  if (s === "ativa" || s === "conforme") return COLORS.conforme;
  if (s === "a vencer") return COLORS.aVencer;
  if (s === "vencida") return COLORS.vencida;
  return COLORS.semApolice;
}



function getDaysDifference(from: Date, to: Date) {
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24));
}

export interface PresentationGridProps {
  selectedLuc: string | null;
  onSelectLuc: (luc: string | null) => void;
  hideHeader?: boolean;
}

export function PresentationGrid({ 
  selectedLuc, 
  onSelectLuc,
  hideHeader = false,
}: PresentationGridProps) {
  const navigate = useNavigate();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mapFilters, setMapFiltersState] = useState(getMapFilters);
  const [isSortedByScore, setIsSortedByScore] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getSidebarCollapsed());

  const containerRef = useRef<HTMLDivElement>(null);
  const [gridConfig, setGridConfig] = useState({ cols: 13, rows: 6, itemsPerPage: 78, squareSize: 20 });
  const [timeOffsetIdx, setTimeOffsetIdx] = useState(WEEKS_PAST);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTimeOffsetIdx((prev) => {
          if (prev >= TIME_OFFSETS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const policyList = await listApolices();

        if (!active) return;
        setApolices(policyList);
      } catch {
        if (active) setError("Não foi possível carregar o mapa de conformidade.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // The ResizeObserver will be placed after allLucs initialization

  // Subscribe to map dim filters from store
  useEffect(() => {
    return subscribeMapFilters(() => {
      setMapFiltersState(getMapFilters());
    });
  }, []);

  // Subscribe to sidebar state
  useEffect(() => {
    return subscribeSidebarCollapsed(() => {
      setIsSidebarCollapsed(getSidebarCollapsed());
    });
  }, []);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    // Only run the stagger animation once after the initial load.
    // 500ms allows the map data to load and the initial animation to schedule.
    const timer = setTimeout(() => setHasMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const policyByLuc = useMemo<Map<string, ApoliceRecord>>(() => {
    return new Map(apolices.map((policy: ApoliceRecord) => [policy.luc, policy]));
  }, [apolices]);

  // Extract unique LUCs only from DB (apolices)
  const allLucs = useMemo<string[]>(() => {
    const lucSet = new Set<string>();
    apolices.forEach((p: ApoliceRecord) => {
      if (p.luc) lucSet.add(p.luc);
    });

    // Sort alphanumerically
    const sorted = Array.from(lucSet).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return sorted;
  }, [apolices, isSortedByScore, policyByLuc]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateGrid = () => {
      const W = container.clientWidth;
      const H = container.clientHeight;
      const gap = 4;
      const N = allLucs.length;

      if (N === 0) {
        setGridConfig({ cols: 1, rows: 1, itemsPerPage: 1 });
        return;
      }

      let maxS = 0;
      let bestCols = 1;
      let bestRows = N;

      // Mathematical optimization to find the largest square size
      for (let c = 1; c <= N; c++) {
        let r = Math.ceil(N / c);
        
        let sCol = (W - (c - 1) * gap) / c;
        let sRow = (H - (r - 1) * gap) / r;
        let s = Math.min(sCol, sRow);
        
        if (s > maxS) {
          maxS = s;
          bestCols = c;
          bestRows = r;
        }
      }

      setGridConfig({ cols: bestCols, rows: bestRows, itemsPerPage: N, squareSize: maxS });
    };

    updateGrid();
    const observer = new ResizeObserver(updateGrid);
    observer.observe(container);
    return () => observer.disconnect();
  }, [allLucs.length]);

  const maxCobertura = useMemo<number>(() => {
    let max = 0;
    apolices.forEach((p: ApoliceRecord) => {
      const coberturaValue = Number(p.cobertura) || 0;
      if (coberturaValue > max) max = coberturaValue;
    });
    return max || 1;
  }, [apolices]);

  const cols = gridConfig.cols;
  const ITEMS_PER_PAGE = gridConfig.itemsPerPage;

  useEffect(() => {
    if (selectedLuc && !loading && apolices.length > 0) {
        const lucIndex = allLucs.indexOf(selectedLuc);
        if (lucIndex !== -1) {
          const targetPage = Math.floor(lucIndex / ITEMS_PER_PAGE) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
        }
    }
  }, [selectedLuc, allLucs, ITEMS_PER_PAGE, currentPage, loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (selectedLuc) {
          onSelectLuc(null);
        }
        return;
      }

      if (!['w', 'a', 's', 'd'].includes(key)) return;

      let currentIndex = -1;
      if (selectedLuc) {
        currentIndex = allLucs.indexOf(selectedLuc);
      }

      if (currentIndex === -1) {
        if (allLucs.length > 0) {
          const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
          onSelectLuc(allLucs[startIdx] || allLucs[0]);
        }
        return;
      }

      let newIndex = currentIndex;
      if (key === 'w') newIndex -= cols;
      if (key === 's') newIndex += cols;
      if (key === 'a') newIndex -= 1;
      if (key === 'd') newIndex += 1;

      if (newIndex >= 0 && newIndex < allLucs.length) {
        onSelectLuc(allLucs[newIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLuc, allLucs, onSelectLuc, hideHeader, isSidebarCollapsed, currentPage, ITEMS_PER_PAGE, cols]);

  const totalPages = Math.ceil(allLucs.length / ITEMS_PER_PAGE);
  const paginatedLucs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allLucs.slice(start, start + ITEMS_PER_PAGE);
  }, [allLucs, currentPage, ITEMS_PER_PAGE]);

  const { totalLucs, percentualVencidas } = useMemo(() => {
    let vencidasUnicas = 0;
    allLucs.forEach(luc => {
      const policy = policyByLuc.get(luc);
      const details = getStatusDetails(policy?.status);
      if (details.label === "Vencida") {
        vencidasUnicas++;
      }
    });
    
    const total = allLucs.length;
    const percent = total > 0 ? Math.round((vencidasUnicas / total) * 100) : 0;
    return { totalLucs: total, percentualVencidas: percent };
  }, [allLucs, policyByLuc]);

  const handleNextPage = () => setCurrentPage((p: number) => Math.min(totalPages, p + 1));
  const handlePrevPage = () => setCurrentPage((p: number) => Math.max(1, p - 1));

  const selectedPolicy: ApoliceRecord | null = selectedLuc ? policyByLuc.get(selectedLuc) ?? null : null;
  const selectedDetails = getStatusDetails(selectedPolicy?.status);

  return (
    <section
      className={hideHeader ? "w-full relative h-full flex flex-col" : "w-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#151515] dark:border-[#222222] relative"}
    >
      {/* Header */}
      {!hideHeader && (
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-[12px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-medium">{totalLucs}</span> lojas mapeadas &middot; {percentualVencidas}% com apólice vencida
          </div>
          {/* Temporal Slider / Playback */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1f1f1f] rounded-full px-2 py-1">
              <button
                onClick={() => {
                  if (!isPlaying && timeOffsetIdx >= TIME_OFFSETS.length - 1) {
                    setTimeOffsetIdx(0);
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-[#2a2a2a] shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-[#a0191e] hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                title={isPlaying ? "Pausar" : "Reproduzir evolução (1 ano)"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
              
              <div className="flex flex-col mx-2 w-[160px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {timeOffsetIdx === WEEKS_PAST ? "Estado Atual" : timeOffsetIdx > WEEKS_PAST ? "Projeção" : "Histórico"}
                  </span>
                  <span className="text-[11px] font-bold text-[#a0191e] dark:text-[#fca5a5]">
                    {TIME_OFFSETS[timeOffsetIdx].label}
                  </span>
                </div>
                
                <input 
                  type="range" 
                  min="0" 
                  max={TIME_OFFSETS.length - 1} 
                  value={timeOffsetIdx} 
                  onChange={(e) => {
                    setIsPlaying(false);
                    setTimeOffsetIdx(parseInt(e.target.value));
                  }}
                  className="w-full h-1.5 bg-gray-200 dark:bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#a0191e]"
                  style={{ direction: 'ltr' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 dark:bg-[#151515]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168821]"></div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-red-50 text-[#a0191e]">
          {error}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-hidden min-h-0 pr-1 flex items-center justify-center" ref={containerRef}>
            <TooltipProvider delayDuration={100}>
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={currentPage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className="map-grid-container p-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${Math.floor(gridConfig.squareSize)}px)`, gridAutoRows: `${Math.floor(gridConfig.squareSize)}px`, gap: '4px', alignContent: 'center', justifyContent: 'center', width: '100%' }}
                >
              {paginatedLucs.map((luc: string, index: number) => {
              const policy = policyByLuc.get(luc);
              const daysBack = TIME_OFFSETS[timeOffsetIdx].days;
              const historicalStatus = daysBack === 0 ? policy?.status : getStatusAtDate(policy?.vencimento, daysBack);
              const details = getStatusDetails(historicalStatus);
              const isSelected = selectedLuc === luc;
              const hasSelection = selectedLuc !== null;
              const baseScale = 1;
              const zIndexLevel = isSelected ? 30 : (policy?.cobertura ? Math.floor(baseScale * 10) : 1);
              const daysRemainingDate = parseTooltipDate(policy?.vencimento);
              const daysRemaining = daysRemainingDate ? getDaysDifference(new Date(), daysRemainingDate) : null;
              const statusLabel = details.label;
              const statusColor = details.bg;
              const statusText = daysRemaining === null
                ? statusLabel
                : daysRemaining < 0
                  ? `${statusLabel} • ${Math.abs(daysRemaining)} dias de atraso`
                  : `${statusLabel} • ${daysRemaining} dias restantes`;

              const { filtroSegmento, filtroSeguradora, filtroStatus } = mapFilters;
              const hasFilter = filtroSegmento || filtroSeguradora || filtroStatus;
              let isDimmed = false;
              if (hasFilter) {
                const p = policyByLuc.get(luc);
                const segmento = p?.segmento || p?.tipo || '';
                const seguradora = p?.seguradora || '';
                const status = (p?.status || '').toLowerCase();
                isDimmed =
                  !!(filtroSegmento && segmento !== filtroSegmento) ||
                  !!(filtroSeguradora && seguradora !== filtroSeguradora) ||
                  !!(filtroStatus && status !== filtroStatus.toLowerCase());
              }

              return (
                <Tooltip key={luc}>
                  <TooltipTrigger asChild>
                    <button
                      ref={(el) => {
                        if (el && isSelected) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      onClick={() => onSelectLuc(isSelected ? null : luc)}
                      className={`relative flex items-center justify-center font-bold text-sm shadow-sm border border-transparent outline-none focus:outline-none focus-visible:outline-none hover:scale-[1.05] hover:brightness-105 active:scale-95 hover:shadow-xl hover:z-40 transition-all duration-300 ease-out ${isSelected ? 'sel' : ''}`}
                      aria-label={`LUC ${luc}`}
                      style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: '8px',
                          flexShrink: 0,
                          color: details.text,
                          zIndex: zIndexLevel,
                          pointerEvents: (isDimmed ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
                          WebkitTapHighlightColor: 'transparent',
                          backgroundColor: details.bg,
                          opacity: isDimmed ? 0.12 : (hasSelection && !isSelected ? 0.65 : 1),
                          transform: `scale(${isSelected ? baseScale * 1.05 : (hasSelection ? baseScale * 0.96 : baseScale)})`,
                          outline: isSelected ? `2px solid ${details.bg}` : `0px solid transparent`,
                          outlineOffset: isSelected ? '2px' : '0px',
                          boxShadow: isSelected ? `0 6px 16px rgba(0,0,0,0.25)` : 'none',
                          filter: isSelected ? 'brightness(1.05)' : 'brightness(1)',
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={10}
                    className="w-[240px] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-gray-900 shadow-xl dark:border-[#222222] dark:bg-[#0a0a0a] dark:text-white"
                  >
                    <div className="space-y-1">
                      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                        {luc}
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.25, color: "#64748B" }}>
                        {policy?.fantasia || policy?.lojista || "Não informada"}
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.25, color: statusColor }}>
                        {statusText}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
                </motion.div>
              </AnimatePresence>
            </TooltipProvider>
          </div>

          {/* Dot Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 shrink-0 py-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand)' : 'var(--color-border-secondary)',
                        transform: isActive ? 'scale(1.2)' : 'scale(1)',
                      }}
                      aria-label={`Página ${page}`}
                    />
                  );
                })}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export interface ComplianceSidePanelProps {
  selectedLuc: string | null;
  onClose: () => void;
  onViewApolice?: (luc: string) => void;
  onEditApolice?: (luc: string) => void;
  onRenovarApolice?: (luc: string) => void;
}

export function ComplianceSidePanel({ selectedLuc, onClose, onViewApolice, onEditApolice, onRenovarApolice }: ComplianceSidePanelProps) {
  const navigate = useNavigate();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);

  const [isDownloadingApolice, setIsDownloadingApolice] = useState(false);

  const handleDownloadApolice = async () => {
    if (!selectedPolicy) return;
    setIsDownloadingApolice(true);
    try {
      const lucStr = selectedPolicy.luc || selectedPolicy.id || '';
      const docs = documentos || [];
      let targetDoc = docs.find(d => {
        const n = (d.nome || d.nome_arquivo || '').toLowerCase();
        return n === 'apolice_completa.pdf' ||
               n.includes(`apolice_${lucStr.toLowerCase()}`) ||
               n.includes(`apólice_${lucStr.toLowerCase()}`) ||
               n.includes('apolice') ||
               n.includes('apólice');
      });

      if (targetDoc) {
        await downloadArquivo(targetDoc.id, targetDoc.nome || targetDoc.nome_arquivo || `apolice_${lucStr}.pdf`);
      } else {
        const coberturas = await getCoberturas(selectedPolicy.id);
        exportApoliceParaPDF(selectedPolicy, coberturas);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao baixar apólice");
    } finally {
      setIsDownloadingApolice(false);
    }
  };

  useEffect(() => {
    let active = true;
    listApolices().then(policyList => {
      if (active) setApolices(policyList);
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedLuc) {
      getDocumentos(selectedLuc).then(docs => {
        if (active) setDocumentos(docs || []);
      }).catch(console.error);
    } else {
      setDocumentos([]);
    }
    return () => { active = false; };
  }, [selectedLuc]);

  const policyByLuc = new Map(apolices.map((policy) => [policy.luc, policy]));
  const selectedPolicy = selectedLuc ? policyByLuc.get(selectedLuc) : undefined;
  const selectedDetails = getStatusDetails(selectedPolicy?.status);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.1, delay: 0 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 30, delay: 0.15 }}
      className="bg-white dark:bg-[#151515] rounded-xl border border-[#E5E7EB] dark:border-[#222222] relative overflow-hidden shrink-0 flex flex-col h-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!selectedLuc ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center h-full w-full text-center p-8 bg-white dark:bg-[#151515]"
          >
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#0a0a0a] dark:border-[#222222] mb-4">
              <MapPin className="w-8 h-8 text-gray-300 dark:text-[#475569]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma unidade selecionada</h3>
            <p className="text-sm text-gray-500 dark:text-[#94A3B8] max-w-[250px]">
              Clique em um dos quadrados do mapa ao lado para visualizar os detalhes de conformidade.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="selected-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full bg-white dark:bg-[#151515]"
          >
      {/* Panel Header */}
      <div className="pt-3 px-[14px] pb-[10px] border-b border-gray-100 bg-white dark:bg-[#151515] dark:border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#0a0a0a] dark:border-[#222222] shadow-sm shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gray-500 dark:text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{selectedLuc}</h2>
        </div>
        <p className="text-[11px] font-medium text-gray-500 dark:text-[#94A3B8] truncate max-w-[220px] ml-9 mt-0.5">
          {selectedPolicy?.fantasia || "Não informada"}
        </p>
      </div>

      {/* Panel Content */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-3">

        {/* Status and Actions Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedDetails.bg }}></div>
            <span className="font-semibold text-[13px]" style={{ color: selectedDetails.bg !== COLORS.semApolice.bg && selectedDetails.bg !== COLORS.aVencer.bg ? selectedDetails.bg : undefined }}>
              {selectedDetails.label}
            </span>
          </div>

          {selectedPolicy ? (
            <div className="flex gap-2">
              <button
                onClick={() => onEditApolice?.(selectedPolicy.id)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md transition-colors shadow-sm dark:bg-[#151515] dark:border-[#222222] dark:text-white dark:hover:bg-[#0a0a0a]"
                style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}
              >
                Editar
              </button>
              <button
                onClick={() => onViewApolice?.(selectedPolicy.id)}
                className="bg-[#8B1A1A] hover:bg-[#a43030] text-white rounded-md transition-colors shadow-sm flex items-center gap-1.5"
                style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}
              >
                <FileText className="w-4 h-4" />
                Ver detalhes
              </button>
            </div>
          ) : (
            <button
              onClick={() => onEditApolice?.(selectedLuc)}
              className="bg-[#168821] hover:bg-[#126b1a] text-white rounded-md transition-colors shadow-sm"
              style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}
            >
              Cadastrar
            </button>
          )}
        </div>

        {selectedPolicy ? (
          <div className="flex flex-col flex-1 min-h-0 justify-between gap-3">
            {/* Policy Details Grid */}
            <div className="grid grid-cols-2 gap-[1px] p-[1px] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <Shield className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Seguradora</span>
                </div>
                <p className="font-medium text-gray-900 text-[12px] truncate dark:text-white leading-tight">{selectedPolicy.seguradora || "Não informada"}</p>
              </div>

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <FileText className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Segmento</span>
                </div>
                <p className="font-medium text-gray-900 text-[12px] truncate dark:text-white leading-tight">{selectedPolicy.segmento || selectedPolicy.tipo || "—"}</p>
              </div>

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Vigência</span>
                </div>
                <p className="font-medium text-gray-900 text-[12px] dark:text-white leading-tight">{selectedPolicy.vigencia || "—"}</p>
              </div>

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <Clock className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Vencimento</span>
                </div>
                <p className="font-medium text-gray-900 text-[12px] dark:text-white leading-tight">{selectedPolicy.vencimento || "—"}</p>
              </div>

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <Shield className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Cobertura</span>
                </div>
                <p className="font-medium text-gray-900 text-[12px] dark:text-white truncate leading-tight">
                  {selectedPolicy.cobertura ? `R$ ${selectedPolicy.cobertura}` : "R$ 0,00"}
                </p>
              </div>

              <div className="px-[14px] py-[8px] bg-white dark:bg-[#151515] flex flex-col justify-center relative overflow-hidden">
                <div className="flex items-center gap-1 mb-1 text-gray-400 dark:text-[#64748B]">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[8px] font-medium uppercase tracking-wider leading-none">Status</span>
                </div>
                {selectedPolicy.dias_restantes !== undefined && selectedPolicy.dias_restantes !== null ? (
                  <span className={`font-semibold text-[12px] truncate leading-tight ${selectedPolicy.dias_restantes < 0 ? "text-[#a0191e]" : selectedPolicy.dias_restantes <= 15 ? "text-[#f59e0b]" : "text-[#168821]"}`}>
                    {selectedPolicy.dias_restantes < 0 ? `${Math.abs(selectedPolicy.dias_restantes)} dias de atraso` : `${selectedPolicy.dias_restantes} dias rest.`}
                  </span>
                ) : (
                  <span className="font-medium text-[12px] text-gray-400 leading-tight">—</span>
                )}
              </div>
            </div>

            {(() => {
              const vigenciaDate = parseTooltipDate(selectedPolicy.vigencia);
              const vencimentoDate = parseTooltipDate(selectedPolicy.vencimento);
              let percentPassed = 0;
              
              if (vigenciaDate && vencimentoDate) {
                const totalDays = getDaysDifference(vigenciaDate, vencimentoDate);
                const passedDays = getDaysDifference(vigenciaDate, new Date());
                percentPassed = totalDays > 0 ? Math.max(0, Math.min(100, (passedDays / totalDays) * 100)) : 0;
              }

              return (
                <div className="h-[48px] mt-2 border-t border-gray-100 dark:border-[#222222] flex flex-col justify-center gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Linha do Tempo</h3>
                    <span className="text-[11px] font-bold text-[#168821]">
                      {selectedPolicy.dias_restantes !== undefined && selectedPolicy.dias_restantes !== null ? (selectedPolicy.dias_restantes < 0 ? 'Vencida' : `Vencimento em ${selectedPolicy.dias_restantes} dias`) : ''}
                    </span>
                  </div>
                  
                  <div className="relative h-1 bg-gray-100 dark:bg-[#222222] rounded-full">
                    <div className="absolute top-0 left-0 h-full bg-[#168821] rounded-full" style={{ width: `${percentPassed}%` }}></div>
                  </div>
                </div>
              );
            })()}

            {/* Ações Rápidas */}
            <div className="mt-2 pt-3 flex items-center border-t border-gray-100 dark:border-[#222222]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[100px] shrink-0">Ações Rápidas</span>
              <div className="flex items-center justify-between flex-1 pl-2">
                <button 
                  onClick={() => onRenovarApolice?.(selectedPolicy.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-[#168821] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renovar
                </button>
                <button 
                  onClick={handleDownloadApolice}
                  disabled={isDownloadingApolice}
                  className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${isDownloadingApolice ? 'opacity-50 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:text-[#168821]'}`}
                >
                  {isDownloadingApolice ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Baixar
                </button>
                <button 
                  onClick={() => navigate(`/seguros/apolice/${selectedPolicy.id}#historico`)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-[#168821] transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Histórico
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 dark:bg-[#222222]">
              <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nenhuma apólice</h4>
            <p className="text-gray-500 text-[11px] max-w-[250px] dark:text-[#94A3B8]">
              Este LUC não possui nenhuma apólice de seguro cadastrada no sistema no momento.
            </p>
          </div>
        )}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}