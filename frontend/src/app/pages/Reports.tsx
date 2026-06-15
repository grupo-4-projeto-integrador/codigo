import { useState } from "react";
import { Download, TrendingUp, TrendingDown, DollarSign, Activity, FileSpreadsheet, Calendar as CalendarIcon, Filter } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";

// Mock Data
const claimsByType = [
  { name: 'Vazamento/Água', uv: 45 },
  { name: 'Dano Elétrico', uv: 30 },
  { name: 'Incêndio/Fumaça', uv: 15 },
  { name: 'Furto/Roubo', uv: 25 },
  { name: 'Dano Estrutural', uv: 18 },
  { name: 'Responsabilidade Civil', uv: 12 },
];

const claimsBySeverity = [
  { name: 'Alta Gravidade', value: 25 },
  { name: 'Média Gravidade', value: 45 },
  { name: 'Baixa Gravidade', value: 30 },
];

const COLORS = ['#D93030', '#E5A532', '#4CAF50']; // Red, Amber, Green

export function Reports() {
  const [period, setPeriod] = useState("30days");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[length:var(--font-page-title)] font-bold text-[#8B1A1A]">Relatórios e Análise</h1>
          <p className="text-gray-600 mt-1">Visão gerencial consolidada das ocorrências e impacto financeiro.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-[#E8DCCB] rounded-lg p-1 shadow-sm flex items-center">
            <CalendarIcon className="w-4 h-4 text-gray-400 ml-2" />
            <select 
              className="bg-transparent text-sm text-gray-700 px-3 py-1.5 focus:outline-none cursor-pointer"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="30days">Últimos 30 Dias</option>
              <option value="q1">1º Trimestre</option>
              <option value="q2">2º Trimestre</option>
              <option value="ytd">Ano Atual</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>
          <button className="flex items-center gap-2 bg-[#8B1A1A] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#701515] transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Exportar Dados
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Indemnities Card - Uses Accent Color */}
        <div className="bg-gradient-to-br from-[#D93030] to-[#b92828] p-6 rounded-2xl shadow-sm text-white relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white/90">Total de Indenizações Pagas</h3>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[length:var(--font-kpi)] font-bold tracking-tight">R$ 1.245.890</span>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-white/80 gap-1 bg-black/10 w-fit px-2.5 py-1 rounded-full">
              <TrendingUp className="w-4 h-4" />
              <span>+12.5% em relação ao período anterior</span>
            </div>
          </div>
        </div>

        {/* Total Claims Card */}
        <div className="bg-white border border-[#E8DCCB] p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-600">Total de Sinistros Registrados</h3>
            <div className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center border border-[#E8DCCB]">
              <Activity className="w-5 h-5 text-[#8B1A1A]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[length:var(--font-kpi)] font-bold text-gray-900 tracking-tight">145</span>
            <span className="text-sm text-gray-500 font-medium">ocorrências</span>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 gap-1 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
            <TrendingDown className="w-4 h-4" />
            <span>-5.2% em relação ao período anterior</span>
          </div>
        </div>

        {/* Average Ticket Card */}
        <div className="bg-white border border-[#E8DCCB] p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-600">Ticket Médio por Sinistro</h3>
            <div className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center border border-[#E8DCCB]">
              <FileSpreadsheet className="w-5 h-5 text-[#8B1A1A]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[length:var(--font-kpi)] font-bold text-gray-900 tracking-tight">R$ 8.592</span>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-amber-600 gap-1 bg-amber-50 w-fit px-2.5 py-1 rounded-full">
            <TrendingUp className="w-4 h-4" />
            <span>+2.1% em relação ao período anterior</span>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart - Claims by Type */}
        <div className="lg:col-span-2 bg-white border border-[#E8DCCB] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#8B1A1A]">Sinistros por Tipo de Ocorrência</h3>
              <p className="text-sm text-gray-500">Comparativo quantitativo do período selecionado</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-[#8B1A1A] hover:bg-[#FAF7F2] rounded-lg transition-colors border border-transparent hover:border-[#E8DCCB]">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={claimsByType}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                accessibilityLayer={false}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DCCB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#FAF7F2' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8DCCB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="uv" 
                  fill="#8B1A1A" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart - Severity Distribution */}
        <div className="bg-white border border-[#E8DCCB] rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#8B1A1A]">Distribuição de Gravidade</h3>
            <p className="text-sm text-gray-500">Análise de risco das ocorrências</p>
          </div>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={false}>
                <Pie
                  data={claimsBySeverity}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {claimsBySeverity?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1F2937', fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-sm text-gray-700 font-medium ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-[length:var(--font-kpi)] font-bold text-gray-900">100</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}