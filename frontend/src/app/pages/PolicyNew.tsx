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
import { DatePicker } from "../components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "sonner";

interface PolicyFormInputs {
  luc: string;
  loja: string;
  segmento: string;
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

  const { control, register, handleSubmit, setValue } = useForm<PolicyFormInputs>({
    defaultValues: {
      luc: "",
      loja: "",
      segmento: "",
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
  }, []);

  const handleLucChange = (selectedLuc: string) => {
    setValue("luc", selectedLuc);
    const selectedLoja = lojasCadastradas.find(l => l.luc === selectedLuc);
    if (selectedLoja) {
      setValue("loja", selectedLoja.nome || "");
      setValue("segmento", selectedLoja.segmento || "");
    }
  };

  const onSubmit = async (data: PolicyFormInputs) => {
    if (!data.luc || !data.seguradora || !data.segmento || !data.vigencia || !data.vencimento || !data.cobertura || !data.responsavel) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    
    try {
      const payload = {
        luc: data.luc,
        loja: data.loja,
        segmento: data.segmento,
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
                <Controller
                  name="luc"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={handleLucChange} disabled={loadingLojas}>
                      <SelectTrigger className="w-full dark:bg-[#1A1F2E]">
                        <SelectValue placeholder={loadingLojas ? "Carregando..." : "Selecione a loja"} />
                      </SelectTrigger>
                      <SelectContent>
                        {lojasCadastradas.map(l => (
                          <SelectItem key={l.luc} value={l.luc}>{l.luc} - {l.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Loja (Lojista/Fantasia)</label>
                <Input 
                  {...register("loja")}
                  placeholder="Nome da loja" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de Cobertura <span className="text-red-500">*</span></label>
                <Controller
                  name="segmento"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full dark:bg-[#1A1F2E]">
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Moda">Moda</SelectItem>
                        <SelectItem value="Alimentação">Alimentação</SelectItem>
                        <SelectItem value="Serviços">Serviços</SelectItem>
                        <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                        <SelectItem value="Âncoras">Âncoras</SelectItem>
                        <SelectItem value="Incêndio">Incêndio</SelectItem>
                        <SelectItem value="Responsabilidade Civil">Responsabilidade Civil</SelectItem>
                        <SelectItem value="Danos Elétricos">Danos Elétricos</SelectItem>
                        <SelectItem value="Vidros e Fachadas">Vidros e Fachadas</SelectItem>
                        <SelectItem value="Roubo e Furto">Roubo e Furto</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora <span className="text-red-500">*</span></label>
                <Controller
                  name="seguradora"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full dark:bg-[#1A1F2E]">
                        <SelectValue placeholder="Selecione a seguradora" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chubb">Chubb</SelectItem>
                        <SelectItem value="Tokio Marine">Tokio Marine</SelectItem>
                        <SelectItem value="Sompo">Sompo</SelectItem>
                        <SelectItem value="Porto Seguro">Porto Seguro</SelectItem>
                        <SelectItem value="Zurich">Zurich</SelectItem>
                        <SelectItem value="Allianz">Allianz</SelectItem>
                        <SelectItem value="Mapfre">Mapfre</SelectItem>
                        <SelectItem value="HDI">HDI</SelectItem>
                        <SelectItem value="Liberty">Liberty</SelectItem>
                        <SelectItem value="Sura">Sura</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações</label>
                <Input 
                  {...register("observacoes")}
                  placeholder="Informações adicionais" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Confirmar Criação</h3>
            <p className="text-xs text-gray-500 dark:text-[#94A3B8] text-center mb-6">
              Certifique-se de que os dados estão corretos antes de salvar a nova apólice.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-[#168821] hover:bg-[#126b1a] text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
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
