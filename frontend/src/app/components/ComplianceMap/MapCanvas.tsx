import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapCell, CELL_W, CELL_H, CELL_GAP } from "./MapCell";
import type { FloorGroup, TooltipState } from "./types";
import type { CellData } from "./types";

// ─── MapCanvas ────────────────────────────────────────────────────────────────

type MapCanvasProps = {
  floorGroups: FloorGroup[];
  selectedLuc: string;
  cssTransform: string;
  onSelect: (luc: string) => void;
  onTooltip: (state: TooltipState) => void;
};

const FLOOR_LABEL_WIDTH = 80;
const FLOOR_GAP = 16;

export const MapCanvas = memo(function MapCanvas({
  floorGroups,
  selectedLuc,
  cssTransform,
  onSelect,
  onTooltip,
}: MapCanvasProps) {
  return (
    <div
      style={{
        transformOrigin: "top left",
        transform: cssTransform,
        willChange: "transform",
        padding: "24px 32px 32px",
        display: "inline-flex",
        flexDirection: "column",
        gap: FLOOR_GAP,
        minWidth: "max-content",
      }}
    >
      <AnimatePresence>
        {floorGroups.map((group, floorIndex) => (
          <FloorRow
            key={group.floor}
            group={group}
            floorIndex={floorIndex}
            selectedLuc={selectedLuc}
            onSelect={onSelect}
            onTooltip={onTooltip}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ─── FloorRow ─────────────────────────────────────────────────────────────────

type FloorRowProps = {
  group: FloorGroup;
  floorIndex: number;
  selectedLuc: string;
  onSelect: (luc: string) => void;
  onTooltip: (state: TooltipState) => void;
};

const FloorRow = memo(function FloorRow({
  group,
  floorIndex,
  selectedLuc,
  onSelect,
  onTooltip,
}: FloorRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: floorIndex * 0.04,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      {/* Floor Label */}
      <div
        style={{
          width: FLOOR_LABEL_WIDTH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(148, 163, 184, 0.5)",
          }}
        >
          Piso
        </span>
        <span
          style={{
            fontFamily: "'Inter', monospace",
            fontSize: 22,
            fontWeight: 800,
            color: "rgba(241, 245, 249, 0.85)",
            lineHeight: 1,
          }}
        >
          {group.floor}
        </span>
        <div
          style={{
            width: 32,
            height: 1.5,
            background: "linear-gradient(90deg, rgba(139,26,26,0.7), transparent)",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Cells Row */}
      <div
        style={{
          display: "flex",
          gap: CELL_GAP,
          flexWrap: "nowrap",
          alignItems: "center",
        }}
      >
        {group.cells.map((cell: CellData, cellIndex: number) => (
          <motion.div
            key={cell.luc}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: floorIndex * 0.04 + cellIndex * 0.015,
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            <MapCell
              cell={cell}
              isSelected={selectedLuc === cell.luc}
              onSelect={onSelect}
              onTooltip={onTooltip}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});
