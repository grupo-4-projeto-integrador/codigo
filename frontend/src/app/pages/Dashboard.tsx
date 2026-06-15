import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  FileWarning,
  TrendingUp,
  Search,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { listApolices } from "../../api/apolice";
import type { ApoliceRecord } from "../../types/apolice";
import { ComplianceMap } from "../components/ComplianceMap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Dashboard() {
  const navigate = useNavigate();
  const [apolices, setApolices] = useState<ApoliceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void listApolices().then(setApolices).catch(() => setApolices([]));
  }, []);

  const activePolicies = apolices.filter((p) => (p.status ?? "").toLowerCase() === "ativa").length;
  const expiringPolicies = apolices.filter((p) => (p.status ?? "").toLowerCase() === "a vencer").length;
  const expiredPolicies = apolices.filter((p) => (p.status ?? "").toLowerCase() === "vencida").length;
  const totalPolicies = apolices.length;

  const filteredPolicies = apolices.filter((policy) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(policy.lojista ?? "").toLowerCase().includes(q) ||
      String(policy.id ?? "").toLowerCase().includes(q) ||
      String(policy.tipo ?? "").toLowerCase().includes(q)
    );
  });

  const chartData = [
    { name: "Loja A", incidentes: 4 },
    { name: "Loja B", incidentes: 2 },
    { name: "Praça Alim.", incidentes: 5 },
    { name: "Estacion.", incidentes: 3 },
    { name: "Banheiros", incidentes: 1 },
  ];

  const complianceRate =
    totalPolicies > 0 ? Math.round((activePolicies / totalPolicies) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[length:var(--font-page-title)] font-bold text-gray-900 dark:text-white">Visão Geral</h1>
          <p className="text-gray-500 dark:text-[#94A3B8] mt-1 text-sm">
            Resumo operacional e mapa de conformidade do complexo.
          </p>
        </div>
        <button
          onClick={() => navigate("/novo-sinistro")}
          className="bg-[#8B1A1A] hover:bg-[#a43030] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <FileWarning className="w-4 h-4" />
          Registrar Ocorrência
        </button>
      </div>

      {/* ── Main Grid: Mapa (dominante) + Sidebar KPIs ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Compliance Map — Dominant Feature */}
        <div className="min-w-0">
          <ComplianceMap />
        </div>

        {/* KPI Sidebar */}
        <style>{`
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          @media (max-width: 640px) {
            .kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          }
          @media (max-width: 400px) {
            .kpi-grid { grid-template-columns: 1fr; }
          }
          @media (min-width: 1280px) {
            .kpi-grid { display: flex; flex-direction: column; gap: 12px; }
          }
        `}</style>
        <div className="kpi-grid">
          {/* Rate ring card */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-5 flex items-center gap-4">
            {/* Circular progress */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-gray-100 dark:text-[#0a0a0a]"
                />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                  strokeDashoffset="0"
                  style={{ transition: "stroke-dasharray 0.8s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
                {complianceRate}%
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">
                Taxa de Conformidade
              </p>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5" style={{ fontSize: 'var(--font-kpi, 42px)' }}>
                {activePolicies}/{totalPolicies}
              </p>
              <p className="text-green-600 mt-1 flex items-center gap-1" style={{ fontSize: '10px' }}>
                <TrendingUp className="w-3 h-3" /> apólices ativas
              </p>
            </div>
          </div>

          {/* Ativas */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-[#94A3B8]">Apólices Ativas</p>
              <p className="font-bold text-gray-900 dark:text-white" style={{ fontSize: 'var(--font-kpi, 42px)' }}>{activePolicies}</p>
            </div>
            <div className="w-1.5 rounded-full bg-green-500 opacity-60" style={{ height: '44px' }} />
          </div>

          {/* A Vencer */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-[#94A3B8]">A Vencer</p>
              <p className="font-bold text-gray-900 dark:text-white" style={{ fontSize: 'var(--font-kpi, 42px)' }}>{expiringPolicies}</p>
              <p className="text-orange-500 mt-0.5" style={{ fontSize: '10px' }}>Requer atenção</p>
            </div>
            <div className="w-1.5 rounded-full bg-orange-500 opacity-60" style={{ height: '44px' }} />
          </div>

          {/* Vencidas */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-red-100 dark:border-[#3A1A1A] p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-[#D93030] rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#D93030]">Vencidas</p>
              <p className="font-bold text-[#D93030]" style={{ fontSize: 'var(--font-kpi, 42px)' }}>{expiredPolicies}</p>
              <p className="text-[#8B1A1A] mt-0.5" style={{ fontSize: '10px' }}>Exigem regularização</p>
            </div>
            <div className="w-1.5 rounded-full bg-[#D93030] opacity-70" style={{ height: '44px' }} />
          </div>

          {/* Quick Search */}
          <div className="bg-[#8B1A1A] text-white rounded-xl shadow-sm p-5 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#a43030] rounded-full opacity-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-20 h-20 bg-[#6e150e] rounded-full opacity-30 pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-white/70" />
              <h3 className="text-sm font-semibold">Consulta Rápida</h3>
            </div>
            <p className="text-white/70 text-xs mb-4 relative z-10">
              Localize apólices instantaneamente.
            </p>
            <div className="relative z-10">
              <div className="bg-white/10 rounded-lg p-1 border border-white/20 flex items-center">
                <input
                  type="text"
                  placeholder="CNPJ, Nome ou N° Apólice"
                  className="bg-transparent border-none text-white placeholder-white/50 focus:ring-0 w-full px-2 text-xs outline-none"
                />
                <button
                  onClick={() => navigate("/seguros")}
                  className="p-1.5 bg-white text-[#8B1A1A] rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Secondary Row: Chart + Spacer ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
            Incidência por Área — Últimos 30 dias
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%" key="dashboard-responsive-container">
              <BarChart
                key="dashboard-bar-chart"
                id="dashboard-bar-chart"
                accessibilityLayer={false}
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="incidentes" fill="#C8A882" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Summary mini-card */}
        <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Resumo de Status
          </h3>
          <div className="flex-1 flex flex-col gap-3">
            <StatusBar label="Conformes" value={activePolicies} total={totalPolicies} color="#22c55e" />
            <StatusBar label="A Vencer" value={expiringPolicies} total={totalPolicies} color="#f59e0b" />
            <StatusBar label="Vencidas" value={expiredPolicies} total={totalPolicies} color="#ef4444" />
          </div>
          <button
            onClick={() => navigate("/seguros")}
            className="mt-5 w-full py-2 text-xs font-medium text-[#8B1A1A] dark:text-[#fca5a5] border border-[#8B1A1A]/30 dark:border-[#8B1A1A]/40 rounded-lg hover:bg-[#8B1A1A]/5 transition-colors flex items-center justify-center gap-1"
          >
            Ver todas as apólices <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Recent Policies Table ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222222] flex justify-between items-center bg-gray-50/50 dark:bg-[#0a0a0a]/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Últimas Ocorrências</h3>
          <div className="relative w-56">
            <input
              type="text"
              placeholder="Filtrar tabela..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-[#222222] dark:bg-[#0a0a0a] dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-[#8B1A1A] focus:border-[#8B1A1A]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#222222]">
            <thead className="bg-gray-50 dark:bg-[#0a0a0a]">
              <tr>
                {["Nº Sinistro", "Local / Lojista", "Vigência", "Status", "Gravidade", ""].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#151515] divide-y divide-gray-100 dark:divide-[#222222]">
              {filteredPolicies.map((policy) => (
                <tr
                  key={policy.id}
                  className="hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-gray-900 dark:text-white">
                    {policy.id}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-[#94A3B8]">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-[#E2E8F0]">
                        {policy.lojista}
                      </span>
                      <span className="text-gray-400 dark:text-[#64748B]">{policy.tipo}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-[#94A3B8]">
                    {policy.vigencia}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${policy.status === "Ativa" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                        ${policy.status === "A Vencer" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" : ""}
                        ${policy.status === "Vencida" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : ""}
                      `}
                    >
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#94A3B8]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          policy.status === "Vencida"
                            ? "bg-[#D93030]"
                            : policy.status === "A Vencer"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      />
                      {policy.status}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={() =>
                        navigate(`/seguros?search=${encodeURIComponent(policy.id)}`)
                      }
                      className="text-[#8B1A1A] dark:text-[#fca5a5] hover:text-[#a43030] inline-flex items-center gap-1 text-xs font-medium"
                    >
                      Ver apólice <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPolicies.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400 dark:text-[#475569]">
              Nenhuma apólice encontrada com os filtros atuais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatusBar mini-component ─────────────────────────────────────────────────

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500 dark:text-[#94A3B8]">{label}</span>
        <span className="text-xs font-semibold text-gray-700 dark:text-[#E2E8F0]">
          {value} <span className="font-normal text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-[#0a0a0a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
