import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { X, ChevronLeft, ChevronRight, FileText, Shield, Calendar, AlertTriangle, CheckCircle2, Clock, MapPin, FilePlus2, PencilLine, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getMapFilters, subscribeMapFilters } from "../store";
import { useNavigate } from "react-router";

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

const TIME_OFFSETS = [
  { label: 'Hoje', days: 0 },
  { label: '7d atrás', days: 7 },
  { label: '15d atrás', days: 15 },
  { label: '30d atrás', days: 30 },
];

function getStatusAtDate(vencimento: string | undefined, daysBack: number) {
  if (!vencimento) return undefined;
  const venc = parseTooltipDate(vencimento);
  if (!venc) return undefined;
  const refDate = new Date();
  refDate.setDate(refDate.getDate() - daysBack);
  const ref = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const due = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
  const diff = Math.floor((due.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Vencida';
  if (diff <= 15) return 'A Vencer';
  return 'Ativa';
}

function getStatusDetails(status?: string) {
  if (!status) return COLORS.semApolice;
  const s = status.toLowerCase().trim();
  if (s === "ativa" || s === "conforme") return COLORS.conforme;
  if (s === "a vencer") return COLORS.aVencer;
  if (s === "vencida") return COLORS.vencida;
  return COLORS.semApolice;
}

function parseTooltipDate(value?: string) {
  if (!value) {
    return null;
  }

  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (isoMatch) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const brMatch = /^\d{2}\/\d{2}\/\d{4}$/.test(value);
  if (brMatch) {
    const [day, month, year] = value.split("/").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysDifference(from: Date, to: Date) {
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24));
}

export interface ComplianceMapV2Props {
  selectedLuc: string | null;
  onSelectLuc: (luc: string | null) => void;
  tileWidth?: string;
  tileHeight?: string;
  gap?: string;
  hideHeader?: boolean;
  itemsPerPage?: number;
}

export function ComplianceMapV2({ 
  selectedLuc, 
  onSelectLuc,
  tileWidth = '43px',
  tileHeight = '38px',
  gap = '5px',
  hideHeader = false,
  itemsPerPage
}: ComplianceMapV2Props) {
  const navigate = useNavigate();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mapFilters, setMapFiltersState] = useState(getMapFilters);
  const [timeOffsetIdx, setTimeOffsetIdx] = useState(0);

  // 6 lines * 13 columns = 78 items per page
  const ITEMS_PER_PAGE = itemsPerPage || (hideHeader ? 176 : 78);

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

  // Subscribe to map dim filters from store
  useEffect(() => {
    return subscribeMapFilters(() => {
      setMapFiltersState(getMapFilters());
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
    return Array.from(lucSet).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [apolices]);

  const maxCobertura = useMemo<number>(() => {
    let max = 0;
    apolices.forEach((p: ApoliceRecord) => {
      const coberturaValue = Number(p.cobertura) || 0;
      if (coberturaValue > max) max = coberturaValue;
    });
    return max || 1;
  }, [apolices]);



  useEffect(() => {
    if (selectedLuc && !loading && apolices.length > 0) {
      const isFilteredOut = !allLucs.includes(selectedLuc);
      if (isFilteredOut) {
        const allSortedLucs = getSortedUniqueLucs(apolices, getMapFilters());
        const lucIndex = allSortedLucs.indexOf(selectedLuc);
        if (lucIndex !== -1) {
          const targetPage = Math.floor(lucIndex / ITEMS_PER_PAGE) + 1;
          setCurrentPage(targetPage);
        }
      } else {
        const lucIndex = allLucs.indexOf(selectedLuc);
        if (lucIndex !== -1) {
          const targetPage = Math.floor(lucIndex / ITEMS_PER_PAGE) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
        }
      }
    }
  }, [selectedLuc, allLucs, ITEMS_PER_PAGE, currentPage, loading, apolices]);

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
      className={hideHeader ? "w-full relative h-full flex flex-col" : "w-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#0a0a0a] dark:border-[#222222] relative"}
    >
      {/* Header */}
      {!hideHeader && (
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-[12px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-medium">{totalLucs}</span> lojas mapeadas &middot; {percentualVencidas}% com apólice vencida
          </div>
          {/* Temporal Slider */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1f1f1f] rounded-full p-0.5">
            {TIME_OFFSETS.map((t, i) => (
              <button
                key={t.days}
                onClick={() => setTimeOffsetIdx(i)}
                className={`relative px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  timeOffsetIdx === i
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {timeOffsetIdx === i && (
                  <motion.span
                    layoutId="time-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: '#a0191e' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
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
          {/* LUC Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
            <TooltipProvider delayDuration={100}>
              <div className="map-grid-container pb-2 p-1.5" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${tileWidth})`, gridAutoRows: tileHeight, gap: gap, justifyContent: 'start', width: '100%' }}>
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
                    <motion.button
                      onClick={() => onSelectLuc(isSelected ? null : luc)}
                      className={`relative flex items-center justify-center font-bold text-sm shadow-sm border border-transparent outline-none focus:outline-none focus-visible:outline-none map-tile ${isSelected ? 'sel' : ''}`}
                      aria-label={`LUC ${luc}`}
                      style={{
                          width: tileWidth,
                          height: tileHeight,
                          borderRadius: '10px',
                          flexShrink: 0,
                          color: details.text,
                          zIndex: zIndexLevel,
                          pointerEvents: (isDimmed ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
                          WebkitTapHighlightColor: 'transparent',
                      }}
                      initial={hasMounted ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ 
                        scale: isSelected ? baseScale * 1.05 : (hasSelection ? baseScale * 0.96 : baseScale), 
                        opacity: isDimmed ? 0.12 : (hasSelection && !isSelected ? 0.65 : 1),
                        outline: isSelected ? `2px solid ${details.bg}` : `0px solid transparent`,
                        outlineOffset: isSelected ? '2px' : '0px',
                        boxShadow: isSelected ? `0 6px 16px rgba(0,0,0,0.25)` : 'none',
                        filter: isSelected ? 'brightness(1.05)' : 'brightness(1)',
                        backgroundColor: details.bg
                      }}
                      whileHover={{
                        scale: baseScale * 1.05,
                        boxShadow: `0 8px 16px -4px ${details.bg}50, 0 4px 8px -4px rgba(0,0,0,0.1)`,
                        filter: 'brightness(1.05)',
                        zIndex: 40
                      }}
                      whileTap={{ scale: baseScale * 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: hasMounted ? 400 : 300,
                        damping: hasMounted ? 25 : 20,
                        delay: hasMounted ? 0 : (index % 13) * 0.02 + Math.floor(index / 13) * 0.02
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
            </div>
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
}

export function ComplianceSidePanel({ selectedLuc, onClose, onViewApolice, onEditApolice }: ComplianceSidePanelProps) {
  const navigate = useNavigate();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityRecentItem[]>([]);

  useEffect(() => {
    let active = true;
    listApolices().then(policyList => {
      if (active) setApolices(policyList);
    }).catch(console.error);
    return () => { active = false; };
  }, []);

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
            key={selectedLuc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full bg-white dark:bg-[#151515]"
          >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white dark:bg-[#151515] dark:border-[#222222]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#0a0a0a] dark:border-[#222222]">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-[#94A3B8]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none mb-1">{selectedLuc}</h2>
            <p className="text-[11px] font-medium text-gray-500 dark:text-[#94A3B8] truncate max-w-[220px]">
              {selectedPolicy?.fantasia || "Não informada"}
            </p>
          </div>
        </div>
      </div>

      {/* Panel Content */}
      <div style={{ padding: '8px 12px' }} className="space-y-2">

        {/* Status and Actions Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 dark:bg-[#151515] dark:border-[#222222]">
            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: selectedDetails.bg }}></div>
            <span className="font-semibold text-sm" style={{ color: selectedDetails.bg !== COLORS.semApolice.bg && selectedDetails.bg !== COLORS.aVencer.bg ? selectedDetails.bg : undefined }}>
              {selectedDetails.label}
            </span>
          </div>

          {selectedPolicy ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onEditApolice?.(selectedPolicy.id)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md transition-colors dark:bg-[#151515] dark:border-[#222222] dark:text-white dark:hover:bg-[#0a0a0a]"
                style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 600 }}
              >
                Editar
              </button>
              <button
                onClick={() => onViewApolice?.(selectedPolicy.id)}
                className="bg-[#8B1A1A] hover:bg-[#a43030] text-white rounded-md transition-colors shadow-sm"
                style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 600 }}
              >
                Ver
              </button>
            </div>
          ) : (
            <button
              onClick={() => onEditApolice?.(selectedLuc)}
              className="bg-[#168821] hover:bg-[#126b1a] text-white rounded-md transition-colors shadow-sm"
              style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 600 }}
            >
              Cadastrar
            </button>
          )}
        </div>

        {selectedPolicy ? (
          <>
            {/* Policy Details Grid */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Dados da Apólice</h3>
              <div className="grid grid-cols-2 gap-1.5">


                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <Shield className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Seguradora</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-[12px] truncate dark:text-white">{selectedPolicy.seguradora || "Não informada"}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <FileText className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Segmento</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-[12px] truncate dark:text-white">{selectedPolicy.segmento || selectedPolicy.tipo || "—"}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Vigência</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-[12px] dark:text-white">{selectedPolicy.vigencia || "—"}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Vencimento</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-[12px] dark:text-white">{selectedPolicy.vencimento || "—"}</p>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <Shield className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Cobertura</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-[12px] dark:text-white truncate">
                    {selectedPolicy.cobertura ? `R$ ${selectedPolicy.cobertura}` : "R$ 0,00"}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#151515] dark:border-[#222222]">
                  <div className="flex items-center gap-1.5 mb-0.5 text-gray-500 dark:text-[#94A3B8]">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Status</span>
                  </div>
                  {selectedPolicy.dias_restantes !== undefined && selectedPolicy.dias_restantes !== null ? (
                    <span className={`font-bold text-[12px] truncate ${selectedPolicy.dias_restantes < 0 ? "text-[#a0191e]" : selectedPolicy.dias_restantes <= 15 ? "text-[#f59e0b]" : "text-[#168821]"}`}>
                      {selectedPolicy.dias_restantes < 0 ? `${Math.abs(selectedPolicy.dias_restantes)} dias de atraso` : `${selectedPolicy.dias_restantes} dias rest.`}
                    </span>
                  ) : (
                    <span className="font-bold text-[12px] text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>

          </>
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