import React, { useState, useEffect, useRef } from "react";
import { format, addMonths, parse } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, X, UploadCloud, FileText, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useIsMobile } from "../ui/use-mobile";
import { Dialog, DialogContent } from "../ui/dialog";
import { Sheet, SheetContent } from "../ui/sheet";
import { Input } from "../ui/input";
import { DatePicker } from "../ui/date-picker";
import { request } from "../../../api/client";
import { formatCurrency } from "../../utils/currency";

export interface PolicyRenewalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apoliceId: string;
  onSuccess?: () => void;
}

export function PolicyRenewalWizard({ open, onOpenChange, apoliceId, onSuccess }: PolicyRenewalWizardProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Draft key varies per policy
  const storageKey = `renewal_draft_${apoliceId}`;
  const [draftToRestore, setDraftToRestore] = useState<any>(null);

  const [formData, setFormData] = useState({
    novaVigencia: undefined as Date | undefined,
    novoVencimento: undefined as Date | undefined,
    novaSeguradora: "",
    reajustePercentual: 0,
    novoValor: 0,
    manterDocumento: false,
    confirmed: false
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current policy data
  useEffect(() => {
    if (!open || !apoliceId) return;
    
    setLoading(true);
    request<any>(`/apolices/${apoliceId}`).then(data => {
      setCurrentPolicy(data);
      
      // Calculate defaults based on current policy
      let defVigencia, defVencimento;
      if (data.vencimento) {
        defVigencia = parse(data.vencimento, 'dd/MM/yyyy', new Date());
        defVencimento = addMonths(defVigencia, 12);
      }
      
      setFormData(prev => ({
        ...prev,
        novaVigencia: defVigencia,
        novoVencimento: defVencimento,
        novaSeguradora: data.seguradora || "",
        novoValor: data.cobertura || 0
      }));

      // Check draft after loading defaults
      const draft = localStorage.getItem(storageKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (Object.keys(parsed).length > 0) {
            const hasValue = Object.entries(parsed).some(([k, v]) => k !== 'confirmed' && k !== 'novoValor' && v !== "" && v !== null && (!Array.isArray(v) || v.length > 0));
            if (hasValue) {
              setDraftToRestore(parsed);
            } else {
              localStorage.removeItem(storageKey);
            }
          }
        } catch (e) {
          localStorage.removeItem(storageKey);
        }
      }
    }).finally(() => {
      setLoading(false);
    });
  }, [open, apoliceId, storageKey]);

  // Auto-save draft
  useEffect(() => {
    if (!open || loading) return;
    const { confirmed, ...draftData } = formData;
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [formData, open, loading, storageKey]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReajusteChange = (percentStr: string) => {
    const percent = parseFloat(percentStr) || 0;
    const currentValor = currentPolicy?.cobertura || 0;
    const novoValorCalculado = currentValor * (1 + (percent / 100));
    setFormData(prev => ({ ...prev, reajustePercentual: percentStr as any, novoValor: novoValorCalculado }));
  };

  const handleNovoValorChange = (valorStr: string) => {
    const novoValor = parseFloat(valorStr) || 0;
    const currentValor = currentPolicy?.cobertura || 0;
    let percent = 0;
    if (currentValor > 0) {
      percent = ((novoValor / currentValor) - 1) * 100;
    }
    setFormData(prev => ({ ...prev, novoValor, reajustePercentual: parseFloat(percent.toFixed(2)) }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFiles([file]);
      updateField('manterDocumento', false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setSelectedFiles([]);
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        if (!formData.novaVigencia || !formData.novoVencimento || !formData.novaSeguradora || formData.novoValor <= 0) {
          toast.error("Preencha todos os campos da nova apólice.");
          return false;
        }
        return true;
      case 3:
        if (selectedFiles.length === 0 && !formData.manterDocumento) {
          toast.error("Faça o upload do novo documento ou marque para manter o anterior.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const uploadFiles = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('flamboyant_token');

    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append("file", selectedFiles[0]);
      try {
        await fetch(`${apiUrl}/apolices/${apoliceId}/documentos`, {
          method: 'POST',
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          body: formData
        });
      } catch (e) {
        console.error("Falha ao fazer upload", e);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.confirmed) {
      toast.error("Você precisa confirmar que os dados estão corretos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nova_vigencia: formData.novoVencimento ? format(formData.novoVencimento, "dd/MM/yyyy") : "",
        novo_valor: formData.novoValor,
        seguradora: formData.novaSeguradora
      };

      await request(`/apolices/${apoliceId}/renovar`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!formData.manterDocumento && selectedFiles.length > 0) {
        await uploadFiles();
      }

      toast.success("Apólice renovada com sucesso!");
      localStorage.removeItem(storageKey);
      
      onOpenChange(false);
      setStep(1);
      setSelectedFiles([]);
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao renovar apólice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#c4151f] border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a]">
        
        {/* Header with Title */}
        <div className="p-4 md:px-6 md:py-5 border-b border-gray-100 dark:border-[#222]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Renovação de Apólice</h2>
        </div>

        {/* Draft Banner */}
        {draftToRestore && (
          <div className="mx-4 md:mx-8 mt-4 p-3 bg-yellow-50 dark:bg-[#c4151f]/10 border border-yellow-200 dark:border-[#c4151f]/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-yellow-800 dark:text-white">
              Encontramos um rascunho de renovação. Deseja continuar de onde parou?
            </span>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  setFormData({
                    ...draftToRestore,
                    novaVigencia: draftToRestore.novaVigencia ? new Date(draftToRestore.novaVigencia) : undefined,
                    novoVencimento: draftToRestore.novoVencimento ? new Date(draftToRestore.novoVencimento) : undefined,
                    confirmed: false
                  });
                  setDraftToRestore(null);
                }}
                className="flex-1 md:flex-none px-4 py-2 bg-yellow-400 dark:bg-[#c4151f] hover:bg-yellow-500 dark:hover:bg-[#a01119] text-yellow-900 dark:text-white rounded-md text-xs font-bold transition-colors"
              >
                Restaurar
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem(storageKey);
                  setDraftToRestore(null);
                }}
                className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-transparent border border-yellow-300 dark:border-[#c4151f]/50 hover:bg-yellow-100 dark:hover:bg-[#c4151f]/20 text-yellow-800 dark:text-red-400 rounded-md text-xs font-bold transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-4 py-6 md:px-8 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#111]">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-[16px] -translate-y-1/2 h-[2px] bg-gray-200 dark:bg-[#333] z-0"></div>
            {[1, 2, 3, 4].map((s) => {
              const isCompleted = step > s;
              const isCurrent = step === s;
              return (
                <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted ? 'bg-[#639922] text-white ring-4 ring-white dark:ring-[#0a0a0a]' : 
                    isCurrent ? 'bg-[#c4151f] text-white ring-4 ring-white dark:ring-[#0a0a0a]' : 
                    'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40 ring-4 ring-white dark:ring-[#0a0a0a]'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-[10px] font-semibold hidden md:block uppercase tracking-wider ${isCurrent ? 'text-[#c4151f]' : 'text-gray-400'}`}>
                    {s === 1 ? 'Atual' : s === 2 ? 'Termos' : s === 3 ? 'Docs' : 'Revisão'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-xl mx-auto space-y-6">
            
            {/* Step 1 */}
            {step === 1 && currentPolicy && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Revisão da Apólice Atual</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Confira os dados atuais da apólice antes de renovar.</p>
                </div>

                <div className="bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">LUC / Loja</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{currentPolicy.id} • {currentPolicy.lojista}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">CNPJ</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{currentPolicy.cnpj || "—"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#333]">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Seguradora Atual</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{currentPolicy.seguradora}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Cobertura Atual</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(currentPolicy.cobertura)}</p>
                        {currentPolicy.cobertura < 100000 && (
                          <div className="group relative">
                            <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help" />
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-black text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                              Cobertura abaixo da média sugerida para o segmento.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#333]">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Vencimento Atual</p>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{currentPolicy.vencimento}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Status</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{currentPolicy.status}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Siga para a próxima etapa para definir os novos termos, seguradora e valor da renovação.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Novos Termos</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Defina as condições da apólice renovada.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora Renovada <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.novaSeguradora}
                      onChange={e => updateField('novaSeguradora', e.target.value)}
                      placeholder="Ex: Porto Seguro"
                      className="dark:bg-[#151515]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Início da Nova Vigência <span className="text-red-500">*</span></label>
                    <DatePicker value={formData.novaVigencia} onChange={v => updateField('novaVigencia', v)} placeholder="Selecione..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Novo Vencimento <span className="text-red-500">*</span></label>
                    <DatePicker value={formData.novoVencimento} onChange={v => updateField('novoVencimento', v)} placeholder="Selecione..." />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-[#222] md:col-span-2 mt-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ajuste de Valor</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Reajuste (%)</label>
                    <Input 
                      type="number" step="0.1"
                      value={formData.reajustePercentual}
                      onChange={e => handleReajusteChange(e.target.value)}
                      className="dark:bg-[#151515]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Novo Valor Segurado <span className="text-red-500">*</span></label>
                    <Input 
                      type="number" step="0.01" min="0"
                      value={formData.novoValor}
                      onChange={e => handleNovoValorChange(e.target.value)}
                      className="dark:bg-[#151515]"
                    />
                    {currentPolicy && (
                      <p className="text-[10px] text-gray-500 mt-1">Valor anterior: {formatCurrency(currentPolicy.cobertura)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Novo Documento</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Anexe a via digital da nova apólice.</p>
                </div>

                {!formData.manterDocumento && (
                  <div className="space-y-2 mt-6">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-[#c4151f] hover:bg-red-50 dark:hover:bg-[#c4151f]/10 rounded-xl p-6 text-center cursor-pointer transition-all"
                    >
                      <input 
                        type="file" ref={fileInputRef} className="hidden"
                        onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8] font-medium">Clique ou arraste o PDF aqui</p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-[#c4151f]" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-[300px]">{file.name}</p>
                              </div>
                            </div>
                            <button onClick={removeFile} className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-[#222] rounded hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-[#222]">
                  <input 
                    type="checkbox" id="manter-doc"
                    checked={formData.manterDocumento}
                    onChange={e => {
                      updateField('manterDocumento', e.target.checked);
                      if (e.target.checked) setSelectedFiles([]);
                    }}
                    className="w-4 h-4 text-[#c4151f] rounded border-gray-300 focus:ring-[#c4151f]"
                  />
                  <label htmlFor="manter-doc" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none">
                    Renovação sem novo documento físico (manter PDF anterior).
                  </label>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && currentPolicy && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Confirmação de Renovação</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Revise as alterações aplicadas na apólice.</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 bg-gray-100 dark:bg-[#222] p-3 border-b border-gray-200 dark:border-[#333]">
                    <div className="text-xs font-bold text-gray-500 uppercase">Campo</div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Anterior</div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Novo</div>
                  </div>
                  
                  <div className="divide-y divide-gray-100 dark:divide-[#222]">
                    {currentPolicy.seguradora !== formData.novaSeguradora && (
                      <div className="grid grid-cols-3 p-3 items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Seguradora</div>
                        <div className="text-sm text-gray-500 line-through">{currentPolicy.seguradora}</div>
                        <div className="text-sm font-bold text-[#639922]">{formData.novaSeguradora}</div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 p-3 items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Vencimento</div>
                      <div className="text-sm text-gray-500 line-through">{currentPolicy.vencimento}</div>
                      <div className="text-sm font-bold text-[#639922]">
                        {formData.novoVencimento ? format(formData.novoVencimento, 'dd/MM/yyyy') : '—'}
                      </div>
                    </div>

                    {currentPolicy.cobertura !== formData.novoValor && (
                      <div className="grid grid-cols-3 p-3 items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Cobertura</div>
                        <div className="text-sm text-gray-500 line-through">{formatCurrency(currentPolicy.cobertura)}</div>
                        <div className="text-sm font-bold text-[#639922]">{formatCurrency(formData.novoValor)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-[#c4151f]/10 border border-red-100 dark:border-[#c4151f]/20 rounded-xl">
                  <input 
                    type="checkbox" id="confirm-data"
                    checked={formData.confirmed}
                    onChange={e => updateField('confirmed', e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#c4151f] rounded border-gray-300 focus:ring-[#c4151f]"
                  />
                  <label htmlFor="confirm-data" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none">
                    Confirmo que os novos termos estão corretos e desejo concluir a renovação.
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:px-8 border-t border-gray-100 dark:border-[#222] bg-white dark:bg-[#0a0a0a] sticky bottom-0 z-20 flex items-center justify-between gap-4">
          <button 
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#222]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#151515] dark:bg-white text-white dark:text-black hover:opacity-90 rounded-lg font-semibold text-sm transition-colors"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={!formData.confirmed || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#c4151f] hover:bg-[#a01119] text-white disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors"
            >
              {isSubmitting ? (
                <>Processando <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span></>
              ) : (
                <>Confirmar Renovação <CheckCircle2 className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl sm:max-w-none border-t border-gray-200 dark:border-[#333]">
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 h-[85vh] max-h-[750px] overflow-hidden flex flex-col rounded-2xl border border-gray-200 dark:border-[#333]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
