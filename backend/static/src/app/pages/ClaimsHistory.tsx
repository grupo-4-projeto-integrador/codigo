import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Download } from "lucide-react";
import { Link } from "react-router";

// Mock Data
const claims = [
  { id: "SIN-2023-0891", store: "Zara - Piso L2", date: "15/10/2023", type: "Vazamento / Inundação", status: "Em Análise", severity: "Alta" },
  { id: "SIN-2023-0890", store: "Starbucks - Piso L1", date: "12/10/2023", type: "Incêndio Fiação", status: "Aberto", severity: "Média" },
  { id: "SIN-2023-0885", store: "Renner - Piso L2", date: "05/10/2023", type: "Dano Elétrico", status: "Pago", severity: "Baixa" },
  { id: "SIN-2023-0880", store: "Centauro - Piso L3", date: "28/09/2023", type: "Vazamento / Inundação", status: "Recusado", severity: "Alta" },
  { id: "SIN-2023-0878", store: "Fast Shop - Piso L1", date: "25/09/2023", type: "Dano Elétrico", status: "Pago", severity: "Média" },
  { id: "SIN-2023-0875", store: "Outback - Piso L3", date: "20/09/2023", type: "Incêndio Fiação", status: "Em Análise", severity: "Alta" },
  { id: "SIN-2023-0870", store: "Vivara - Piso L1", date: "15/09/2023", type: "Furto / Roubo", status: "Pago", severity: "Baixa" },
  { id: "SIN-2023-0865", store: "Riachuelo - Piso L2", date: "10/09/2023", type: "Dano Estrutural", status: "Aberto", severity: "Média" },
];

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Aberto":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Em Análise":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Pago":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Recusado":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "Alta":
      return "text-[#D93030]";
    case "Média":
      return "text-amber-600";
    case "Baixa":
      return "text-emerald-600";
    default:
      return "text-gray-500";
  }
};

export function ClaimsHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#8B1A1A]">Histórico de Sinistros</h1>
          <p className="text-gray-600 mt-1">Consulte e rastreie todas as ocorrências passadas.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#D93030] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#b92828] transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#FAF7F2] p-4 rounded-xl shadow-sm border border-[#E8DCCB]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Nº do Sinistro ou Loja..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8DCCB] rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4">
            <select 
              className="bg-white border border-[#E8DCCB] text-gray-700 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Status: Todos</option>
              <option value="Aberto">Aberto</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Pago">Pago</option>
              <option value="Recusado">Recusado</option>
            </select>
            
            <select className="bg-white border border-[#E8DCCB] text-gray-700 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] outline-none hidden sm:block">
              <option value="Todos">Gravidade: Todas</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
            
            <button className="flex items-center justify-center bg-white border border-[#E8DCCB] p-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#8B1A1A] transition-colors" title="Filtros Avançados">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FAF7F2] rounded-xl shadow-sm border border-[#E8DCCB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E8DCCB]/50 border-b border-[#E8DCCB]">
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A]">Nº Sinistro</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A]">Loja</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A]">Data do Evento</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A]">Tipo / Ocorrência</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A]">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-[#8B1A1A]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCCB]">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-white transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-medium text-[#8B1A1A]">{claim.id}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{claim.store}</td>
                  <td className="px-6 py-4 text-gray-600">{claim.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{claim.type}</span>
                      <span className={`text-xs font-medium ${getSeverityStyles(claim.severity)}`} title={`Gravidade: ${claim.severity}`}>
                        • {claim.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(claim.status)}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link to={`/sinistro/${claim.id}`} className="inline-flex p-2 text-gray-400 hover:text-[#D93030] hover:bg-red-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#E8DCCB] flex items-center justify-between bg-[#FAF7F2]">
          <span className="text-sm text-gray-500">Mostrando 1 a 8 de 45 registros</span>
          <div className="flex items-center gap-1">
            <button className="p-2 border border-[#E8DCCB] rounded-lg text-gray-500 hover:bg-white hover:text-[#8B1A1A] disabled:opacity-50 transition-colors" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-3 py-1 bg-[#8B1A1A] text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-3 py-1 border border-[#E8DCCB] text-gray-600 hover:bg-white rounded-lg text-sm font-medium transition-colors">2</button>
            <button className="px-3 py-1 border border-[#E8DCCB] text-gray-600 hover:bg-white rounded-lg text-sm font-medium transition-colors">3</button>
            <span className="px-2 text-gray-400">...</span>
            <button className="px-3 py-1 border border-[#E8DCCB] text-gray-600 hover:bg-white rounded-lg text-sm font-medium transition-colors">6</button>
            <button className="p-2 border border-[#E8DCCB] rounded-lg text-gray-500 hover:bg-white hover:text-[#8B1A1A] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
