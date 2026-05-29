import { useMemo } from "react";
import type { ApoliceRecord } from "../../../types/apolice";
import type { CellData, FloorGroup, LegendCount, MapLayoutItem, StatusKey } from "./types";

// ─── Status Normalization ────────────────────────────────────────────────────

export function normalizeStatus(status: string): StatusKey {
  const s = status.toLowerCase().trim();
  if (s === "ativa") return "ok";
  if (s === "a vencer") return "warning";
  if (s === "vencida") return "critical";
  return "empty";
}

// ─── Data Transform Hook ─────────────────────────────────────────────────────

export function useMapData(
  layout: MapLayoutItem[],
  apolices: ApoliceRecord[]
): { floorGroups: FloorGroup[]; legend: LegendCount; maxColumns: number } {
  return useMemo(() => {
    const policyMap = new Map(apolices.map((p) => [p.luc, p]));

    // Build cells
    const cells: CellData[] = layout.map((item) => {
      const policy = policyMap.get(item.luc);
      return {
        luc: item.luc,
        floor: item.floor,
        position: item.position,
        status: policy ? normalizeStatus(policy.status) : "empty",
        fantasia: policy?.fantasia ?? "Sem apólice",
        segmento: policy?.segmento ?? "—",
        seguradora: policy?.seguradora ?? "—",
        vigencia: policy?.vigencia ?? "—",
        vencimento: policy?.vencimento ?? "—",
        hasPolicy: Boolean(policy),
      };
    });

    // Group by floor
    const floorMap = new Map<number, CellData[]>();
    for (const cell of cells) {
      const existing = floorMap.get(cell.floor) ?? [];
      existing.push(cell);
      floorMap.set(cell.floor, existing);
    }

    const floorGroups: FloorGroup[] = Array.from(floorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, fc]) => ({
        floor,
        cells: fc.sort((a, b) => a.position - b.position),
      }));

    // Legend counts
    const legend: LegendCount = { ok: 0, warning: 0, critical: 0, empty: 0 };
    for (const cell of cells) {
      legend[cell.status]++;
    }

    // Max columns (for grid sizing)
    const maxColumns = Math.max(0, ...layout.map((item) => item.position));

    return { floorGroups, legend, maxColumns };
  }, [layout, apolices]);
}
