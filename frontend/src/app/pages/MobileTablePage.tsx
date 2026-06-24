import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, Building2, ShieldAlert, ShieldCheck, Clock, FileText } from "lucide-react";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { formatLargeCurrency } from "../utils/currency";

const statusLabel: Record<string, string> = {
  "Ativa": "Conforme",
  "A Vencer": "A Vencer",
  "Vencida": "Vencida"
};

export function MobileTablePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const initialFilter = (searchParams.get("filter") as any) || "Todas";
  const seguradoraParam = searchParams.get("seguradora") || "todas";
  const segmentoParam = searchParams.get("segmento") || "todos";
  const [filter, setFilter] = useState<"Todas" | "Conformes" | "A Vencer" | "Vencidas">(initialFilter);
  const [selectedApolice, setSelectedApolice] = useState<ApoliceRecord | null>(null);

  useEffect(() => {
    listApolices().then(setApolices).catch(console.error);
  }, []);

  const filteredApolices = apolices.filter(policy => {
    // Status Filter
    if (filter !== "Todas") {
      const s = statusLabel[policy.status || ""] || policy.status;
      if (filter === "Conformes" && s !== "Conforme") return false;
      if (filter === "A Vencer" && s !== "A Vencer") return false;
      if (filter === "Vencidas" && s !== "Vencida") return false;
    }
    
    // Seguradora Filter
    if (seguradoraParam !== "todas" && policy.seguradora !== seguradoraParam) {
      return false;
    }
    
    // Segmento Filter
    if (segmentoParam !== "todos" && policy.segmento !== segmentoParam && policy.tipo !== segmentoParam) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-[#0a0a0a] z-[200] flex flex-col w-full h-full overflow-hidden">
      <style>{`
        .mobile-apolice-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          cursor: pointer;
        }
        .dark .mobile-apolice-card {
          background: #151515;
          border-color: #222;
        }
        .mac-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mac-luc {
          font-weight: 700;
          font-size: 13px;
          color: #111827;
        }
        .dark .mac-luc { color: #fff; }
        .mac-nome {
          font-size: 13px;
          color: #4B5563;
        }
        .dark .mac-nome { color: #9CA3AF; }
        .mac-seg {
          font-size: 11px;
          color: #9CA3AF;
          text-transform: uppercase;
        }
        .mac-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .mac-status {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 9999px;
        }
        .mac-status.Ativa { background: #DCFCE7; color: #166534; }
        .mac-status.A { background: #FEF3C7; color: #92400E; } /* A Vencer */
        .mac-status.Vencida { background: #FEE2E2; color: #991B1B; }
        
        .dark .mac-status.Ativa { background: rgba(22, 101, 52, 0.2); color: #4ADE80; }
        .dark .mac-status.A { background: rgba(146, 64, 14, 0.2); color: #FBBF24; }
        .dark .mac-status.Vencida { background: rgba(153, 27, 27, 0.2); color: #F87171; }
        
        .mac-dias {
          font-size: 13px;
          font-weight: 600;
        }
        
        /* Oculta barra de scroll dos chips */
        .filter-chips-container::-webkit-scrollbar {
          display: none;
        }
        .filter-chips-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header Fixo */}
      <div className="bg-white dark:bg-[#151515] border-b border-gray-200 dark:border-[#222] px-4 py-3 flex items-center shrink-0">
        <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222]">
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Apólices</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{filteredApolices.length} registros</p>
        </div>
      </div>

      {/* Chips de Filtro */}
      <div className="bg-white dark:bg-[#151515] px-4 py-3 border-b border-gray-100 dark:border-[#222] shrink-0">
        <div className="filter-chips-container flex gap-2 overflow-x-auto">
          {(["Todas", "Conformes", "A Vencer", "Vencidas"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-[#8B1A1A] text-white' 
                  : 'bg-gray-100 text-gray-600 dark:bg-[#222] dark:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredApolices.length > 0 ? (
          filteredApolices.map(apolice => {
            const statusClass = apolice.status === "A Vencer" ? "A" : apolice.status || "Ativa";
            const diasRestantes = apolice.dias_restantes ?? 0;
            return (
              <div key={apolice.id} className="mobile-apolice-card" onClick={() => navigate(`/seguros/apolice/${apolice.id}`)}>
                <div className="mac-left">
                  <span className="mac-luc">{apolice.luc}</span>
                  <span className="mac-nome">{apolice.lojista || apolice.fantasia || "Não informado"}</span>
                  <span className="mac-seg">{apolice.segmento || apolice.tipo || "—"}</span>
                </div>
                <div className="mac-right">
                  <span className={`mac-status ${statusClass}`}>
                    {statusLabel[apolice.status || "Ativa"] || apolice.status}
                  </span>
                  <span className="mac-dias" style={{ color: diasRestantes < 0 ? '#c4151f' : '#788033' }}>
                    {diasRestantes}d
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mb-2 opacity-20" />
            <p>Nenhuma apólice encontrada.</p>
          </div>
        )}
      </div>

    </div>
  );
}
