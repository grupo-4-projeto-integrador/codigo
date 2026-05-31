import { useEffect, useMemo, useState } from "react";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import { getSelectedApoliceLuc, subscribeSelectedApoliceLuc } from "../store";

type SegmentRiskItem = {
  segmento: string;
  vencidas: number;
  dias_medio_atraso: number;
};

const SEGMENT_BAR_COLORS = ["#c4151f", "#a0191e", "#bc9b7c", "#1c3d32", "#6e150e", "#788033", "#3e0000", "#f9e4a0"];

function parseDate(value: string): Date | null {
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

function diffInDays(from: Date, to: Date): number {
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24));
}

function buildRiskFromApolices(
  apolices: Array<{ segmento?: string; tipo?: string; vencimento?: string }>
): SegmentRiskItem[] {
  const today = new Date();
  const aggregate = new Map<string, { vencidas: number; totalAtraso: number }>();

  apolices.forEach((apolice) => {
    const segmento = (apolice.segmento || apolice.tipo || "Nao informado").trim() || "Nao informado";
    const vencimento = parseDate(apolice.vencimento || "");
    if (!vencimento) {
      return;
    }

    const daysRemaining = diffInDays(today, vencimento);
    if (daysRemaining >= 0) {
      return;
    }

    const current = aggregate.get(segmento) || { vencidas: 0, totalAtraso: 0 };
    current.vencidas += 1;
    current.totalAtraso += -daysRemaining;
    aggregate.set(segmento, current);
  });

  return Array.from(aggregate.entries())
    .map(([segmento, values]) => ({
      segmento,
      vencidas: values.vencidas,
      dias_medio_atraso: values.vencidas > 0 ? Math.round(values.totalAtraso / values.vencidas) : 0,
    }))
    .sort((a, b) => {
      if (b.vencidas === a.vencidas) {
        return a.segmento.localeCompare(b.segmento, "pt-BR");
      }
      return b.vencidas - a.vencidas;
    });
}

export function SegmentRiskChart() {
  const [data, setData] = useState<SegmentRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLuc, setSelectedLuc] = useState(getSelectedApoliceLuc());
  const [lucToSegment, setLucToSegment] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = subscribeSelectedApoliceLuc(() => {
      setSelectedLuc(getSelectedApoliceLuc());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;

    const loadChart = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await request<SegmentRiskItem[]>("/kpis/risk-by-segment");
        if (active) {
          setData(response);
        }
      } catch {
        try {
          const apolices = await listApolices();
          if (active) {
            setData(buildRiskFromApolices(apolices));
            setError(null);
          }
        } catch {
          if (active) {
            setData([]);
            setError("Nao foi possivel carregar o risco por segmento.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadChart();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadApolices = async () => {
      try {
        const apolices = await listApolices();
        if (!active) {
          return;
        }

        const nextMap: Record<string, string> = {};
        apolices.forEach((apolice) => {
          if (apolice.luc) {
            nextMap[apolice.luc] = apolice.segmento || apolice.tipo || "";
          }
        });
        setLucToSegment(nextMap);
      } catch {
        if (active) {
          setLucToSegment({});
        }
      }
    };

    loadApolices();

    return () => {
      active = false;
    };
  }, []);

  const normalize = (value: string) => value.trim().toLowerCase();
  const selectedSegment = useMemo(() => {
    if (!selectedLuc) {
      return "";
    }

    return normalize(lucToSegment[selectedLuc] || "");
  }, [lucToSegment, selectedLuc]);

  const maxVencidas = useMemo(() => {
    if (!data.length) {
      return 50;
    }
    const max = Math.max(...data.map((item) => item.vencidas));
    return Math.max(Math.ceil(max / 10) * 10 + 10, 50);
  }, [data]);

  return (
    <section className="h-full rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-[#1A1F2E] dark:border-[#2E3447] flex flex-col">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Risco por Segmento</h3>
        <p className="text-[11px] text-gray-500 dark:text-[#94A3B8] mt-0.5">
          Segmentos com maior volume de apolices vencidas e atraso medio.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#3e0000]"></div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-[12px] text-[#a0191e]">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-gray-500 dark:text-[#94A3B8]">
            Nenhum segmento com risco identificado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((item, index) => {
              const width = Math.max((item.vencidas / maxVencidas) * 100, item.vencidas > 0 ? 12 : 0);
              const isHighlighted = selectedSegment !== "" && normalize(item.segmento) === selectedSegment;
              const barColor = SEGMENT_BAR_COLORS[index % SEGMENT_BAR_COLORS.length];
              const isLightBar = barColor === "#f9e4a0";

              return (
                <div
                  key={item.segmento}
                  className="rounded-lg border px-2.5 py-2 transition-colors"
                  style={{
                    borderColor: isHighlighted ? "#3e0000" : "#e5e7eb",
                    background: isHighlighted
                      ? "linear-gradient(90deg, rgba(62,0,0,0.10) 0%, rgba(62,0,0,0.04) 100%)"
                      : "transparent",
                    boxShadow: isHighlighted
                      ? "inset 0 0 0 1px rgba(62,0,0,0.12), 0 1px 3px rgba(62,0,0,0.10)"
                      : "none",
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span
                      className="truncate text-[12px] font-medium text-gray-800 dark:text-gray-100"
                      style={{ color: isLightBar ? "#3e0000" : isHighlighted ? "#3e0000" : undefined }}
                    >
                      {item.segmento}
                    </span>
                    <span
                      className="text-[11px] text-gray-500 dark:text-[#94A3B8] whitespace-nowrap"
                      style={{ color: isHighlighted ? "#6e150e" : undefined }}
                    >
                      {item.vencidas} vencidas - {item.dias_medio_atraso}d medio
                    </span>
                  </div>

                  <div className="h-5 w-full rounded bg-gray-100 dark:bg-[#242938] overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${width}%`,
                        background: barColor,
                        opacity: isHighlighted ? 1 : 0.9,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
