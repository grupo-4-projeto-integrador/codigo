import { useEffect, useMemo, useState } from "react";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import {
  getSelectedApoliceLuc,
  setSelectedApoliceLuc,
  subscribeSelectedApoliceLuc,
} from "../store";

type MapLayoutItem = {
  luc: string;
  floor: number;
  position: number;
};

type StatusKey = "ok" | "warning" | "critical";

const CELL_SIZE = 76;
const CELL_GAP = 10;
const LEFT_PADDING = 24;
const TOP_PADDING = 24;
const LABEL_WIDTH = 108;
const HEADER_HEIGHT = 34;
const FLOOR_ROW_HEIGHT = CELL_SIZE;
const LEGEND_HEIGHT = 52;

function normalizeStatus(status: string): StatusKey {
  const normalized = status.toLowerCase().trim();

  if (normalized === "ativa") {
    return "ok";
  }

  if (normalized === "a vencer") {
    return "warning";
  }

  return "critical";
}

function getStatusFill(status: StatusKey) {
  switch (status) {
    case "ok":
      return "var(--color-status-ok)";
    case "warning":
      return "var(--color-status-warning)";
    case "critical":
    default:
      return "var(--color-status-critical)";
  }
}

function getStatusLabel(status: StatusKey) {
  switch (status) {
    case "ok":
      return "Conforme";
    case "warning":
      return "A Vencer";
    case "critical":
    default:
      return "Vencido";
  }
}

export function ComplianceMapV2() {
  const [layout, setLayout] = useState<MapLayoutItem[]>([]);
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLuc, setSelectedLucState] = useState(getSelectedApoliceLuc());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [mapLayout, policyList] = await Promise.all([
          request<MapLayoutItem[]>("/map-layout"),
          listApolices(),
        ]);

        if (!active) {
          return;
        }

        setLayout(mapLayout);
        setApolices(policyList);
      } catch {
        if (active) {
          setError("Não foi possível carregar o mapa de conformidade.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeSelectedApoliceLuc(() => {
    setSelectedLucState(getSelectedApoliceLuc());
  }), []);

  const policyByLuc = useMemo(() => {
    return new Map(apolices.map((policy) => [policy.luc, policy]));
  }, [apolices]);

  const floorGroups = useMemo(() => {
    const grouped = new Map<number, MapLayoutItem[]>();

    for (const item of layout) {
      const current = grouped.get(item.floor) ?? [];
      current.push(item);
      grouped.set(item.floor, current);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, items]) => ({
        floor,
        items: items.sort((a, b) => a.position - b.position),
      }));
  }, [layout]);

  const legend = useMemo(() => {
    return apolices.reduce(
      (accumulator, policy) => {
        const status = normalizeStatus(policy.status);
        accumulator[status] += 1;
        return accumulator;
      },
      { ok: 0, warning: 0, critical: 0 } as Record<StatusKey, number>,
    );
  }, [apolices]);

  const maxPosition = useMemo(() => {
    return Math.max(0, ...layout.map((item) => item.position));
  }, [layout]);

  const svgWidth = LEFT_PADDING * 2 + LABEL_WIDTH + maxPosition * CELL_SIZE + Math.max(0, maxPosition - 1) * CELL_GAP;
  const svgHeight = TOP_PADDING * 2 + HEADER_HEIGHT + floorGroups.length * FLOOR_ROW_HEIGHT + Math.max(0, floorGroups.length - 1) * 14 + LEGEND_HEIGHT;

  const handleCellClick = (luc: string) => {
    setSelectedApoliceLuc(selectedLuc === luc ? "" : luc);
  };

  return (
    <section className="w-full rounded-xl bg-white p-5 shadow-sm border border-gray-100 dark:bg-[#242938] dark:border-[#2E3447]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mapa de Conformidade por LUC</h3>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Clique em uma célula para aplicar o filtro de LUC no store global.</p>
        </div>
        {selectedLuc && (
          <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-[#1A1F2E] dark:text-[#94A3B8]">
            Selecionado: {selectedLuc}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500 dark:bg-[#1A1F2E] dark:text-[#94A3B8]">
          Carregando mapa...
        </div>
      ) : error ? (
        <div className="flex h-56 items-center justify-center rounded-lg bg-red-50 text-sm text-[#a0191e] dark:bg-[#2B1A1A] dark:text-[#ff8f8f]">
          {error}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            className="block w-full"
            viewBox={`0 0 ${Math.max(svgWidth, 640)} ${svgHeight}`}
            role="img"
            aria-label="Mapa de conformidade por LUC"
          >
            <defs>
              <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(15, 23, 42, 0.10)" />
              </filter>
            </defs>

            <text x={LEFT_PADDING} y={TOP_PADDING + 6} className="fill-gray-500 dark:fill-[#94A3B8]" fontSize="12" fontWeight="600">
              Status por piso
            </text>

            {floorGroups.map((group, floorIndex) => {
              const rowY = TOP_PADDING + HEADER_HEIGHT + floorIndex * (FLOOR_ROW_HEIGHT + 14);

              return (
                <g key={group.floor}>
                  <text
                    x={LEFT_PADDING}
                    y={rowY + 42}
                    className="fill-gray-700 dark:fill-white"
                    fontSize="13"
                    fontWeight="700"
                  >
                    Piso {group.floor}
                  </text>

                  {group.items.map((item) => {
                    const policy = policyByLuc.get(item.luc);
                    const status = policy ? normalizeStatus(policy.status) : "warning";
                    const x = LEFT_PADDING + LABEL_WIDTH + (item.position - 1) * (CELL_SIZE + CELL_GAP);
                    const isSelected = selectedLuc === item.luc;

                    return (
                      <g key={item.luc} transform={`translate(${x}, ${rowY})`} onClick={() => handleCellClick(item.luc)} style={{ cursor: "pointer" }}>
                        <rect
                          width={CELL_SIZE}
                          height={FLOOR_ROW_HEIGHT}
                          rx={6}
                          fill={getStatusFill(status)}
                          opacity={policy ? 1 : 0.35}
                          stroke={isSelected ? "var(--color-brand)" : "rgba(255,255,255,0.55)"}
                          strokeWidth={isSelected ? 3 : 1}
                          filter="url(#mapShadow)"
                        />
                        <text x={CELL_SIZE / 2} y={28} textAnchor="middle" className="fill-white" fontSize="12" fontWeight="700">
                          {item.luc}
                        </text>
                        <text x={CELL_SIZE / 2} y={48} textAnchor="middle" className="fill-white" fontSize="10" fontWeight="500">
                          {policy ? policy.fantasia : "Sem apólice"}
                        </text>
                        <title>{policy ? `${item.luc} - ${policy.status} - ${policy.fantasia}` : `${item.luc} - sem apólice`}</title>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            <g transform={`translate(${LEFT_PADDING}, ${svgHeight - LEGEND_HEIGHT + 8})`}>
              {(["ok", "warning", "critical"] as StatusKey[]).map((status, index) => {
                const offsetX = index * 210;

                return (
                  <g key={status} transform={`translate(${offsetX}, 0)`}>
                    <rect x={0} y={0} width={14} height={14} rx={4} fill={getStatusFill(status)} />
                    <text x={22} y={12} className="fill-gray-600 dark:fill-[#94A3B8]" fontSize="11" fontWeight="600">
                      {getStatusLabel(status)}: {legend[status]}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}
    </section>
  );
}