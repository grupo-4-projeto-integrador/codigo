import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, X, UploadCloud, FileText, Trash2, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "../ui/use-mobile";
import { Dialog, DialogContent } from "../ui/dialog";
import { Sheet, SheetContent } from "../ui/sheet";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MultiSelect } from "../ui/multi-select";
import { DatePicker } from "../ui/date-picker";
import { request } from "../../../api/client";
import { createApolice, getLojas } from "../../../api/apolice";

const STORAGE_KEY = "policy_creation_draft";

export interface PolicyCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newLuc: string) => void;
}

export function PolicyCreationWizard({ open, onOpenChange, onSuccess }: PolicyCreationWizardProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [lojasCadastradas, setLojasCadastradas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tiposCobertura, setTiposCobertura] = useState<{label: string, value: string}[]>([]);
  const [lojaIsReadOnly, setLojaIsReadOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    luc: "",
    loja: "",
    cnpj: "",
    tipos_cobertura: [] as string[],
    seguradora: "",
    cobertura: "",
    responsavel: "",
    observacoes: "",
    vigencia: undefined as Date | undefined,
    vencimento: undefined as Date | undefined,
    confirmed: false
  });

  // Files State (not stored in localStorage)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    
    // Load reference data
    getLojas().then((data) => setLojasCadastradas(data || [])).finally(() => setLoadingLojas(false));
    request<string[]>('/tipos-cobertura').then(data => {
      if (data && data.length > 0) setTiposCobertura(data.map(d => ({ label: d, value: d })));
    }).catch(() => {
      setTiposCobertura([
        { label: "Incêndio", value: "Incêndio" },
        { label: "Responsabilidade Civil", value: "Responsabilidade Civil" },
        { label: "Roubo e Furto", value: "Roubo e Furto" },
        { label: "Danos Elétricos", value: "Danos Elétricos" }
      ]);
    });
    request<any[]>('/usuarios').then(data => setUsuarios(data || [])).catch(() => {
      setUsuarios([{ id: 1, nome: "João Carlos" }, { id: 2, nome: "Ana Silva" }]);
    });

    // Check draft
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Object.keys(parsed).length > 0) {
          const hasValue = Object.entries(parsed).some(([k, v]) => k !== 'confirmed' && v !== "" && v !== null && (!Array.isArray(v) || v.length > 0));
          if (hasValue) {
            setDraftToRestore(parsed);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [open]);

  // Auto-save draft
  useEffect(() => {
    if (!open) return;
    const { confirmed, ...draftData } = formData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
  }, [formData, open]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLucChange = async (selectedLuc: string, updateState = true) => {
    if (updateState) updateField("luc", selectedLuc);
    if (!selectedLuc) {
      updateField("loja", "");
      setLojaIsReadOnly(false);
      return;
    }
    try {
      const lojaData = await request<any>(`/lojas/${selectedLuc}`);
      if (lojaData && (lojaData.nome || lojaData.lojista || lojaData.fantasia)) {
        updateField("loja", lojaData.nome || lojaData.lojista || lojaData.fantasia || "");
        setLojaIsReadOnly(true);
      } else {
        setLojaIsReadOnly(false);
      }
    } catch(e) {
      const selectedLoja = lojasCadastradas.find(l => l.luc === selectedLuc);
      if (selectedLoja) {
        updateField("loja", selectedLoja.nome || selectedLoja.lojista || "");
        setLojaIsReadOnly(true);
      } else {
        setLojaIsReadOnly(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyCnpjMask = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
    if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    if (v.length > 2) return v.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
    return v;
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        if (!formData.luc || !formData.cnpj) {
          toast.error("Preencha o LUC e o CNPJ");
          return false;
        }
        if (formData.cnpj.replace(/\D/g, '').length !== 14) {
          toast.error("CNPJ inválido. Certifique-se de digitar os 14 números.");
          return false;
        }
        return true;
      case 2:
        if (!formData.tipos_cobertura.length || !formData.seguradora || !formData.responsavel) {
          toast.error("Preencha todos os campos obrigatórios (*) desta etapa");
          return false;
        }
        return true;
      case 3:
        if (!formData.vigencia || !formData.vencimento) {
          toast.error("As datas de vigência e vencimento são obrigatórias");
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

  const uploadFiles = async (policyId: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('flamboyant_token');

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await fetch(`${apiUrl}/apolices/${policyId}/documentos`, {
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
        luc: formData.luc,
        lojista: formData.loja,
        loja: formData.loja,
        cnpj: formData.cnpj,
        tipos_cobertura: formData.tipos_cobertura,
        segmento: formData.tipos_cobertura.join(', '),
        seguradora: formData.seguradora,
        vigencia: formData.vigencia ? format(formData.vigencia, "dd/MM/yyyy") : "",
        vencimento: formData.vencimento ? format(formData.vencimento, "dd/MM/yyyy") : "",
        cobertura: parseFloat(formData.cobertura) || 0,
        responsavel: formData.responsavel,
        observacoes: formData.observacoes
      };

      const result = await createApolice(payload);
      
      if (selectedFiles.length > 0) {
        await uploadFiles(result.luc);
      }

      toast.success("Apólice criada com sucesso");
      localStorage.removeItem(STORAGE_KEY);
      
      setFormData({
        luc: "", loja: "", cnpj: "", tipos_cobertura: [], seguradora: "", cobertura: "",
        responsavel: "", observacoes: "", vigencia: undefined, vencimento: undefined, confirmed: false
      });
      setSelectedFiles([]);
      setStep(1);
      
      onOpenChange(false);
      if (onSuccess) onSuccess(result.luc);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao criar apólice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a]">
        
        {/* Header with Title */}
        <div className="p-4 md:px-6 md:py-5 border-b border-gray-100 dark:border-[#222]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nova Apólice</h2>
        </div>

        {/* Draft Banner */}
        {draftToRestore && (
          <div className="mx-4 md:mx-8 mt-4 p-3 bg-yellow-50 dark:bg-[#c4151f]/10 border border-yellow-200 dark:border-[#c4151f]/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-yellow-800 dark:text-white">
              Encontramos um rascunho salvo desta apólice. Deseja continuar de onde parou?
            </span>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  setFormData({
                    ...draftToRestore,
                    vigencia: draftToRestore.vigencia ? new Date(draftToRestore.vigencia) : undefined,
                    vencimento: draftToRestore.vencimento ? new Date(draftToRestore.vencimento) : undefined,
                    confirmed: false
                  });
                  if (draftToRestore.luc) handleLucChange(draftToRestore.luc, false);
                  setDraftToRestore(null);
                }}
                className="flex-1 md:flex-none px-4 py-2 bg-yellow-400 dark:bg-[#c4151f] hover:bg-yellow-500 dark:hover:bg-[#a01119] text-yellow-900 dark:text-white rounded-md text-xs font-bold transition-colors"
              >
                Restaurar
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
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
                    isCompleted ? 'bg-[#639922] text-white' : 
                    isCurrent ? 'bg-[#c4151f] text-white' : 
                    'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-[10px] font-semibold hidden md:block uppercase tracking-wider ${isCurrent ? 'text-[#c4151f]' : 'text-gray-400'}`}>
                    {s === 1 ? 'Loja' : s === 2 ? 'Dados' : s === 3 ? 'Vigência' : 'Revisão'}
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
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Identificação da Loja</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Insira o LUC para preencher automaticamente os dados da loja caso existam.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">LUC da loja <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.luc}
                      onChange={e => updateField('luc', e.target.value)}
                      onBlur={e => handleLucChange(e.target.value, false)}
                      placeholder="Ex: AE-03"
                      className="dark:bg-[#151515] dark:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Loja (Lojista/Fantasia)</label>
                    <Input 
                      value={formData.loja}
                      onChange={e => updateField('loja', e.target.value)}
                      readOnly={lojaIsReadOnly}
                      placeholder="Nome da loja" 
                      className={lojaIsReadOnly ? "bg-gray-50 dark:bg-[#111] text-gray-500 dark:border-transparent" : "dark:bg-[#151515] dark:border-transparent"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">CNPJ <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.cnpj}
                      onChange={e => updateField('cnpj', applyCnpjMask(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      className="dark:bg-[#151515] dark:border-transparent"
                      maxLength={18}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Dados da Apólice</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Detalhes da cobertura e responsável pela apólice.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de Cobertura <span className="text-red-500">*</span></label>
                    <MultiSelect
                      options={tiposCobertura}
                      selected={formData.tipos_cobertura}
                      onChange={v => updateField('tipos_cobertura', v)}
                      placeholder="Selecione o segmento"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.seguradora}
                      onChange={e => updateField('seguradora', e.target.value)}
                      placeholder="Ex: Porto Seguro"
                      className="dark:bg-[#151515] dark:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor Segurado Base</label>
                    <Input 
                      type="number" min="0" step="0.01"
                      value={formData.cobertura}
                      onChange={e => updateField('cobertura', e.target.value)}
                      placeholder="0.00" 
                      className="dark:bg-[#151515] dark:border-transparent"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Responsável Interno <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.responsavel}
                      onChange={e => updateField('responsavel', e.target.value)}
                      placeholder="Nome do responsável" 
                      list="usuarios-list"
                      className="dark:bg-[#151515] dark:border-transparent"
                    />
                    <datalist id="usuarios-list">
                      {usuarios.map(u => <option key={u.id} value={u.nome || u.id} />)}
                    </datalist>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações</label>
                    <Input 
                      value={formData.observacoes}
                      onChange={e => updateField('observacoes', e.target.value)}
                      placeholder="Alguma nota adicional?" 
                      className="dark:bg-[#151515] dark:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Vigência e Documentos</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Datas de validade e anexos obrigatórios.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Data de Início <span className="text-red-500">*</span></label>
                    <DatePicker value={formData.vigencia} onChange={v => updateField('vigencia', v)} placeholder="Selecione..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Data de Vencimento <span className="text-red-500">*</span></label>
                    <DatePicker value={formData.vencimento} onChange={v => updateField('vencimento', v)} placeholder="Selecione..." />
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Documento da Apólice (Opcional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-[#c4151f] hover:bg-red-50 dark:hover:bg-[#c4151f]/10 rounded-xl p-6 text-center cursor-pointer transition-all"
                  >
                    <input 
                      type="file" ref={fileInputRef} className="hidden" multiple
                      onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-[#94A3B8] font-medium">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG até 10MB</p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#c4151f]" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-[300px]">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(idx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-[#222] rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Revisão e Confirmação</h3>
                  <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Confira se os dados estão corretos antes de criar a apólice.</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-xl p-5 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">LUC / Loja</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.luc || "—"} • {formData.loja || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">CNPJ</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.cnpj || "—"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#333]">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Seguradora</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.seguradora || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Coberturas</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.tipos_cobertura.join(', ') || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#333]">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Vigência</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formData.vigencia ? format(formData.vigencia, 'dd/MM/yyyy') : '—'} a {formData.vencimento ? format(formData.vencimento, 'dd/MM/yyyy') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Arquivos Anexados</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFiles.length} documento(s)</p>
                    </div>
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
                    Confirmo que os dados estão corretos e desejo criar esta apólice.
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
                <>Salvando <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span></>
              ) : (
                <>Criar Apólice <CheckCircle2 className="w-4 h-4" /></>
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
