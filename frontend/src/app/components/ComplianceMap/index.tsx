import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Map, AlertTriangle, RefreshCw } from "lucide-react";
import { request } from "../../../api/client";
import { listApolices } from "../../../api/apolice";
import type { ApoliceRecord } from "../../../types/apolice";
import {
  getSelectedApoliceLuc,
  setSelectedApoliceLuc,
  subscribeSelectedApoliceLuc,
} from "../../store";
import { useMapData } from "./utils";
import { usePanZoom } from "./hooks";
import { MapCanvas } from "./MapCanvas";
import { MapControls, MapLegend } from "./MapControls";
import { CellTooltip } from "./MapCell";
import type { MapLayoutItem, StatusKey, TooltipState } from "./types";

// ─── CSS Injection (pulseDot keyframes) ──────────────────────────────────────
const CSS_INJECT = `
  @keyframes pulseDot {
    0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
    50% { opacity: 0.4; box-shadow: 0 0 2px currentColor; }
  }
  .compliance-canvas-viewport {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .compliance-canvas-viewport::-webkit-scrollbar {
    display: none;
  }
  .compliance-map-grid-bg {
    background-image:
      radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 28px 28px;
  }
`;

// ─── ComplianceMap ────────────────────────────────────────────────────────────

export function ComplianceMap() {
  const [layout, setLayout] = useState<MapLayoutItem[]>([]);
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLuc, setSelectedLucState] = useState(getSelectedApoliceLuc());
  const [activeFilter, setActiveFilter] = useState<StatusKey | "all">("all");
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    cell: null,
    screenX: 0,
    screenY: 0,
  });

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mapLayout, policyList] = await Promise.all([
        request<MapLayoutItem[]>("/map-layout"),
        listApolices(),
      ]);
      setLayout(mapLayout);
      setApolices(policyList);
    } catch {
      setError("Não foi possível carregar o mapa de conformidade.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── Global Store Sync ───────────────────────────────────────────────────────
  useEffect(
    () =>
      subscribeSelectedApoliceLuc(() => {
        setSelectedLucState(getSelectedApoliceLuc());
      }),
    []
  );

  // ── Selection Handler ───────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (luc: string) => {
      setSelectedApoliceLuc(selectedLuc === luc ? "" : luc);
    },
    [selectedLuc]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedApoliceLuc("");
  }, []);

  // ── Data Transform ──────────────────────────────────────────────────────────
  const { floorGroups, legend } = useMapData(layout, apolices);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredFloorGroups = useMemo(() => {
    if (activeFilter === "all") return floorGroups;
    return floorGroups
      .map((g) => ({
        ...g,
        cells: g.cells.filter((c) => c.status === activeFilter),
      }))
      .filter((g) => g.cells.length > 0);
  }, [floorGroups, activeFilter]);

  // ── Pan/Zoom ─────────────────────────────────────────────────────────────────
  const {
    containerRef,
    cssTransform,
    scale,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut,
    resetView,
  } = usePanZoom(0.82);

  return (
    <>
      {/* Inject CSS once */}
      <style>{CSS_INJECT}</style>

      <section
        style={{
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg, #0f111a 0%, #141726 100%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          position: "relative",
        }}
        aria-label="Mapa de Conformidade por LUC"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "18px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(139,26,26,0.4) 0%, rgba(110,21,14,0.2) 100%)",
                border: "1px solid rgba(139,26,26,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Map size={18} color="#f87171" />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Mapa de Conformidade
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: "#475569",
                  margin: "2px 0 0",
                }}
              >
                Navegue pelo território operacional — pan + scroll para zoom
              </p>
            </div>
          </div>

          {/* Legend + Reload */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {!loading && !error && (
              <MapLegend
                legend={legend}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            )}
            <button
              onClick={() => void loadData()}
              title="Recarregar dados"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "6px 8px",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── Canvas Viewport ────────────────────────────────────────────── */}
        <div
          style={{
            height: 420,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Dot grid background */}
          <div
            className="compliance-map-grid-bg"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />

          {/* Ambient gradient vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,11,18,0.6) 100%)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />

          <AnimatePresence mode="wait">
            {loading ? (
              <LoadingState key="loading" />
            ) : error ? (
              <ErrorState key="error" message={error} onRetry={() => void loadData()} />
            ) : (
              <motion.div
                key="canvas"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                ref={containerRef}
                className="compliance-canvas-viewport"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{
                  width: "100%",
                  height: "100%",
                  cursor: "grab",
                  userSelect: "none",
                  touchAction: "none",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <MapCanvas
                  floorGroups={filteredFloorGroups}
                  selectedLuc={selectedLuc}
                  cssTransform={cssTransform}
                  onSelect={handleSelect}
                  onTooltip={setTooltip}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom Controls */}
          {!loading && !error && (
            <MapControls
              scale={scale}
              selectedLuc={selectedLuc}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={resetView}
              onClearSelection={handleClearSelection}
            />
          )}
        </div>

        {/* ── Footer hint ───────────────────────────────────────────────── */}
        {!loading && !error && (
          <div
            style={{
              padding: "8px 24px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.04em" }}>
              {layout.length} LUCs mapeados · {apolices.length} apólices carregadas
            </span>
            {selectedLuc && (
              <span style={{ fontSize: 10, color: "#8b1a1a", fontWeight: 600, letterSpacing: "0.04em" }}>
                ◎ {selectedLuc} selecionado — filtrando toda a plataforma
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Portal Tooltip (outside section for z-index) ──────────────── */}
      <CellTooltip state={tooltip} />
    </>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 15,
      }}
    >
      {/* Skeleton grid preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.35 }}>
        {[5, 8, 7, 6].map((count, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 80,
                height: 72,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
              }}
            />
            {Array.from({ length: count }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{
                  duration: 1.6,
                  delay: (rowIdx * count + i) * 0.05,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: 88,
                  height: 72,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "#334155",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Carregando território...
      </p>
    </motion.div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        zIndex: 15,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={20} color="#ef4444" />
      </div>
      <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", maxWidth: 260 }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        style={{
          background: "rgba(139,26,26,0.3)",
          border: "1px solid rgba(139,26,26,0.4)",
          borderRadius: 8,
          padding: "8px 20px",
          cursor: "pointer",
          color: "#fca5a5",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          transition: "all 0.15s ease",
        }}
      >
        Tentar novamente
      </button>
    </motion.div>
  );
}
