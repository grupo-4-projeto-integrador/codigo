// ─── Domain Types ────────────────────────────────────────────────────────────

export type StatusKey = "ok" | "warning" | "critical" | "empty";

export type MapLayoutItem = {
  luc: string;
  floor: number;
  position: number;
};

export type CellData = {
  luc: string;
  floor: number;
  position: number;
  status: StatusKey;
  fantasia: string;
  segmento: string;
  seguradora: string;
  vigencia: string;
  vencimento: string;
  hasPolicy: boolean;
};

export type FloorGroup = {
  floor: number;
  cells: CellData[];
};

export type LegendCount = Record<StatusKey, number>;

// ─── Canvas State ─────────────────────────────────────────────────────────────

export type CanvasTransform = {
  x: number;
  y: number;
  scale: number;
};

export type TooltipState = {
  visible: boolean;
  cell: CellData | null;
  screenX: number;
  screenY: number;
};

// ─── Status Metadata ─────────────────────────────────────────────────────────

export const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; glow: string; bg: string; border: string; dot: string }
> = {
  ok: {
    label: "Conforme",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.45)",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.35)",
    dot: "#22c55e",
  },
  warning: {
    label: "A Vencer",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.45)",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    dot: "#f59e0b",
  },
  critical: {
    label: "Vencida",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.5)",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    dot: "#ef4444",
  },
  empty: {
    label: "Sem Apólice",
    color: "#64748b",
    glow: "rgba(100, 116, 139, 0.25)",
    bg: "rgba(100, 116, 139, 0.07)",
    border: "rgba(100, 116, 139, 0.2)",
    dot: "#64748b",
  },
};
