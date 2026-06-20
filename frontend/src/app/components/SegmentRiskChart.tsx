import { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import {
  getSelectedApoliceLuc,
  subscribeSelectedApoliceLuc,
  getSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "../store";
import { motion, AnimatePresence } from "motion/react";
import { normalizarSegmento } from "../utils/segment";

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentRiskItem = {
  segmento: string;
  vencidas: number;
  dias_medio_atraso: number;
};

/**
 * NORMAL  — full vertical card: name + meta + bar (≥ 240px)
 * COMPACT — numbered list: index · name · count · micro-bar (≥ 140px)
 * ULTRA   — dot list: ● name (truncated) · count (< 140px)
 */
type DisplayMode = "normal" | "compact" | "ultra";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENT_BAR_COLORS = [
  "#c4151f", "#a0191e", "#bc9b7c", "#1c3d32", "#6e150e", "#788033", "#3e0000", "#f9e4a0",
];

const COMPACT_THRESHOLD = 240; // px — acima disso, modo NORMAL
const ULTRA_THRESHOLD   = 155; // px — abaixo disso, modo ULTRA

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(value: string): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  const p = new Date(value);
  return isNaN(p.getTime()) ? null : p;
}

function diffInDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function buildRiskFromApolices(
  apolices: Array<{ segmento?: string; tipo?: string; vencimento?: string }>
): SegmentRiskItem[] {
  const today = new Date();
  const agg = new Map<string, { vencidas: number; totalAtraso: number }>();

  apolices.forEach((a) => {
    const raw = (a.segmento || a.tipo || "Não informado").trim() || "Não informado";
    const seg = raw !== "Não informado" ? normalizarSegmento(raw) : raw;
    const venc = parseDate(a.vencimento || "");
    if (!venc) return;
    const days = diffInDays(today, venc);
    if (days >= 0) return;
    const cur = agg.get(seg) || { vencidas: 0, totalAtraso: 0 };
    cur.vencidas += 1;
    cur.totalAtraso += -days;
    agg.set(seg, cur);
  });

  return Array.from(agg.entries())
    .map(([segmento, v]) => ({
      segmento,
      vencidas: v.vencidas,
      dias_medio_atraso: v.vencidas > 0 ? Math.round(v.totalAtraso / v.vencidas) : 0,
    }))
    .sort((a, b) =>
      b.vencidas !== a.vencidas
        ? b.vencidas - a.vencidas
        : a.segmento.localeCompare(b.segmento, "pt-BR")
    );
}

// ─── Hook: container width → DisplayMode ─────────────────────────────────────

function useDisplayMode(containerRef: React.RefObject<HTMLElement | null>): DisplayMode {
  const [width, setWidth] = useState(9999);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(getSidebarCollapsed());

  // Observe real container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? el.offsetWidth;
      setWidth(w);
    });
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, [containerRef]);

  // Subscribe to sidebar state
  useEffect(() => {
    return subscribeSidebarCollapsed(() => {
      setSidebarCollapsedState(getSidebarCollapsed());
    });
  }, []);

  // When sidebar opens, available space shrinks ~176px — simulate that
  // by biasing toward ultra aggressively
  const effectiveWidth = sidebarCollapsed ? width : width - 20;

  if (effectiveWidth >= COMPACT_THRESHOLD) return "normal";
  if (effectiveWidth >= ULTRA_THRESHOLD) return "compact";
  return "ultra";
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function NormalRow({
  item,
  index,
  maxVencidas,
  isHighlighted,
  selectedSegment,
}: {
  item: SegmentRiskItem;
  index: number;
  maxVencidas: number;
  isHighlighted: boolean;
  selectedSegment: string;
}) {
  const barW = Math.max((item.vencidas / maxVencidas) * 100, item.vencidas > 0 ? 12 : 0);
  const color = SEGMENT_BAR_COLORS[index % SEGMENT_BAR_COLORS.length];

  return (
    <motion.div
      key={item.segmento}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: selectedSegment && !isHighlighted ? 0.25 : 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      className="group"
    >
      <div className="flex flex-col mb-0.5">
        <span
          className="text-[13px] font-semibold leading-tight truncate"
          style={{ color: isHighlighted ? "#a0191e" : undefined }}
          title={item.segmento}
        >
          {index + 1}. {item.segmento}
        </span>
        <span
          className="text-[11px] font-medium text-gray-500 dark:text-[#94A3B8] mt-0.5"
          style={{ color: isHighlighted ? "#6e150e" : undefined }}
        >
          <span className="text-gray-900 dark:text-gray-300">{item.vencidas}</span> vencidas
          <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-900 dark:text-gray-300">{item.dias_medio_atraso}d</span> atraso médio
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-[#222] overflow-hidden mt-1">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${barW}%` }}
          transition={{ delay: index * 0.07 + 0.15, duration: 0.65, ease: "easeOut" }}
          style={{ background: color, opacity: isHighlighted ? 1 : 0.85 }}
        />
      </div>
    </motion.div>
  );
}

function CompactRow({
  item,
  index,
  maxVencidas,
  isHighlighted,
  selectedSegment,
}: {
  item: SegmentRiskItem;
  index: number;
  maxVencidas: number;
  isHighlighted: boolean;
  selectedSegment: string;
}) {
  const barW = Math.max((item.vencidas / maxVencidas) * 100, item.vencidas > 0 ? 10 : 0);
  const color = SEGMENT_BAR_COLORS[index % SEGMENT_BAR_COLORS.length];

  return (
    <motion.div
      key={item.segmento}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: selectedSegment && !isHighlighted ? 0.25 : 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
      className="flex items-center gap-1.5 py-[3px]"
    >
      {/* Index */}
      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-600 w-3 flex-shrink-0 tabular-nums">
        {index + 1}
      </span>

      {/* Name */}
      <span
        className="text-[11px] font-semibold flex-1 min-w-0 truncate leading-none"
        style={{ color: isHighlighted ? "#a0191e" : undefined }}
        title={item.segmento}
      >
        {item.segmento}
      </span>

      {/* Count */}
      <span
        className="text-[11px] font-bold tabular-nums flex-shrink-0"
        style={{ color }}
      >
        {item.vencidas}
      </span>

      {/* Micro bar */}
      <div className="w-[36px] flex-shrink-0 h-[3px] bg-gray-100 dark:bg-[#222] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${barW}%` }}
          transition={{ delay: index * 0.05 + 0.1, duration: 0.5, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </motion.div>
  );
}

function UltraRow({
  item,
  index,
  isHighlighted,
  selectedSegment,
}: {
  item: SegmentRiskItem;
  index: number;
  isHighlighted: boolean;
  selectedSegment: string;
}) {
  const color = SEGMENT_BAR_COLORS[index % SEGMENT_BAR_COLORS.length];

  return (
    <motion.div
      key={item.segmento}
      initial={{ opacity: 0 }}
      animate={{ opacity: selectedSegment && !isHighlighted ? 0.2 : 1 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="flex items-center gap-1 py-[2px]"
    >
      {/* Dot */}
      <span
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ background: color }}
      />

      {/* Name truncated */}
      <span
        className="text-[10px] font-semibold flex-1 min-w-0 truncate leading-tight"
        style={{ color: isHighlighted ? "#a0191e" : undefined }}
        title={item.segmento}
      >
        {item.segmento}
      </span>

      {/* Count */}
      <span
        className="text-[10px] font-bold tabular-nums flex-shrink-0 ml-0.5"
        style={{ color }}
      >
        {item.vencidas}
      </span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SegmentRiskChart({ isPresentationMode = false }: { isPresentationMode?: boolean }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const mode = useDisplayMode(containerRef);

  const [data, setData] = useState<SegmentRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLuc, setSelectedLuc] = useState(getSelectedApoliceLuc());
  const [lucToSegment, setLucToSegment] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  // Subscribe to selected LUC
  useEffect(() => subscribeSelectedApoliceLuc(() => setSelectedLuc(getSelectedApoliceLuc())), []);

  // Fetch risk data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    request<SegmentRiskItem[]>("/kpis/risk-by-segment")
      .then((r) => { if (active) setData(r); })
      .catch(() =>
        listApolices()
          .then((a) => { if (active) { setData(buildRiskFromApolices(a)); setError(null); } })
          .catch(() => { if (active) { setData([]); setError("Não foi possível carregar."); } })
      )
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  // Build LUC → segment map
  useEffect(() => {
    let active = true;
    listApolices().then((a) => {
      if (!active) return;
      const m: Record<string, string> = {};
      a.forEach((p) => { if (p.luc) m[p.luc] = p.segmento || p.tipo || ""; });
      setLucToSegment(m);
    }).catch(() => { if (active) setLucToSegment({}); });
    return () => { active = false; };
  }, []);

  const selectedSegment = useMemo(
    () => (selectedLuc ? normalizarSegmento(lucToSegment[selectedLuc] || "") : ""),
    [lucToSegment, selectedLuc]
  );

  const maxVencidas = useMemo(() => {
    if (!data.length) return 50;
    return Math.max(Math.ceil(Math.max(...data.map((i) => i.vencidas)) / 10) * 10 + 10, 50);
  }, [data]);

  // Slice according to mode and showAll state
  const limit   = mode === "ultra" ? 6 : 5;
  const visible = showAll || !limit ? data : data.slice(0, limit);
  const hasMore = limit !== undefined && data.length > limit;

  // ── Presentation Mode (unchanged behaviour) ──────────────────────────────

  if (isPresentationMode) {
    return (
      <div className="h-auto md:h-full flex flex-col pt-1">
        <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="h-full flex items-center justify-center animate-pulse bg-white/5 rounded-lg" />
          ) : error ? (
            <div className="h-full flex items-center justify-center text-[12px] text-[#a0191e]">{error}</div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[12px] text-gray-500">Nenhum risco.</div>
          ) : (
            <div className="space-y-[14px]">
              {data.slice(0, 5).map((item, index) => {
                const w = Math.max((item.vencidas / maxVencidas) * 100, item.vencidas > 0 ? 12 : 0);
                const c = SEGMENT_BAR_COLORS[index % SEGMENT_BAR_COLORS.length];
                return (
                  <div key={item.segmento}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate" title={item.segmento}>{item.segmento}</span>
                      <span className="text-[11px] font-bold text-gray-500 dark:text-white/50 ml-1 flex-shrink-0">{item.vencidas}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: c }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal Mode ──────────────────────────────────────────────────────────

  const modeLabel: Record<DisplayMode, string> = {
    normal: "",
    compact: `Top ${limit}`,
    ultra: `RISCO · TOP ${limit}`,
  };

  return (
    <section
      ref={containerRef as React.RefObject<HTMLElement>}
      className="h-full rounded-xl bg-white dark:bg-[#151515] shadow-sm border border-gray-100 dark:border-[#222222] flex flex-col relative overflow-hidden"
      style={{ minWidth: 0 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {mode === "ultra" ? (
          /* ULTRA header: ultra-compact single line */
          <motion.div
            key="header-ultra"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between px-2.5 pt-2.5 pb-1 flex-shrink-0"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-[#94A3B8] truncate">
              {modeLabel.ultra}
            </span>
            <span className="text-[8px] text-gray-400 dark:text-gray-600 ml-1 flex-shrink-0">···</span>
          </motion.div>
        ) : mode === "compact" ? (
          /* COMPACT header: title + badge */
          <motion.div
            key="header-compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between px-3 pt-3 pb-1.5 flex-shrink-0"
          >
            <span className="text-[12px] font-semibold text-gray-900 dark:text-white truncate">
              Risco por Segmento
            </span>
          </motion.div>
        ) : (
          /* NORMAL header: full title + subtitle */
          <motion.div
            key="header-normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 pt-4 pb-2 flex-shrink-0"
          >
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Risco por Segmento
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-[#94A3B8] mt-0.5">
              Segmentos com maior volume de apólices vencidas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", minHeight: 0 }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3e0000]" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-[11px] text-[#a0191e] px-2 text-center">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-gray-500 dark:text-[#94A3B8] px-2 text-center">
            Nenhum risco identificado.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {mode === "ultra" ? (
              <motion.div
                key="list-ultra"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-2.5 pb-2"
              >
                {visible.map((item, index) => (
                  <UltraRow
                    key={item.segmento}
                    item={item}
                    index={index}
                    isHighlighted={!!selectedSegment && normalizarSegmento(item.segmento) === selectedSegment}
                    selectedSegment={selectedSegment}
                  />
                ))}
              </motion.div>
            ) : mode === "compact" ? (
              <motion.div
                key="list-compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-3 pb-2"
              >
                {visible.map((item, index) => (
                  <CompactRow
                    key={item.segmento}
                    item={item}
                    index={index}
                    maxVencidas={maxVencidas}
                    isHighlighted={!!selectedSegment && normalizarSegmento(item.segmento) === selectedSegment}
                    selectedSegment={selectedSegment}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list-normal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pb-3 space-y-4"
              >
                {visible.map((item, index) => (
                  <NormalRow
                    key={item.segmento}
                    item={item}
                    index={index}
                    maxVencidas={maxVencidas}
                    isHighlighted={!!selectedSegment && normalizarSegmento(item.segmento) === selectedSegment}
                    selectedSegment={selectedSegment}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Show more ──────────────────────────────────────────────────── */}
      {hasMore && !loading && !error && (
        <div className={`flex-shrink-0 flex justify-center pb-2 ${mode === "ultra" ? "pt-0.5" : "pt-1"}`}>
          <button
            onClick={() => setShowAll((p) => !p)}
            className={`font-semibold text-[#8b1a1a] hover:text-[#6e150e] transition-colors
              dark:text-[#fca5a5] dark:hover:text-[#f87171]
              ${mode === "ultra"
                ? "text-[9px] px-2 py-0.5"
                : "text-[11px] bg-red-50 hover:bg-red-100 dark:bg-[#a0191e]/10 dark:hover:bg-[#a0191e]/20 px-3 py-1.5 rounded-lg"
              }`}
          >
            {showAll ? "Recolher" : `+${data.length - (limit ?? 0)} mais`}
          </button>
        </div>
      )}
    </section>
  );
}
