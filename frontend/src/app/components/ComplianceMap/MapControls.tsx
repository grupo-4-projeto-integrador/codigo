import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ZoomIn, ZoomOut, Compass, X } from "lucide-react";
import { STATUS_META } from "./types";
import type { LegendCount, StatusKey } from "./types";

// ─── MapControls ─────────────────────────────────────────────────────────────

type MapControlsProps = {
  scale: number;
  selectedLuc: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onClearSelection: () => void;
};

export const MapControls = memo(function MapControls({
  scale,
  selectedLuc,
  onZoomIn,
  onZoomOut,
  onReset,
  onClearSelection,
}: MapControlsProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 20,
      }}
    >
      {/* Zoom level indicator */}
      <div
        style={{
          background: "rgba(15,17,26,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "4px 10px",
          textAlign: "center",
          fontFamily: "'Inter', monospace",
          fontSize: 10,
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.06em",
        }}
      >
        {Math.round(scale * 100)}%
      </div>

      {/* Controls cluster */}
      <div
        style={{
          background: "rgba(15,17,26,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <ControlButton icon={<ZoomIn size={15} />} title="Ampliar" onClick={onZoomIn} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <ControlButton icon={<ZoomOut size={15} />} title="Reduzir" onClick={onZoomOut} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <ControlButton icon={<Compass size={15} />} title="Resetar vista" onClick={onReset} />
      </div>

      {/* Clear selection button */}
      <AnimatePresence>
        {selectedLuc && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 25 }}
            onClick={onClearSelection}
            title="Limpar seleção"
            style={{
              background: "rgba(139, 26, 26, 0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(217, 48, 48, 0.3)",
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#fca5a5",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <X size={12} />
            {selectedLuc}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── ControlButton ────────────────────────────────────────────────────────────

function ControlButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#94a3b8",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9";
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

// ─── MapLegend ────────────────────────────────────────────────────────────────

type MapLegendProps = {
  legend: LegendCount;
  activeFilter: StatusKey | "all";
  onFilterChange: (filter: StatusKey | "all") => void;
};

const LEGEND_STATUSES: StatusKey[] = ["ok", "warning", "critical", "empty"];

export const MapLegend = memo(function MapLegend({
  legend,
  activeFilter,
  onFilterChange,
}: MapLegendProps) {
  const total = Object.values(legend).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {/* All filter */}
      <LegendChip
        label="Todos"
        count={total}
        color="#94a3b8"
        glow="rgba(148,163,184,0.2)"
        isActive={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />

      {LEGEND_STATUSES.map((s) => {
        const meta = STATUS_META[s];
        return (
          <LegendChip
            key={s}
            label={meta.label}
            count={legend[s]}
            color={meta.color}
            glow={meta.glow}
            isActive={activeFilter === s}
            onClick={() => onFilterChange(s)}
          />
        );
      })}
    </div>
  );
});

// ─── LegendChip ──────────────────────────────────────────────────────────────

function LegendChip({
  label,
  count,
  color,
  glow,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  glow: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      style={{
        background: isActive ? `${color}22` : "rgba(255,255,255,0.04)",
        border: `1px solid ${isActive ? color : "rgba(255,255,255,0.1)"}`,
        borderRadius: 20,
        padding: "4px 10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s ease",
        boxShadow: isActive ? `0 0 12px ${glow}` : "none",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: isActive ? `0 0 6px ${color}` : "none",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isActive ? color : "#64748b",
          letterSpacing: "0.04em",
          transition: "color 0.15s ease",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: isActive ? "#f1f5f9" : "#475569",
          background: isActive ? `${color}30` : "rgba(255,255,255,0.05)",
          borderRadius: 8,
          padding: "1px 6px",
          letterSpacing: "0.02em",
          transition: "all 0.15s ease",
        }}
      >
        {count}
      </span>
    </motion.button>
  );
}
