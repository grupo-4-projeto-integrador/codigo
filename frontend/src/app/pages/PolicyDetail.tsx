import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ChevronRight, 
  ArrowLeft, 
  Shield, 
  FileText, 
  Download, 
  Clock, 
  Check,
  User, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { getApolice, getCoberturas, getHistorico, updateObservacoes, getDocumentos } from "../../api/apolice";
import { downloadArquivo } from "../utils/downloadUtils";
import { request } from "../../api/client";
import type { ApoliceRecord } from "../../types/apolice";
import joaoCarlosImg from "../../assets/joao-carlos.jpg";
import { DocumentListWithUpload } from "../components/DocumentListWithUpload";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { DatePicker } from "../components/ui/date-picker";
import { Button } from "../components/ui/button";
import { DeleteApoliceButton } from "../components/DeleteApoliceButton";
import { RequireRole } from "../components/RequireRole";
import { format, addYears } from "date-fns";
import { toast } from "sonner";
import { useUserProfile } from "../contexts/UserProfileContext";
import { formatLargeCurrency } from "../utils/currency";
import { exportApoliceParaPDF } from "../utils/exportUtils";

export function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return "CNPJ não informado";
    const num = String(cnpj).replace(/\D/g, "");
    if (num.length !== 14) return cnpj;
    return `${num.substring(0, 2)}.${num.substring(2, 5)}.${num.substring(5, 8)}/${num.substring(8, 12)}-${num.substring(12, 14)}`;
  };

  const [policy, setPolicy] = useState<ApoliceRecord | null>(null);
  const [coberturas, setCoberturas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [observacoes, setObservacoes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const { canEdit } = useUserProfile();
  const [savingObs, setSavingObs] = useState(false);

  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (!loading && window.location.hash === '#historico') {
      const el = document.getElementById('historico');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'none';
          el.style.boxShadow = '0 0 0 2px #c4151f';
          el.style.backgroundColor = 'rgba(196, 21, 31, 0.05)';
          
          setTimeout(() => {
            el.style.transition = 'all 2s ease-out';
            el.style.boxShadow = 'none';
            el.style.backgroundColor = '';
          }, 2000);
        }, 500);
      }
    }
  }, [loading]);

  useEffect(() => {
    if (policy && !loading && window.location.hash === '#renovar') {
      // Small timeout to ensure everything is rendered
      setTimeout(() => {
        openRenewDialog();
        // Remove hash to prevent reopening
        window.history.replaceState(null, '', window.location.pathname);
      }, 300);
    }
  }, [policy, loading]);

  const { control: renewControl, handleSubmit: handleRenewSubmit, reset: resetRenew } = useForm({
    defaultValues: {
      nova_vigencia: undefined as Date | undefined,
      novo_valor: "0"
    }
  });

  const loadData = () => {
    if (!id) return;
    Promise.all([
      getApolice(id),
      getCoberturas(id),
      getHistorico(id),
      getDocumentos(id)
    ])
    .then(([policyData, coberturasData, historicoData, documentosData]) => {
      setPolicy(policyData);
      setCoberturas(coberturasData);
      setHistorico(historicoData);
      setDocumentos(documentosData);
      request<any[]>('/usuarios').then(d => setUsuarios(d || [])).catch(() => setUsuarios([{id:1, nome: "João Carlos"}]));
      setObservacoes(policyData.observacoes || "");
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleDownloadDoc = async (docId: number, nome: string) => {
    try {
      setIsDownloading(prev => ({ ...prev, [docId]: true }));
      await downloadArquivo(docId, nome);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível baixar o arquivo");
    } finally {
      setIsDownloading(prev => ({ ...prev, [docId]: false }));
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const openRenewDialog = () => {
    if (!policy) return;
    resetRenew({
      nova_vigencia: addYears(new Date(), 1),
      novo_valor: policy.cobertura?.toString() || "0"
    });
    setShowRenewDialog(true);
  };

  const onConfirmRenew = async (data: { nova_vigencia?: Date, novo_valor: string }) => {
    if (!id || !data.nova_vigencia) return;
    setIsRenewing(true);
    
    try {
      const payload = {
        nova_vigencia: format(data.nova_vigencia, "dd/MM/yyyy"),
        novo_valor: parseFloat(data.novo_valor) || 0
      };

      await request(`/apolices/${id}/renovar`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      toast.success("Apólice renovada com sucesso!");
      setShowRenewDialog(false);
      loadData(); // Re-fetch all data to invalidate cache and show updates
    } catch (err) {
      console.error(err);
      toast.error("Falha ao renovar a apólice");
    } finally {
      setIsRenewing(false);
    }
  };

  const handleAssignResponsible = async (userId: string, userName: string) => {
    if (!id) return;
    try {
      const responsavelId = parseInt(userId, 10);
      if (isNaN(responsavelId)) throw new Error("ID do usuário inválido");

      await request(`/apolices/${id}/responsavel`, {
        method: "PATCH",
        body: JSON.stringify({ responsavel_id: responsavelId })
      });
      setPolicy(prev => prev ? { ...prev, responsavel: userName, responsavel_id: responsavelId } : prev);
      toast.success("Responsável atribuído!");
    } catch (e) {
      toast.error("Falha ao atribuir responsável");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSaveObservacoes = async () => {
    if (!id) return;
    setSavingObs(true);
    try {
      await updateObservacoes(id, observacoes);
      // alert("Observações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar observações", err);
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6e150e]"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apólice não encontrada.</h2>
        <button onClick={() => navigate('/seguros')} className="mt-4 text-[#6e150e] flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    );
  }

  // Cálculos da vigência
  const parseDateString = (str: string) => {
    if (!str) return new Date();
    const parts = str.split('/');
    if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return new Date(str);
  };

  const start = parseDateString(policy.vigencia);
  const end = parseDateString(policy.vencimento);
  const now = new Date();
  
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  let progress = (elapsedDays / totalDays) * 100;
  if (progress > 100) progress = 100;
  if (progress < 0) progress = 0;

  const diasRestantes = policy.dias_restantes || 0;
  const isVencida = diasRestantes < 0;

  const formatCurrency = (val: number | string | undefined) => {
    if (val === undefined) return "R$ 0,00";
    const num = Number(val);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const statusLabel = isVencida ? 'Vencida' : (diasRestantes <= 30 ? 'A Vencer' : 'Conforme');
  const statusColor = isVencida ? 'bg-[#c4151f]/10 text-[#c4151f]' : 
                      (diasRestantes <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-[#788033]/10 text-[#788033]');

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8] mb-6">
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/')}>Flamboyant Shopping</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/seguros')}>Seguros</span>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-900 dark:text-white">Apólice {policy.luc}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start pb-12">
        {/* Main Column */}
        <div className="flex flex-col gap-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{policy.luc}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-[#94A3B8] text-lg mb-1">{policy.lojista}</p>
                <div className="flex gap-2 mt-1">
                  {policy.tipo && policy.tipo.split(',').map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-[#0a0a0a] text-gray-600 dark:text-[#94A3B8] rounded-lg text-xs font-medium">
                      {t.trim()}
                    </span>
                  ))}
                  <span className="px-3 py-1 bg-gray-100 dark:bg-[#0a0a0a] text-gray-600 dark:text-[#94A3B8] rounded-lg text-xs font-medium">
                    {policy.seguradora}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Apólice */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Dados da Apólice</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">LUC</p>
                <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{policy.luc}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">Seguradora</p>
                <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{policy.seguradora}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">Tipo / Segmento</p>
                <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{policy.tipo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">Início da Vigência</p>
                <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{start.toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">Vencimento</p>
                <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{end.toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mb-1">Valor Segurado Base</p>
                <p className="text-sm font-bold text-[#6e150e] dark:text-[#E04444]">{formatCurrency(policy.cobertura)}</p>
              </div>
            </div>
          </div>

          {/* Coberturas Contratadas */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Coberturas Contratadas</h3>
            <div className="flex flex-col gap-3">
              {coberturas.length > 0 ? (
                <>
                  {coberturas.map(c => (
                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#0a0a0a]/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">{c.nome}</p>
                        {c.descricao && <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-0.5">{c.descricao}</p>}
                      </div>
                      <div className="mt-2 sm:mt-0 font-medium text-sm text-[#788033]">
                        {formatCurrency(c.valor)}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-200 dark:border-[#222222]" style={{ borderTopWidth: '0.5px' }}>
                    <span className="text-[11px] uppercase text-gray-500 font-bold">Total coberto</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {formatCurrency(coberturas.reduce((acc, c) => acc + (Number(c.valor) || 0), 0))}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma cobertura detalhada encontrada.</p>
              )}
            </div>
          </div>

          {/* Partes Envolvidas */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Partes Envolvidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {policy.lojista.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Segurado (Lojista)</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={policy.lojista}>{policy.lojista}</p>
                  <div style={{fontSize:"10px",color:"var(--color-text-secondary)"}}>{formatCNPJ(policy.cnpj)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-sm">
                  C
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Corretor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Corretora Padrão</p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative">
                {policy.responsavel === "João Carlos" ? (
                  <img src={joaoCarlosImg} alt="Responsável" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-sm">
                    {policy.responsavel ? policy.responsavel.substring(0, 2).toUpperCase() : "NA"}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Responsável Interno</p>
                  {policy.responsavel ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={policy.responsavel}>{policy.responsavel}</p>
                  ) : (
                    <div>
                      {isAssigning ? (
                        <select 
                          className="text-xs p-1 mt-1 border rounded bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-gray-700 outline-none"
                          autoFocus
                          onBlur={() => setIsAssigning(false)}
                          onChange={(e) => handleAssignResponsible(e.target.value, e.target.options[e.target.selectedIndex].text)}
                        >
                          <option value="">Selecione...</option>
                          {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nome || u.id}</option>
                          ))}
                        </select>
                      ) : (
                        <button onClick={() => setIsAssigning(true)} className="text-[11px] text-[#c4151f] hover:underline font-medium p-0 m-0">
                          Atribuir responsável &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Histórico da Apólice */}
          <div id="historico" className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6 transition-colors duration-1000">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Histórico da Apólice</h3>
            <div className="relative pl-6 before:content-[''] before:absolute before:left-[6px] before:top-[10px] before:bottom-[10px] before:border-l-[1.5px] before:border-dashed before:border-gray-300 dark:before:border-gray-600">
              {historico.length > 0 ? historico.map((h, i) => (
                <div key={h.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[24.5px] w-2.5 h-2.5 rounded-full bg-white dark:bg-[#151515] border-[1.5px] border-gray-400 dark:border-gray-500 z-10 top-1" />
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 dark:text-[#64748B] font-medium mb-1">
                      {new Date(h.data).toLocaleDateString('pt-BR')} · {h.ator}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-[#F1F5F9]">{h.descricao}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Nenhum evento registrado.</p>
              )}
            </div>
          </div>

          <DocumentListWithUpload 
            policyId={id!} 
            documentos={documentos} 
            onUploadSuccess={loadData} 
            onExportApolice={() => exportApoliceParaPDF(policy, coberturas)}
          />

          {/* Observações */}
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider">Observações</h3>
              {canEdit && (
                <button 
                  onClick={handleSaveObservacoes}
                  disabled={savingObs}
                  className="text-xs font-medium bg-[#6e150e] hover:bg-[#5a110b] text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {savingObs ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                  Salvar
                </button>
              )}
            </div>
            <textarea
              className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222222] rounded-lg p-3 text-sm text-gray-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#6e150e]/50 min-h-[120px] resize-y"
              placeholder={canEdit ? "Adicione observações internas sobre esta apólice..." : "Nenhuma observação."}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              onBlur={handleSaveObservacoes}
              disabled={!canEdit}
            />
          </div>

        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6 text-center">
            
            <p className="text-xs font-medium text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Dias Restantes</p>
            
            <div className="flex justify-center items-center mb-6">
              <span className={`text-[42px] leading-none font-light ${isVencida ? 'text-[#D93030]' : (diasRestantes <= 15 ? 'text-orange-500' : 'text-gray-900 dark:text-white')}`}>
                {isVencida ? Math.abs(diasRestantes) : diasRestantes}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-100 dark:bg-[#0a0a0a] rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${isVencida ? 'bg-[#D93030]' : (diasRestantes <= 15 ? 'bg-orange-500' : 'bg-[#788033]')}`} 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
              <span>{start.toLocaleDateString('pt-BR')}</span>
              <span>{end.toLocaleDateString('pt-BR')}</span>
            </div>

            {/* Warning Message */}
            {diasRestantes >= 0 && diasRestantes < 90 && (
              <div className="mt-6 flex items-start gap-2 text-left bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-3 rounded-lg text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Esta apólice vence em menos de 90 dias. Inicie o processo de renovação.</p>
              </div>
            )}
            
            {isVencida && (
              <div className="mt-6 flex items-start gap-2 text-left bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Apólice vencida! Renovação urgente necessária.</p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-2">
              <RequireRole roles={['admin', 'gestor']}>
                <>
                  <button onClick={openRenewDialog} className="w-full bg-[#c4151f] hover:bg-[#a01119] text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                    Renovar Apólice
                  </button>
                  <button onClick={() => navigate(`/seguros/apolice/${id}/editar`)} className="w-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] font-medium text-sm py-2.5 rounded-lg transition-colors">
                    Editar Dados
                  </button>
                </>
              </RequireRole>
              <button onClick={() => exportApoliceParaPDF(policy, coberturas)} className="w-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] font-medium text-sm py-2.5 rounded-lg transition-colors">
                Exportar PDF
              </button>

              <RequireRole roles={['admin']}>
                <DeleteApoliceButton id={id!} />
              </RequireRole>
            </div>

          </div>
        </div>
      </div>

        <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
          <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Confirmar Renovação</DialogTitle>
            </DialogHeader>
            
            {policy && (
              <form onSubmit={handleRenewSubmit(onConfirmRenew)} className="flex flex-col gap-4 py-4">
                <div className="bg-gray-50 dark:bg-[#0a0a0a] p-4 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Vencimento Atual:</span>
                    <span className="font-medium">{end.toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Novo Vencimento:</span>
                    <span className="font-bold text-[#6e150e] dark:text-[#E04444]">
                      {addYears(end, 1).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Data da Renovação</label>
                  <Controller
                    name="nova_vigencia"
                    control={renewControl}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a nova data"
                      />
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Novo Valor Segurado (R$)</label>
                  <Controller
                    name="novo_valor"
                    control={renewControl}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Input type="number" {...field} />
                    )}
                  />
                </div>

                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowRenewDialog(false)} disabled={isRenewing}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isRenewing} className="bg-[#168821] hover:bg-[#126b1a] text-white">
                    {isRenewing ? "Renovando..." : "Confirmar Renovação"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}
