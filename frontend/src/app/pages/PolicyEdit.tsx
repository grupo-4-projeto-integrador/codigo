import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  X
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { getApolice } from "../../api/apolice";
import { request } from "../../api/client";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DatePicker } from "../components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "sonner";

interface PolicyEditFormInputs {
  loja: string;
  segmento: string;
  seguradora: string;
  vigencia: Date | undefined;
  vencimento: Date | undefined;
  cobertura: string;
  responsavel: string;
  observacoes: string;
}

export function PolicyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyData, setPolicyData] = useState<any>({});

  const { control, register, handleSubmit, reset } = useForm<PolicyEditFormInputs>({
    defaultValues: {
      loja: "",
      segmento: "",
      seguradora: "",
      vigencia: undefined,
      vencimento: undefined,
      cobertura: "0",
      responsavel: "",
      observacoes: ""
    }
  });

  useEffect(() => {
    if (!id) return;
    
    getApolice(id)
      .then((data) => {
        setPolicyData(data);
        
        const parseDateSafe = (dateString: string) => {
          if (!dateString) return undefined;
          if (dateString.includes('T')) {
            const [year, month, day] = dateString.split('T')[0].split('-');
            return new Date(Number(year), Number(month) - 1, Number(day));
          }
          if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            return new Date(Number(year), Number(month) - 1, Number(day));
          }
          if (dateString.includes('-')) {
            const [year, month, day] = dateString.split('-');
            return new Date(Number(year), Number(month) - 1, Number(day));
          }
          return new Date(dateString);
        };

        reset({
          loja: data.lojista || "",
          segmento: data.tipo || "",
          seguradora: data.seguradora || "",
          vigencia: data.vigencia ? parseDateSafe(data.vigencia) : undefined,
          vencimento: data.vencimento ? parseDateSafe(data.vencimento) : undefined,
          cobertura: data.cobertura?.toString() || "0",
          responsavel: data.responsavel || "",
          observacoes: data.observacoes || ""
        });
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error("Erro ao carregar os dados da apólice");
        setLoading(false);
      });
  }, [id, reset]);

  const onSubmit = async (data: PolicyEditFormInputs) => {
    if (!id) return;
    setSaving(true);
    
    try {
      const payload = {
        luc: id,
        loja: data.loja,
        segmento: data.segmento,
        seguradora: data.seguradora,
        vigencia: data.vigencia ? format(data.vigencia, "dd/MM/yyyy") : "",
        vencimento: data.vencimento ? format(data.vencimento, "dd/MM/yyyy") : "",
        cobertura: parseFloat(data.cobertura) || 0,
        observacoes: data.observacoes || ""
      };

      await request(`/apolices/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      
      toast.success("Apólice atualizada com sucesso!");
      navigate(`/seguros/apolice/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar as alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6e150e]"></div>
      </div>
    );
  }

  const isVencida = policyData.dias_restantes < 0;
  const diasRestantes = policyData.dias_restantes || 0;
  const statusColor = isVencida ? 'bg-[#D93030] text-white' : 
                      (diasRestantes <= 30 ? 'bg-orange-500 text-white' : 'bg-[#788033] text-white');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8] mb-6">
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/')}>Flamboyant Shopping</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/seguros')}>Seguros</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:opacity-70 font-medium text-gray-700 dark:text-gray-300" onClick={() => navigate('/seguros')}>{policyData?.lojista || policyData?.loja || "Carregando..."}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:opacity-70 font-medium text-gray-700 dark:text-gray-300" onClick={() => navigate(`/seguros/apolice/${id}`)}>Apólice {id}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-900 dark:text-white">Editar Apólice</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start pb-12">
        {/* Main Column */}
        <div className="flex flex-col gap-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{id}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                    {policyData.status}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-[#94A3B8] text-lg">Modo de Edição</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-6">Dados da Apólice</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">LUC (Não Editável)</label>
                <Input value={id} disabled className="bg-gray-50 dark:bg-[#1A1F2E]" />
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Segmento / Tipo</label>
                <Controller
                  name="segmento"
                  control={control}
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora</label>
                <Controller
                  name="seguradora"
                  control={control}
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Início da Vigência</label>
                <Controller
                  name="vigencia"
                  control={control}
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
                <Controller
                  name="vencimento"
                  control={control}
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
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor Segurado Base</label>
                <Input 
                  type="number"
                  {...register("cobertura")}
                  placeholder="0.00" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Responsável Interno</label>
                <Input 
                  {...register("responsavel")}
                  placeholder="Nome do responsável" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Salvar Alterações</h3>
            <p className="text-xs text-gray-500 dark:text-[#94A3B8] text-center mb-6">
              Certifique-se de que os dados estão corretos antes de salvar.
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
                Salvar Alterações
              </button>
              
              <button 
                type="button"
                onClick={() => navigate(`/seguros/apolice/${id}`)}
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
