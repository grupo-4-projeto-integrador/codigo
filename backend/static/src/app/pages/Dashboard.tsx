import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  AlertTriangle, 
  Clock, 
  FileWarning, 
  TrendingUp,
  Search,
  ChevronRight,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { getClaims, Claim } from "../store";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export function Dashboard() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setClaims(getClaims());
  }, []);

  const openClaims = claims.filter(c => c.status === "Aberto" || c.status === "Em Análise").length;
  const waitingRegulator = claims.filter(c => c.status === "Aguardando Regulador").length;
  const fraudAlerts = claims.filter(c => c.fraudAlert).length;

  const filteredClaims = claims.filter(c => 
    c.store.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock data for chart
  const chartData = [
    { name: 'Loja A', incidentes: 4 },
    { name: 'Loja B', incidentes: 2 },
    { name: 'Praça de Alim.', incidentes: 5 },
    { name: 'Estacionamento', incidentes: 3 },
    { name: 'Banheiros', incidentes: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-gray-500 mt-1">Resumo das ocorrências e sinistros do complexo.</p>
        </div>
        <button 
          onClick={() => navigate("/novo-sinistro")}
          className="bg-[#8B1A1A] hover:bg-[#a43030] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
        >
          <FileWarning className="w-4 h-4 mr-2" />
          Registrar Ocorrência
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sinistros Abertos</p>
            <h3 className="text-3xl font-bold text-gray-900">{openClaims}</h3>
            <p className="text-xs text-green-600 mt-2 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> -12% em relação ao mês anterior
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileWarning className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Aguardando Regulador</p>
            <h3 className="text-3xl font-bold text-gray-900">{waitingRegulator}</h3>
            <p className="text-xs text-orange-600 mt-2 flex items-center font-medium">
              Requer atenção imediata
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-[#D93030] mb-1">Alertas de Fraude</p>
            <h3 className="text-3xl font-bold text-[#D93030]">{fraudAlerts}</h3>
            <p className="text-xs text-[#8B1A1A] mt-2 flex items-center font-medium">
              Análise rigorosa sugerida
            </p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-[#D93030] rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Incidência por Área (Últimos 30 dias)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" key="dashboard-responsive-container">
              <BarChart key="dashboard-bar-chart" id="dashboard-bar-chart" accessibilityLayer={false} data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="incidentes" fill="#C8A882" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Search & Summary */}
        <div className="bg-[#8B1A1A] text-white rounded-xl shadow-sm p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#a43030] rounded-full opacity-50"></div>
          
          <h3 className="text-lg font-semibold mb-2 relative z-10">Consulta Rápida</h3>
          <p className="text-white/80 text-sm mb-6 relative z-10">Localize informações de apólices e status de lojistas instantaneamente.</p>
          
          <div className="relative z-10 mt-auto">
            <div className="bg-white/10 rounded-lg p-1 border border-white/20 flex items-center">
              <input 
                type="text" 
                placeholder="CNPJ, Nome ou N° Sinistro" 
                className="bg-transparent border-none text-white placeholder-white/60 focus:ring-0 w-full px-3 text-sm"
              />
              <button className="p-2 bg-white text-[#8B1A1A] rounded-md hover:bg-gray-100 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-base font-semibold text-gray-900">Últimas Ocorrências</h3>
          <div className="relative w-64">
            <input 
              type="text" 
              placeholder="Filtrar tabela..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8B1A1A] focus:border-[#8B1A1A]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nº Sinistro
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Local / Lojista
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gravidade
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/sinistro/${claim.id}`)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    {claim.id}
                    {claim.fraudAlert && (
                      <span title="Alerta de Fraude" className="ml-2 text-[#D93030]">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{claim.store}</span>
                      <span className="text-xs">{claim.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(claim.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${claim.status === 'Aberto' ? 'bg-blue-100 text-blue-800' : ''}
                      ${claim.status === 'Aguardando Regulador' ? 'bg-orange-100 text-orange-800' : ''}
                      ${claim.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${claim.status === 'Aprovado' ? 'bg-green-100 text-green-800' : ''}
                      ${claim.status === 'Pago' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full mr-2 
                        ${claim.severity === 'Alta' ? 'bg-[#D93030]' : ''}
                        ${claim.severity === 'Média' ? 'bg-yellow-500' : ''}
                        ${claim.severity === 'Baixa' ? 'bg-green-500' : ''}
                      `}></span>
                      {claim.severity}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sinistro/${claim.id}`);
                      }}
                      className="text-[#8B1A1A] hover:text-[#a43030] inline-flex items-center"
                    >
                      Detalhes <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClaims.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              Nenhum sinistro encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
