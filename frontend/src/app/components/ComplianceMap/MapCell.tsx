import { memo, useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { STATUS_META } from "./types";
import type { CellData, TooltipState } from "./types";
import { useMagneticHover } from "./hooks";

// ─── Cell Dimensions ──────────────────────────────────────────────────────────
export const CELL_W = 88;
export const CELL_H = 72;
export const CELL_GAP = 8;

// ─── MapCell ─────────────────────────────────────────────────────────────────

type MapCellProps = {
  cell: CellData;
  isSelected: boolean;
  onSelect: (luc: string) => void;
  onTooltip: (state: TooltipState) => void;
};

export const MapCell = memo(function MapCell({
  cell,
  isSelected,
  onSelect,
  onTooltip,
}: MapCellProps) {
  const meta = STATUS_META[cell.status];
  const { ref, onMouseMove, onMouseLeave } = useMagneticHover(5);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      onTooltip({
        visible: true,
        cell,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    },
    [cell, onTooltip]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseMove(e);
      onTooltip({
        visible: true,
        cell,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    },
    [cell, onMouseMove, onTooltip]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onMouseLeave();
    onTooltip({ visible: false, cell: null, screenX: 0, screenY: 0 });
  }, [onMouseLeave, onTooltip]);

  const handleClick = useCallback(() => {
    onSelect(cell.luc);
  }, [cell.luc, onSelect]);

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`LUC ${cell.luc} — ${meta.label}`}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{
        width: CELL_W,
        height: CELL_H,
        flexShrink: 0,
        position: "relative",
        cursor: "pointer",
        borderRadius: 10,
        background: isSelected
          ? `linear-gradient(135deg, ${meta.color}33 0%, ${meta.color}1a 100%)`
          : `linear-gradient(135deg, ${meta.bg} 0%, rgba(15,17,26,0.6) 100%)`,
        border: `1.5px solid ${isSelected ? meta.color : isHovered ? meta.border : "rgba(255,255,255,0.08)"}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${meta.color}, 0 0 18px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`
          : isHovered
          ? `0 4px 20px ${meta.glow}, 0 0 0 1px ${meta.border}, inset 0 1px 0 rgba(255,255,255,0.08)`
          : "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
        transform: `translate3d(var(--mx, 0px), var(--my, 0px), 0) ${isHovered ? "scale(1.04)" : "scale(1)"} ${isSelected ? "translateY(-1px)" : ""}`,
        transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
        willChange: "transform, box-shadow",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Status glow stripe at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: 2,
          borderRadius: "0 0 4px 4px",
          background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
          opacity: isHovered || isSelected ? 1 : 0.4,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Status dot */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: meta.color,
          boxShadow: `0 0 6px ${meta.color}`,
          animation: cell.status === "critical" ? "pulseDot 1.8s ease-in-out infinite" : "none",
        }}
      />

      {/* LUC Code */}
      <span
        style={{
          fontFamily: "'Inter', 'Roboto Mono', monospace",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: isSelected ? meta.color : "#f1f5f9",
          lineHeight: 1,
          transition: "color 0.15s ease",
        }}
      >
        {cell.luc}
      </span>

      {/* Store name */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: "rgba(148, 163, 184, 0.85)",
          textAlign: "center",
          maxWidth: CELL_W - 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
          letterSpacing: "0.02em",
        }}
      >
        {cell.hasPolicy ? cell.fantasia : "—"}
      </span>

      {/* Noise texture overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 10,
          background: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />
    </motion.div>
  );
});

// ─── CellTooltip ──────────────────────────────────────────────────────────────

type CellTooltipProps = {
  state: TooltipState;
};

export const CellTooltip = memo(function CellTooltip({ state }: CellTooltipProps) {
  const { visible, cell, screenX, screenY } = state;
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!visible || !cell) return null;

  const meta = STATUS_META[cell.status];
  const OFFSET_X = 16;
  const OFFSET_Y = -12;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: "none",
        transform: `translate3d(${screenX + OFFSET_X}px, ${screenY + OFFSET_Y}px, 0)`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        style={{
          background: "linear-gradient(135deg, rgba(15,17,26,0.97) 0%, rgba(22,25,38,0.97) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${meta.border}`,
          borderRadius: 12,
          padding: "12px 16px",
          minWidth: 220,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 20px ${meta.glow}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: meta.color,
              boxShadow: `0 0 8px ${meta.color}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Inter', monospace",
              fontSize: 14,
              fontWeight: 700,
              color: "#f1f5f9",
              letterSpacing: "0.05em",
            }}
          >
            {cell.luc}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: meta.color,
              background: `${meta.color}18`,
              border: `1px solid ${meta.border}`,
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${meta.color}30, rgba(255,255,255,0.06), transparent)`,
            marginBottom: 10,
          }}
        />

        {/* Data rows */}
        <TooltipRow label="Loja" value={cell.fantasia} />
        <TooltipRow label="Segmento" value={cell.segmento} />
        <TooltipRow label="Seguradora" value={cell.seguradora} />
        <TooltipRow label="Vigência" value={cell.vigencia} />
        <TooltipRow label="Vencimento" value={cell.vencimento} accent={cell.status === "critical"} />

        {!cell.hasPolicy && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 8px",
              background: "rgba(100, 116, 139, 0.1)",
              borderRadius: 6,
              fontSize: 10,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Nenhuma apólice cadastrada para este LUC
          </div>
        )}
      </motion.div>
    </div>
  );
});

function TooltipRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          color: accent ? "#ef4444" : "#cbd5e1",
          fontWeight: accent ? 600 : 400,
          textAlign: "right",
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}
