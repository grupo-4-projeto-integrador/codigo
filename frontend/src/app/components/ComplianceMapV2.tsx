import { useEffect, useMemo, useState } from "react";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { X, ChevronLeft, ChevronRight, FileText, Shield, Calendar, AlertTriangle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getMapFilters, subscribeMapFilters } from "../store";

type MapLayoutItem = {
  luc: string;
  floor: number;
  position: number;
};

// Colors based on user requirements
const COLORS = {
  conforme: { bg: "#168821", text: "#FFFFFF", label: "Conforme" },
  aVencer: { bg: "#f9e4a0", text: "#000000", label: "A vencer" },
  vencida: { bg: "#a0191e", text: "#FFFFFF", label: "Vencida" },
  semApolice: { bg: "#E5E7EB", text: "#374151", label: "Sem apólice" },
};

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
}

export function ComplianceMapV2({ selectedLuc, onSelectLuc }: ComplianceMapV2Props) {
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mapFilters, setMapFiltersState] = useState(getMapFilters);

  // 5 lines * 12 columns (approximate on desktop) = 60 items per page
  const ITEMS_PER_PAGE = 60;

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

  // Pagination calculations
  const totalPages = Math.ceil(allLucs.length / ITEMS_PER_PAGE);
  const paginatedLucs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allLucs.slice(start, start + ITEMS_PER_PAGE);
  }, [allLucs, currentPage]);



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

  // Side Panel logic
  const selectedPolicy: ApoliceRecord | null = selectedLuc ? policyByLuc.get(selectedLuc) ?? null : null;
  const selectedDetails = getStatusDetails(selectedPolicy?.status);

  return (
    <section
      className="w-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447] relative"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mapa de Conformidade</h2>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">
            {totalLucs} lojas mapeadas &middot; {percentualVencidas}% com apólice vencida
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 dark:bg-[#242938]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168821]"></div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-red-50 text-[#a0191e]">
          {error}
        </div>
      ) : (
        <>
          {/* LUC Grid */}
          <TooltipProvider delayDuration={100}>
            <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 44px)', gridAutoRows: '38px', gap: '5px', justifyContent: 'start', width: '100%' }}>
              {paginatedLucs.map((luc: string) => {
              const policy = policyByLuc.get(luc);
              const details = getStatusDetails(policy?.status);
              const isSelected = selectedLuc === luc;
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

              return (
                <Tooltip key={luc}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => onSelectLuc(luc)}
                      className="relative flex items-center justify-center font-bold text-sm shadow-sm focus:outline-none border border-transparent"
                      aria-label={`LUC ${luc}`}
                      style={(() => {
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
                        return {
                          width: '44px',
                          height: '38px',
                          borderRadius: '10px',
                          flexShrink: 0,
                          backgroundColor: details.bg,
                          color: details.text,
                          zIndex: zIndexLevel,
                          opacity: isDimmed ? 0.12 : 1,
                          pointerEvents: (isDimmed ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
                          transition: 'opacity 0.2s ease',
                          ...(isSelected ? { boxShadow: `0 0 0 3px #3b82f6` } : {})
                        };
                      })()}
                      initial={{ scale: baseScale }}
                      animate={{ scale: baseScale }}
                      whileHover={{
                        scale: baseScale * 1.1,
                        boxShadow: `0 10px 20px -5px ${details.bg}60, 0 4px 10px -3px rgba(0,0,0,0.1)`,
                        filter: 'brightness(1.05)',
                        zIndex: 40
                      }}
                      whileTap={{ scale: baseScale * 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={10}
                    className="w-[240px] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-gray-900 shadow-xl dark:border-[#2E3447] dark:bg-[#1A1F2E] dark:text-white"
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

          {/* Dot Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3" style={{ marginTop: '10px' }}>
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
        </>
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
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);

  useEffect(() => {
    let active = true;
    listApolices().then(policyList => {
      if (active) setApolices(policyList);
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  if (!selectedLuc) {
    return (
      <div className="bg-white dark:bg-[#242938] rounded-xl border flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8" style={{ borderColor: '#E5E7EB' }}>
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447] mb-4">
          <MapPin className="w-8 h-8 text-gray-300 dark:text-[#475569]" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma unidade selecionada</h3>
        <p className="text-sm text-gray-500 dark:text-[#94A3B8] max-w-[250px]">
          Clique em um dos quadrados do mapa ao lado para visualizar os detalhes de conformidade.
        </p>
      </div>
    );
  }

  const policyByLuc = new Map(apolices.map((policy) => [policy.luc, policy]));
  const selectedPolicy = policyByLuc.get(selectedLuc);
  const selectedDetails = getStatusDetails(selectedPolicy?.status);

  return (
    <div className="bg-white dark:bg-[#242938] rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-white dark:bg-[#242938] dark:border-[#2E3447]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447]">
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="space-y-3">

        {/* Status and Actions Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 dark:bg-[#242938] dark:border-[#2E3447]">
            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: selectedDetails.bg }}></div>
            <span className="font-semibold text-sm" style={{ color: selectedDetails.bg !== COLORS.semApolice.bg && selectedDetails.bg !== COLORS.aVencer.bg ? selectedDetails.bg : undefined }}>
              {selectedDetails.label}
            </span>
          </div>

          {selectedPolicy ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onEditApolice?.(selectedPolicy.id)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md transition-colors dark:bg-[#242938] dark:border-[#2E3447] dark:text-white dark:hover:bg-[#1A1F2E]"
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


                <div className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-[#94A3B8]">
                    <Shield className="w-3 h-3" />
                    <span className="text-[11px] font-medium">Seguradora</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">{selectedPolicy.seguradora || "Não informada"}</p>
                </div>

                <div className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-[#94A3B8]">
                    <FileText className="w-3 h-3" />
                    <span className="text-[11px] font-medium">Segmento</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">{selectedPolicy.segmento || selectedPolicy.tipo || "—"}</p>
                </div>

                <div className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-[#94A3B8]">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[11px] font-medium">Vigência</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">{selectedPolicy.vigencia || "—"}</p>
                </div>

                <div className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-[#94A3B8]">
                    <Clock className="w-3 h-3" />
                    <span className="text-[11px] font-medium">Vencimento</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">{selectedPolicy.vencimento || "—"}</p>
                </div>

                <div className="col-span-2 p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-[#94A3B8]">Cobertura</span>
                    <p className="font-semibold text-gray-900 text-sm dark:text-white">
                      {selectedPolicy.cobertura ? `R$ ${selectedPolicy.cobertura}` : "R$ 0,00"}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center justify-between gap-3">
                    {selectedPolicy.dias_restantes !== undefined && selectedPolicy.dias_restantes !== null ? (
                      <span className={`font-bold text-base ${selectedPolicy.dias_restantes < 0 ? "text-[#a0191e]" : selectedPolicy.dias_restantes <= 30 ? "text-[#f59e0b]" : "text-[#168821]"}`}>
                        {selectedPolicy.dias_restantes < 0 ? `${Math.abs(selectedPolicy.dias_restantes)} dias de atraso` : `${selectedPolicy.dias_restantes} dias`}
                      </span>
                    ) : (
                      <span className="font-bold text-base text-gray-400">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            {(() => {
              const parseDate = (str?: string) => {
                if (!str) return null;
                const parts = str.split('/');
                if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
                return new Date(str);
              };
              const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
              const today = new Date();

              const emissaoDate = selectedPolicy.vigencia ? parseDate(selectedPolicy.vigencia) : null;
              const vigenciaDate = emissaoDate ? new Date(emissaoDate.getTime() - 30 * 86400000) : null;
              const vencimentoDate = parseDate(selectedPolicy.vencimento);
              const renovacaoDate = vencimentoDate ? new Date(vencimentoDate.getTime() + 365 * 86400000) : null;

              const events = [
                { label: 'Emissão', date: vigenciaDate, isPast: vigenciaDate ? vigenciaDate < today : false },
                { label: 'Início da Vigência', date: emissaoDate, isPast: emissaoDate ? emissaoDate < today : false },
                { label: 'Vencimento', date: vencimentoDate, isPast: vencimentoDate ? vencimentoDate < today : false, isStatus: true },
                { label: 'Renovação Prevista', date: renovacaoDate, isPast: renovacaoDate ? renovacaoDate < today : false },
              ];

              const currentIdx = events.findIndex((e, i) => {
                const next = events[i + 1];
                return e.date && (!next?.date || (next.date > today));
              });

              const statusColor = selectedDetails.bg;

              return (
                <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '12px', marginTop: '4px' }}>
                  <p style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '12px' }}>
                    Linha do Tempo
                  </p>
                  <div style={{ position: 'relative', paddingLeft: '22px' }}>
                    {/* Connector line */}
                    <div style={{
                      position: 'absolute',
                      left: '5px',
                      top: '8px',
                      bottom: '8px',
                      borderLeft: '1.5px dashed var(--color-border-secondary)',
                    }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {events.map((ev, idx) => {
                        const isCurrent = idx === currentIdx;
                        const dotColor = ev.isStatus ? statusColor : (isCurrent ? '#BA7517' : ev.isPast ? '#788033' : 'var(--color-border-secondary)');
                        const dotShadow = isCurrent ? '0 0 0 3px rgba(186,117,23,0.15)' : 'none';
                        return (
                          <div key={ev.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              left: '-22px',
                              width: '11px',
                              height: '11px',
                              borderRadius: '50%',
                              backgroundColor: dotColor,
                              boxShadow: dotShadow,
                              flexShrink: 0,
                              zIndex: 1,
                            }} />
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: 600, color: ev.isStatus ? statusColor : (ev.isPast ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'), lineHeight: 1.2 }}>
                                {ev.label}
                              </p>
                              <p style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                                {fmt(ev.date)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Responsavel — inside timeline card, below events */}
                  <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '14px 0' }} />
                  <p style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '10px' }}>
                    Responsável pelo Contrato
                  </p>
                  {selectedPolicy.responsavel ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#3e0000',
                        color: '#bc9b7c',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {selectedPolicy.responsavel.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                          {selectedPolicy.responsavel}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                          Gestor de Apólices
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Não atribuído</p>
                  )}
                </div>
              );
            })()}

            {/* Responsavel Section */}

          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 dark:bg-[#2E3447]">
              <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nenhuma apólice</h4>
            <p className="text-gray-500 text-[11px] max-w-[250px] dark:text-[#94A3B8]">
              Este LUC não possui nenhuma apólice de seguro cadastrada no sistema no momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}