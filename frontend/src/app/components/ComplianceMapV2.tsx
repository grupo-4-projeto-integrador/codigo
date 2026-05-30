import { useEffect, useMemo, useState } from "react";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { X, ChevronLeft, ChevronRight, FileText, Shield, Calendar, AlertTriangle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

export interface ComplianceMapV2Props {
  selectedLuc: string | null;
  onSelectLuc: (luc: string | null) => void;
}

export function ComplianceMapV2({ selectedLuc, onSelectLuc }: ComplianceMapV2Props) {
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Hover Tooltip States
  const [hoveredLuc, setHoveredLuc] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 12 columns max * 6 rows = 72 items per page
  const ITEMS_PER_PAGE = 72;

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

  const policyByLuc = useMemo(() => {
    return new Map(apolices.map((policy) => [policy.luc, policy]));
  }, [apolices]);

  // Extract unique LUCs only from DB (apolices)
  const allLucs = useMemo(() => {
    const lucSet = new Set<string>();
    apolices.forEach((p) => {
      if (p.luc) lucSet.add(p.luc);
    });

    // Sort alphanumerically
    return Array.from(lucSet).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [apolices]);

  const maxCobertura = useMemo(() => {
    let max = 0;
    apolices.forEach(p => {
      if (p.cobertura && p.cobertura > max) max = p.cobertura;
    });
    return max || 1;
  }, [apolices]);

  // Pagination calculations
  const totalPages = Math.ceil(allLucs.length / ITEMS_PER_PAGE);
  const paginatedLucs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allLucs.slice(start, start + ITEMS_PER_PAGE);
  }, [allLucs, currentPage]);

  // Legend counts
  const legendCounts = useMemo(() => {
    const counts = { conforme: 0, aVencer: 0, vencida: 0, semApolice: 0 };
    allLucs.forEach((luc) => {
      const policy = policyByLuc.get(luc);
      const details = getStatusDetails(policy?.status);
      if (details === COLORS.conforme) counts.conforme++;
      else if (details === COLORS.aVencer) counts.aVencer++;
      else if (details === COLORS.vencida) counts.vencida++;
      else counts.semApolice++;
    });
    return counts;
  }, [allLucs, policyByLuc]);

  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));

  // Side Panel logic
  const selectedPolicy = selectedLuc ? policyByLuc.get(selectedLuc) : null;
  const selectedDetails = getStatusDetails(selectedPolicy?.status);

  return (
    <section className="w-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447] relative overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mapa de Conformidade</h2>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">
            Visualização consolidada de todos os LUCs e seus status de apólice.
          </p>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-[#94A3B8]">
            Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, allLucs.length)} de {allLucs.length} lojas
          </span>
          <div className="flex gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#2E3447] dark:text-[#94A3B8] dark:hover:bg-[#242938]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#2E3447] dark:text-[#94A3B8] dark:hover:bg-[#242938]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
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
          <div
            className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2.5 mb-8"
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
          >
            {paginatedLucs.map((luc) => {
              const policy = policyByLuc.get(luc);
              const details = getStatusDetails(policy?.status);
              const isSelected = selectedLuc === luc;
              const baseScale = policy?.cobertura ? 1 + (policy.cobertura / maxCobertura) * 0.25 : 1;
              const zIndexLevel = isSelected ? 30 : (policy?.cobertura ? Math.floor(baseScale * 10) : 1);

              return (
                <motion.button
                  key={luc}
                  onClick={() => onSelectLuc(luc)}
                  onMouseEnter={() => setHoveredLuc(luc)}
                  onMouseLeave={() => setHoveredLuc(null)}
                  className="relative flex items-center justify-center h-12 rounded-xl font-bold text-sm shadow-sm focus:outline-none border border-transparent"
                  style={{
                    backgroundColor: details.bg,
                    color: details.text,
                    zIndex: zIndexLevel,
                    ...(isSelected ? { boxShadow: `0 0 0 3px #3b82f6` } : {})
                  }}
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
                // Removing native title to prevent default browser tooltip overlapping
                // title={policy ? `${luc} - ${policy.fantasia} (${details.label})` : `${luc} - Sem apólice`}
                >
                  {luc}
                </motion.button>
              );
            })}
          </div>

          {/* Floating Hover Tooltip */}
          <AnimatePresence>
            {hoveredLuc && (
              <TooltipOverlay
                luc={hoveredLuc}
                mousePos={mousePos}
                policy={policyByLuc.get(hoveredLuc)}
              />
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-100 dark:border-[#2E3447]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm shadow-sm" style={{ backgroundColor: COLORS.conforme.bg }}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-[#94A3B8]">Conforme ({legendCounts.conforme})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm shadow-sm" style={{ backgroundColor: COLORS.aVencer.bg }}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-[#94A3B8]">A vencer ({legendCounts.aVencer})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm shadow-sm" style={{ backgroundColor: COLORS.vencida.bg }}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-[#94A3B8]">Vencida ({legendCounts.vencida})</span>
            </div>
          </div>
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
    <div className="bg-white dark:bg-[#242938] rounded-xl border flex flex-col" style={{ borderColor: '#E5E7EB' }}>
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white dark:bg-[#242938] dark:border-[#2E3447]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447]">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-[#94A3B8]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none mb-1">{selectedLuc}</h2>
            <p className="text-[10px] font-medium text-gray-400 dark:text-[#64748B] uppercase tracking-wider">Unidade Comercial</p>
          </div>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 p-4 space-y-4">

        {/* Status Section */}
        <div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50 dark:bg-[#242938] dark:border-[#2E3447]">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedDetails.bg }}></div>
            <span className="font-semibold text-base" style={{ color: selectedDetails.bg !== COLORS.semApolice.bg && selectedDetails.bg !== COLORS.aVencer.bg ? selectedDetails.bg : undefined }}>
              {selectedDetails.label}
            </span>
          </div>
        </div>

        {selectedPolicy ? (
          <>
            {/* Policy Details Grid */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Dados da Apólice</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
                  <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-[#94A3B8]">
                    <span className="text-[11px] font-medium">Loja</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">{selectedPolicy.fantasia || "Não informada"}</p>
                </div>

                <div className="col-span-2 p-3 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#242938] dark:border-[#2E3447]">
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
                    <span className="text-[11px] font-medium">Cobertura</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm dark:text-white">
                    {selectedPolicy.cobertura ? `R$ ${selectedPolicy.cobertura}` : "R$ 0,00"}
                  </p>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-[#94A3B8]">Dias restantes</span>
                    {selectedPolicy.dias_restantes !== undefined && selectedPolicy.dias_restantes !== null ? (
                      <span className={`font-bold text-base ${selectedPolicy.dias_restantes < 0 ? "text-[#a0191e]" : selectedPolicy.dias_restantes <= 30 ? "text-[#f59e0b]" : "text-[#168821]"}`}>
                        {selectedPolicy.dias_restantes < 0 ? "Vencida" : `${selectedPolicy.dias_restantes} dias`}
                      </span>
                    ) : (
                      <span className="font-bold text-base text-gray-400">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

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

      {/* Panel Footer with Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur mt-auto flex gap-2 dark:bg-[#1A1F2E] dark:border-[#2E3447]">
        {selectedPolicy ? (
          <>
            <button
              onClick={() => onEditApolice?.(selectedPolicy.id)}
              className="flex-1 py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm dark:bg-[#242938] dark:border-[#2E3447] dark:text-white dark:hover:bg-[#2E3447]"
            >
              Editar
            </button>
            <button
              onClick={() => onViewApolice?.(selectedPolicy.id)}
              className="flex-1 py-2 px-3 bg-[#8B1A1A] hover:bg-[#a43030] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-[#8B1A1A]/20"
            >
              Ver Apólice
            </button>
          </>
        ) : (
          <button
            onClick={() => onEditApolice?.(selectedLuc)}
            className="w-full py-2 px-3 bg-[#168821] hover:bg-[#126b1a] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-[#168821]/20 flex items-center justify-center gap-2"
          >
            Cadastrar Nova Apólice
          </button>
        )}
      </div>
    </div>
  );
}

// Separate component for the Tooltip to keep rendering clean
function TooltipOverlay({ luc, mousePos, policy }: { luc: string, mousePos: { x: number, y: number }, policy: any }) {
  const details = getStatusDetails(policy?.status);
  const diasRestantes = policy?.dias_restantes;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed z-[100] pointer-events-none w-64 p-4 rounded-xl shadow-2xl border border-gray-100 bg-white/95 backdrop-blur-md dark:bg-[#1A1F2E]/95 dark:border-[#2E3447]"
      style={{
        left: mousePos.x + 15, // Offset slightly from cursor
        top: mousePos.y + 15,
      }}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-[#2E3447]">
        <span className="font-bold text-gray-900 dark:text-white">{luc}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white"
          style={{ backgroundColor: details.bg, color: details.text }}
        >
          {details.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-[#94A3B8]">Loja:</span>
          <span className="font-medium text-gray-900 truncate max-w-[120px] dark:text-white" title={policy?.fantasia}>
            {policy?.fantasia || "Não informada"}
          </span>
        </div>

        {policy && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-[#94A3B8]">Vencimento:</span>
            <span className="font-medium text-gray-900 dark:text-white">{policy.vencimento || "—"}</span>
          </div>
        )}

        {policy && diasRestantes !== undefined && diasRestantes !== null && (
          <div className="flex justify-between items-center mt-1 pt-1">
            <span className="text-gray-500 dark:text-[#94A3B8]">Restantes:</span>
            <span className={`font-bold ${diasRestantes < 0 ? "text-[#a0191e]" : diasRestantes <= 30 ? "text-[#f59e0b]" : "text-[#168821]"}`}>
              {diasRestantes < 0 ? "Vencida" : `${diasRestantes} dias`}
            </span>
          </div>
        )}

        {!policy && (
          <div className="text-xs text-gray-400 italic pt-1 dark:text-[#94A3B8]">
            LUC sem apólice cadastrada no sistema.
          </div>
        )}
      </div>
    </motion.div>
  );
}