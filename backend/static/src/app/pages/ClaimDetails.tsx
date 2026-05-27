import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  getClaimById, 
  updateClaim, 
  Claim, 
  ClaimStatus 
} from "../store";
import { 
  Building2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  UserCheck,
  DollarSign,
  FileText,
  UploadCloud,
  ArrowLeft,
  Briefcase
} from "lucide-react";

export function ClaimDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [regulator, setRegulator] = useState("");
  const [indemnity, setIndemnity] = useState<number | "">("");
  const [deductible, setDeductible] = useState<number | "">("");
  
  // Simulation of user role/permission
  const isFinance = true; 

  useEffect(() => {
    if (id) {
      const data = getClaimById(id);
      if (data) {
        setClaim(data);
        if (data.regulator) setRegulator(data.regulator);
        if (data.indemnityValue !== undefined) setIndemnity(data.indemnityValue);
        if (data.deductibleValue !== undefined) setDeductible(data.deductibleValue);
      }
    }
  }, [id]);

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500">Carregando detalhes do sinistro...</p>
      </div>
    );
  }

  const handleAssignRegulator = () => {
    if (!regulator.trim()) return;
    updateClaim(claim.id, { 
      regulator, 
      status: "Em Análise" 
    });
    setClaim(prev => prev ? { ...prev, regulator, status: "Em Análise" } : null);
  };

  const handleApproveTechnical = () => {
    updateClaim(claim.id, { status: "Aprovado" });
    setClaim(prev => prev ? { ...prev, status: "Aprovado" } : null);
  };

  const handleSaveFinancials = () => {
    const indVal = Number(indemnity);
    const dedVal = Number(deductible);
    
    updateClaim(claim.id, { 
      indemnityValue: indVal, 
      deductibleValue: dedVal 
    });
    
    setClaim(prev => prev ? { 
      ...prev, 
      indemnityValue: indVal, 
      deductibleValue: dedVal 
    } : null);
  };

  const handleApprovePayment = () => {
    updateClaim(claim.id, { status: "Pago" });
    setClaim(prev => prev ? { ...prev, status: "Pago" } : null);
  };

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case "Aberto": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Aguardando Regulador": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Em Análise": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Aprovado": return "bg-green-100 text-green-800 border-green-200";
      case "Pago": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const netValue = (Number(indemnity) || 0) - (Number(deductible) || 0);
  const canApprovePayment = claim.status === "Aprovado" && netValue >= 0 && claim.indemnityValue !== undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Back Button & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <button 
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-[#8B1A1A] inline-flex items-center text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Lista
        </button>
        
        <div className={`px-4 py-1.5 rounded-full border text-sm font-bold flex items-center shadow-sm ${getStatusColor(claim.status)}`}>
          {claim.status === "Aprovado" && <CheckCircle2 className="w-4 h-4 mr-2" />}
          {claim.status === "Aguardando Regulador" && <Clock className="w-4 h-4 mr-2" />}
          Status Atual: {claim.status.toUpperCase()}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-2 bg-[#8B1A1A] w-full"></div>
        <div className="p-8">
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{claim.id}</h1>
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5 text-[#C8A882]" /> {claim.store}</span>
                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-[#C8A882]" /> {new Date(claim.date).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border
                ${claim.severity === 'Alta' ? 'bg-red-50 text-[#D93030] border-red-100' : ''}
                ${claim.severity === 'Média' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : ''}
                ${claim.severity === 'Baixa' ? 'bg-green-50 text-green-700 border-green-100' : ''}
              `}>
                <span className={`w-2 h-2 rounded-full mr-2 
                  ${claim.severity === 'Alta' ? 'bg-[#D93030]' : ''}
                  ${claim.severity === 'Média' ? 'bg-yellow-500' : ''}
                  ${claim.severity === 'Baixa' ? 'bg-green-500' : ''}
                `}></span>
                Gravidade {claim.severity}
              </span>
              
              {claim.fraudAlert && (
                <div className="mt-3 flex items-center text-sm font-bold text-[#D93030] bg-red-50 px-3 py-1 rounded border border-red-200">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Alerta de Fraude Sistêmica
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de Ocorrência</h3>
                <p className="text-base font-medium text-gray-900">{claim.type}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Descrição Detalhada</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-gray-700 leading-relaxed text-sm min-h-[120px]">
                  {claim.description}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Evidências Anexadas ({claim.files?.length || 0})</h3>
              {claim.files && claim.files.length > 0 ? (
                <ul className="space-y-2">
                  {claim.files.map((file, idx) => (
                    <li key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#8B1A1A] transition-colors cursor-pointer group">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#8B1A1A] mr-3" />
                      <span className="text-sm text-gray-700 font-medium truncate">{file}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  Nenhum arquivo anexado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regulation Session */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
          <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded bg-[#C8A882]/20 text-[#8B1A1A] flex items-center justify-center mr-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Sessão de Regulamentação</h2>
          </div>
          
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atribuir Regulador Responsável
              </label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={regulator}
                  onChange={(e) => setRegulator(e.target.value)}
                  placeholder="Nome ou código do regulador"
                  className="flex-1 border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-[#8B1A1A] focus:border-[#8B1A1A]"
                  disabled={claim.status !== 'Aberto' && claim.status !== 'Aguardando Regulador' && claim.status !== 'Em Análise'}
                />
                {(claim.status === 'Aberto' || claim.status === 'Aguardando Regulador' || claim.status === 'Em Análise') && (
                  <button 
                    onClick={handleAssignRegulator}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900 transition-colors"
                  >
                    Atribuir
                  </button>
                )}
              </div>
            </div>
            
            {claim.regulator && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 flex items-start">
                <Briefcase className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Regulador Designado</p>
                  <p className="text-sm text-blue-800">{claim.regulator}</p>
                  <p className="text-xs text-blue-600 mt-1">Status de análise em andamento no sistema do regulador.</p>
                </div>
              </div>
            )}
            
            {claim.status === 'Em Análise' && (
              <div className="pt-6 mt-auto">
                <p className="text-xs text-gray-500 mb-2">Ação do Regulador (Simulação)</p>
                <button 
                  onClick={handleApproveTechnical}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center justify-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovação Técnica (Parecer Favorável)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Financial Session */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full relative overflow-hidden">
          {/* Disabled Overlay if not ready */}
          {claim.status !== 'Aprovado' && claim.status !== 'Pago' && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center border-l border-gray-100">
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center max-w-[80%]">
                <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 text-sm mb-1">Aprovação Pendente</h3>
                <p className="text-xs text-gray-500">
                  Os trâmites financeiros serão liberados apenas após a aprovação técnica do regulador.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded bg-green-100 text-green-700 flex items-center justify-center mr-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Sessão Financeira</h2>
          </div>

          <div className="space-y-5 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Indenização (R$)
                </label>
                <input 
                  type="number" 
                  value={indemnity}
                  onChange={(e) => setIndemnity(Number(e.target.value) || "")}
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-green-500 focus:border-green-500"
                  disabled={claim.status === 'Pago'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Franquia / Desconto (R$)
                </label>
                <input 
                  type="number" 
                  value={deductible}
                  onChange={(e) => setDeductible(Number(e.target.value) || "")}
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-red-500 focus:border-red-500 text-red-600"
                  disabled={claim.status === 'Pago'}
                />
                <span className="text-[10px] text-gray-500 block mt-1">Pode ser zero.</span>
              </div>
            </div>

            {(indemnity !== "" || deductible !== "") && claim.status !== 'Pago' && (
              <button 
                onClick={handleSaveFinancials}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded border border-gray-200 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Salvar Valores
              </button>
            )}

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Total Indenização</span>
                <span className="text-sm font-medium">R$ {(Number(indemnity) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                <span className="text-sm text-gray-600">(-) Franquia Aplicada</span>
                <span className="text-sm font-medium text-red-600">- R$ {(Number(deductible) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-base font-bold text-gray-900">Total a Pagar</span>
                <span className={`text-xl font-bold ${netValue > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  R$ {Math.max(0, netValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              {claim.status === 'Pago' ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center text-green-800 font-medium flex items-center justify-center text-sm">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Pagamento Aprovado e Processado
                </div>
              ) : (
                <button 
                  onClick={handleApprovePayment}
                  disabled={!canApprovePayment}
                  className={`w-full py-3 rounded-md font-bold text-sm transition-all shadow-sm flex items-center justify-center
                    ${canApprovePayment 
                      ? 'bg-[#8B1A1A] hover:bg-[#a43030] text-white shadow-md transform hover:-translate-y-0.5' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                    }
                  `}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Aprovar Restituição e Encerrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
