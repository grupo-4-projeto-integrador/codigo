import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  X
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { createApolice, getLojas } from "../../api/apolice";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MultiSelect } from "../components/ui/multi-select";
import { DatePicker } from "../components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { request } from "../../api/client";

interface PolicyFormInputs {
  luc: string;
  loja: string;
  tipos_cobertura: string[];
  seguradora: string;
  vigencia: Date | undefined;
  vencimento: Date | undefined;
  cobertura: string;
  responsavel: string;
  observacoes: string;
}

export function PolicyNew() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [lojasCadastradas, setLojasCadastradas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tiposCobertura, setTiposCobertura] = useState<{label: string, value: string}[]>([]);
  const [lojaIsReadOnly, setLojaIsReadOnly] = useState(false);

  const { control, register, handleSubmit, setValue, watch } = useForm<PolicyFormInputs>({
    defaultValues: {
      luc: "",
      loja: "",
      tipos_cobertura: [],
      seguradora: "",
      vigencia: undefined,
      vencimento: undefined,
      cobertura: "",
      responsavel: "",
      observacoes: ""
    }
  });

  useEffect(() => {
    getLojas()
      .then((data) => {
        setLojasCadastradas(data || []);
      })
      .catch(err => {
        console.error(err);
        toast.error("Erro ao carregar lista de lojas");
      })
      .finally(() => {
        setLoadingLojas(false);
      });

    request<string[]>('/tipos-cobertura')
      .then(data => {
        if (data && data.length > 0) {
          setTiposCobertura(data.map(d => ({ label: d, value: d })));
        }
      })
      .catch(() => {
        setTiposCobertura([
          { label: "Incêndio", value: "Incêndio" },
          { label: "Responsabilidade Civil", value: "Responsabilidade Civil" },
          { label: "Roubo e Furto", value: "Roubo e Furto" },
          { label: "Danos Elétricos", value: "Danos Elétricos" }
        ]);
      });

    request<any[]>('/usuarios')
      .then(data => {
        setUsuarios(data || []);
        if (data && data.length > 0) {
          setValue('responsavel', data[0].nome || data[0].id);
        }
      })
      .catch(() => {
        const mockUsers = [{ id: 1, nome: "João Carlos" }, { id: 2, nome: "Ana Silva" }];
        setUsuarios(mockUsers);
        setValue('responsavel', "João Carlos");
      });
  }, [setValue]);

  const handleLucChange = async (selectedLuc: string) => {
    if (!selectedLuc) {
      setValue("loja", "");
      setLojaIsReadOnly(false);
      return;
    }
    try {
      const lojaData = await request<any>(`/lojas/${selectedLuc}`);
      if (lojaData && (lojaData.nome || lojaData.lojista || lojaData.fantasia)) {
        setValue("loja", lojaData.nome || lojaData.lojista || lojaData.fantasia || "");
        setLojaIsReadOnly(true);
      } else {
        setValue("loja", "");
        setLojaIsReadOnly(false);
      }
    } catch(e) {
      const selectedLoja = lojasCadastradas.find(l => l.luc === selectedLuc);
      if (selectedLoja) {
        setValue("loja", selectedLoja.nome || selectedLoja.lojista || "");
        setLojaIsReadOnly(true);
      } else {
        setValue("loja", "");
        setLojaIsReadOnly(false);
      }
    }
  };

  const formValues = watch();
  const filledFieldsCount = [
    formValues.luc,
    formValues.loja,
    formValues.tipos_cobertura?.length > 0 ? formValues.tipos_cobertura : null,
    formValues.seguradora,
    formValues.vigencia,
    formValues.vencimento,
    formValues.cobertura,
    formValues.responsavel
  ].filter(v => !!v).length;

  const onSubmit = async (data: PolicyFormInputs) => {
    if (!data.luc || !data.seguradora || !data.tipos_cobertura?.length || !data.vigencia || !data.vencimento || !data.cobertura || !data.responsavel) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    
    try {
      const payload = {
        luc: data.luc,
        loja: data.loja,
        tipos_cobertura: data.tipos_cobertura,
        segmento: data.tipos_cobertura.join(', '), // compatibilidade com backend legado se necessário
        seguradora: data.seguradora,
        vigencia: data.vigencia ? format(data.vigencia, "dd/MM/yyyy") : "",
        vencimento: data.vencimento ? format(data.vencimento, "dd/MM/yyyy") : "",
        cobertura: parseFloat(data.cobertura) || 0,
        responsavel: data.responsavel,
        observacoes: data.observacoes
      };

      await createApolice(payload);
      
      toast.success("Apólice criada com sucesso");
      navigate(`/seguros/apolice/${data.luc}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao criar apólice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8] mb-6">
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/')}>Flamboyant Shopping</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/seguros')}>Seguros</span>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-900 dark:text-white">Nova Apólice</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start pb-12">
        {/* Main Column */}
        <div className="flex flex-col gap-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Nova Apólice</h1>
                <p className="text-gray-500 dark:text-[#94A3B8] text-lg">Preencha os dados para criar uma nova apólice</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-6">Dados da Apólice</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">LUC da loja <span className="text-red-500">*</span></label>
                <Input 
                  {...register("luc", { required: true })}
                  placeholder="Ex: AE-03"
                  className="dark:bg-[#1A1F2E]"
                  onBlur={(e) => handleLucChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Loja (Lojista/Fantasia)</label>
                <Input 
                  {...register("loja")}
                  readOnly={lojaIsReadOnly}
                  placeholder="Nome da loja" 
                  className={lojaIsReadOnly ? "bg-gray-50 dark:bg-[#1A1F2E]/50 text-gray-500" : "dark:bg-[#1A1F2E]"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de Cobertura <span className="text-red-500">*</span></label>
                <Controller
                  name="tipos_cobertura"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <MultiSelect
                      options={tiposCobertura}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Selecione o tipo de cobertura"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora <span className="text-red-500">*</span></label>
                <Input 
                  {...register("seguradora", { required: true })}
                  placeholder="Ex: Porto Seguro"
                  autoComplete="off"
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Data de Início <span className="text-red-500">*</span></label>
                <Controller
                  name="vigencia"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione a data de início"
                    />
                  )}
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Data de Vencimento <span className="text-red-500">*</span></label>
                <Controller
                  name="vencimento"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione a data de vencimento"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor Segurado Base <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  {...register("cobertura", { required: true })}
                  placeholder="0.00" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Responsável pelo Preenchimento <span className="text-red-500">*</span></label>
                <Input 
                  {...register("responsavel", { required: true })}
                  placeholder="Nome do responsável" 
                  autoComplete="off"
                  list="usuarios-list"
                  className="dark:bg-[#1A1F2E]"
                />
                <datalist id="usuarios-list">
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nome || u.id} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações</label>
                <Input 
                  {...register("observacoes")}
                  placeholder="Informações adicionais" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Documento da Apólice (PDF)</label>
                <Input 
                  type="file"
                  accept=".pdf"
                  className="dark:bg-[#1A1F2E] file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#c4151f]/10 file:text-[#c4151f] hover:file:bg-[#c4151f]/20 cursor-pointer"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Resumo da Apólice</h3>
            
            <div className="flex flex-col gap-2 mb-6 text-sm">
              <div className="flex justify-between border-b border-gray-100 dark:border-[#2E3447] pb-2">
                <span className="text-gray-500">Loja</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px] text-right">{formValues.loja || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-[#2E3447] pb-2">
                <span className="text-gray-500">Cobertura</span>
                <span className="font-semibold text-gray-900 dark:text-white max-w-[150px] truncate text-right" title={formValues.tipos_cobertura?.join(', ')}>
                  {formValues.tipos_cobertura?.length > 0 ? formValues.tipos_cobertura.join(', ') : "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-[#2E3447] pb-2">
                <span className="text-gray-500">Seguradora</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formValues.seguradora || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-[#2E3447] pb-2">
                <span className="text-gray-500">Vigência</span>
                <span className="font-semibold text-right text-gray-900 dark:text-white">
                  {formValues.vigencia ? format(formValues.vigencia, "dd/MM/yyyy") : "-"} a {formValues.vencimento ? format(formValues.vencimento, "dd/MM/yyyy") : "-"}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Valor</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formValues.cobertura ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formValues.cobertura)) : "-"}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-gray-500 dark:text-[#94A3B8] font-medium">{filledFieldsCount} de 8 campos obrigatórios preenchidos</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#c4151f] transition-all duration-300" 
                  style={{ width: `${(filledFieldsCount / 8) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                disabled={saving || filledFieldsCount < 8}
                className="w-full bg-[#c4151f] hover:bg-[#a01119] text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Criar Apólice
              </button>
              
              <button 
                type="button"
                onClick={() => navigate('/seguros')}
                disabled={saving}
                className="w-full bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}
