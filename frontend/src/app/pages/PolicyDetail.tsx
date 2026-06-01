import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ChevronRight, 
  ArrowLeft, 
  Shield, 
  FileText, 
  Download, 
  Clock, 
  Save, 
  User, 
  AlertTriangle,
  CalendarIcon,
  Trash2
} from "lucide-react";
import { getApolice, getCoberturas, getHistorico, updateObservacoes } from "../../api/apolice";
import { request } from "../../api/client";
import type { ApoliceRecord } from "../../types/apolice";
import joaoCarlosImg from "../../assets/joao-carlos.jpg";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Button } from "../components/ui/button";
import { format, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatLargeCurrency } from "../utils/currency";
import { exportApoliceParaPDF } from "../utils/exportUtils";

export function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [policy, setPolicy] = useState<ApoliceRecord | null>(null);
  const [coberturas, setCoberturas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [observacoes, setObservacoes] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewDate, setRenewDate] = useState<Date | undefined>(undefined);
  const [renewValue, setRenewValue] = useState<string>("0");
  const [isRenewing, setIsRenewing] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    if (!id) return;
    Promise.all([
      getApolice(id),
      getCoberturas(id),
      getHistorico(id)
    ])
    .then(([policyData, coberturasData, historicoData]) => {
      setPolicy(policyData);
      setCoberturas(coberturasData);
      setHistorico(historicoData);
      setObservacoes(policyData.observacoes || "");
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const openRenewDialog = () => {
    if (!policy) return;
    setRenewDate(addYears(new Date(), 1));
    setRenewValue(policy.cobertura?.toString() || "0");
    setShowRenewDialog(true);
  };

  const handleConfirmRenew = async () => {
    if (!id || !renewDate) return;
    setIsRenewing(true);
    
    try {
      const payload = {
        nova_vigencia: format(renewDate, "dd/MM/yyyy"),
        novo_valor: parseFloat(renewValue) || 0
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

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await request(`/apolices/${id}`, {
        method: "DELETE"
      });
      toast.success("Apólice excluída");
      navigate("/seguros");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao excluir apólice");
      setIsDeleting(false);
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
  const start = new Date(policy.vigencia);
  const end = new Date(policy.vencimento);
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

  const statusColor = isVencida ? 'bg-[#D93030] text-white' : 
                      (diasRestantes <= 30 ? 'bg-orange-500 text-white' : 'bg-[#788033] text-white');

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#94A3B8] mb-6">
        <button onClick={() => navigate('/seguros')} className="hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Seguros
        </button>
        <ChevronRight className="w-4 h-4" />
        <span>Dashboard</span>
        <ChevronRight className="w-4 h-4" />
        <span className="font-semibold text-gray-900 dark:text-white">Apólice {policy.luc}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start pb-12">
        {/* Main Column */}
        <div className="flex flex-col gap-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{policy.luc}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                    {policy.status}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-[#94A3B8] text-lg">{policy.lojista}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-gray-100 dark:bg-[#1A1F2E] text-gray-600 dark:text-[#94A3B8] rounded-lg text-xs font-medium">
                  {policy.tipo}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-[#1A1F2E] text-gray-600 dark:text-[#94A3B8] rounded-lg text-xs font-medium">
                  {policy.seguradora}
                </span>
              </div>
            </div>
          </div>

          {/* Dados da Apólice */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
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
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Coberturas Contratadas</h3>
            <div className="flex flex-col gap-3">
              {coberturas.length > 0 ? coberturas.map(c => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-[#2E3447] bg-gray-50/50 dark:bg-[#1A1F2E]/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-0.5">{c.descricao}</p>}
                  </div>
                  <div className="mt-2 sm:mt-0 font-medium text-sm text-[#788033]">
                    {formatCurrency(c.valor)}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Nenhuma cobertura detalhada encontrada.</p>
              )}
            </div>
          </div>

          {/* Partes Envolvidas */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Partes Envolvidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {policy.lojista.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Segurado (Lojista)</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={policy.lojista}>{policy.lojista}</p>
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
              <div className="flex items-center gap-3">
                {policy.responsavel === "João Carlos" ? (
                  <img src={joaoCarlosImg} alt="Responsável" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#3e0000] text-[#bc9b7c] flex items-center justify-center font-bold text-sm">
                    {policy.responsavel ? policy.responsavel.substring(0, 2).toUpperCase() : "NA"}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Responsável Interno</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={policy.responsavel || "Não atribuído"}>{policy.responsavel || "Não atribuído"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico da Apólice */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Histórico da Apólice</h3>
            <div className="relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-[#2E3447]">
              {historico.length > 0 ? historico.map((h, i) => (
                <div key={h.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[30px] w-3.5 h-3.5 rounded-full bg-white dark:bg-[#242938] border-2 border-[#788033] z-10 top-1.5" />
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-400 dark:text-[#64748B] font-medium mb-1">
                      {new Date(h.data).toLocaleDateString('pt-BR')} - {h.ator}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-[#F1F5F9]">{h.descricao}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Nenhum evento registrado.</p>
              )}
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Documentos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-[#2E3447] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#6e150e] dark:group-hover:text-[#E04444] transition-colors">Apolice_Completa.pdf</p>
                    <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Adicionado em {start.toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-[#2E3447] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#6e150e] dark:group-hover:text-[#E04444] transition-colors">Condicoes_Gerais.pdf</p>
                    <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Adicionado em {start.toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider">Observações</h3>
              <button 
                onClick={handleSaveObservacoes}
                disabled={savingObs}
                className="text-xs font-medium bg-[#6e150e] hover:bg-[#5a110b] text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {savingObs ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar
              </button>
            </div>
            <textarea
              className="w-full bg-gray-50 dark:bg-[#1A1F2E] border border-gray-200 dark:border-[#2E3447] rounded-lg p-3 text-sm text-gray-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#6e150e]/50 min-h-[120px] resize-y"
              placeholder="Adicione observações internas sobre esta apólice..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              onBlur={handleSaveObservacoes}
            />
          </div>

        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6 text-center">
            
            <p className="text-xs font-medium text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">Dias Restantes</p>
            
            <div className="flex justify-center items-center mb-6">
              <span className={`text-[42px] leading-none font-light ${isVencida ? 'text-[#D93030]' : (diasRestantes <= 30 ? 'text-orange-500' : 'text-gray-900 dark:text-white')}`}>
                {isVencida ? Math.abs(diasRestantes) : diasRestantes}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-100 dark:bg-[#1A1F2E] rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${isVencida ? 'bg-[#D93030]' : (diasRestantes <= 30 ? 'bg-orange-500' : 'bg-[#788033]')}`} 
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
              <button onClick={openRenewDialog} className="w-full bg-[#6e150e] hover:bg-[#5a110b] text-white font-medium text-sm py-2.5 rounded-lg transition-colors">
                Renovar Apólice
              </button>
              <button onClick={() => navigate(`/seguros/apolice/${id}/editar`)} className="w-full bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] font-medium text-sm py-2.5 rounded-lg transition-colors">
                Editar Dados
              </button>
              <button onClick={() => exportApoliceParaPDF(policy, coberturas)} className="w-full bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] font-medium text-sm py-2.5 rounded-lg transition-colors">
                Exportar PDF
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full bg-transparent hover:bg-red-50 dark:hover:bg-red-900/10 text-[#c4151f] font-medium text-[13px] py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir Apólice
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir apólice permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A apólice {policy.luc} e todos os seus documentos e histórico serão removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="bg-[#c4151f] hover:bg-[#a01119] text-white"
                    >
                      {isDeleting ? "Excluindo..." : "Excluir permanentemente"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          </div>
        </div>
      </div>

      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Renovação</DialogTitle>
          </DialogHeader>
          
          {policy && (
            <div className="flex flex-col gap-4 py-4">
              <div className="bg-gray-50 dark:bg-[#1A1F2E] p-4 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vencimento Atual:</span>
                  <span className="font-medium">{end.toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Novo Vencimento:</span>
                  <span className="font-bold text-[#6e150e] dark:text-[#E04444]">
                    {renewDate ? format(renewDate, "dd/MM/yyyy") : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 dark:border-[#2E3447] pt-2 mt-1">
                  <span className="text-gray-500">Variação de Valor:</span>
                  <span className={`font-semibold ${parseFloat(renewValue) - policy.cobertura > 0 ? 'text-green-600' : (parseFloat(renewValue) - policy.cobertura < 0 ? 'text-red-600' : 'text-gray-500')}`}>
                    {parseFloat(renewValue) - policy.cobertura > 0 ? "+" : ""}
                    {formatCurrency(parseFloat(renewValue) - policy.cobertura)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Nova Data de Vencimento</label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {renewDate ? format(renewDate, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto">
                    <Calendar mode="single" selected={renewDate} onSelect={setRenewDate} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Novo Valor Segurado (R$)</label>
                <Input type="number" value={renewValue} onChange={e => setRenewValue(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)} disabled={isRenewing}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRenew} disabled={isRenewing} className="bg-[#168821] hover:bg-[#126b1a] text-white">
              {isRenewing ? "Renovando..." : "Confirmar Renovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
