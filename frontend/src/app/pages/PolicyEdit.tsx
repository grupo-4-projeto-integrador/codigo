import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ChevronRight, 
  Check,
  X
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { getApolice, getDocumentos } from "../../api/apolice";
import { DocumentListWithUpload } from "../components/DocumentListWithUpload";
import { exportApoliceParaPDF } from "../utils/exportUtils";
import { request } from "../../api/client";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MultiSelect } from "../components/ui/multi-select";
import { DatePicker } from "../components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { DeleteApoliceButton } from "../components/DeleteApoliceButton";
import { useUserProfile } from "../contexts/UserProfileContext";

interface PolicyEditFormInputs {
  luc: string;
  loja: string;
  cnpj: string;
  tipos_cobertura: string[];
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
  const [documentos, setDocumentos] = useState<any[]>([]);
  const { canEdit } = useUserProfile();

  const { control, register, handleSubmit, reset } = useForm<PolicyEditFormInputs>({
    defaultValues: {
      luc: id || "",
      loja: "",
      cnpj: "",
      tipos_cobertura: [],
      seguradora: "",
      vigencia: undefined,
      vencimento: undefined,
      cobertura: "0",
      responsavel: "",
      observacoes: ""
    }
  });

  const [tiposCobertura, setTiposCobertura] = useState<{label: string, value: string}[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    request<any[]>('/usuarios')
      .then(data => setUsuarios(data || []))
      .catch(() => setUsuarios([{ id: 1, nome: "João Carlos" }, { id: 2, nome: "Ana Silva" }]));
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

    if (!id) return;
    
    const loadData = () => {
      Promise.all([
        getApolice(id),
        getDocumentos(id)
      ])
        .then(([data, docsData]) => {
          setDocumentos(docsData || []);
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
          luc: data.luc || id || "",
          loja: data.lojista || "",
          cnpj: data.cnpj || "",
          tipos_cobertura: (data.tipo || data.segmento || "").split(',').map((s: string) => s.trim()).filter(Boolean),
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
    };

    loadData();
    // Expose loadData to window or just rely on a refetch callback
    // Wait, let's keep it simple by wrapping the inner logic in a function and using it for the callback
    (window as any).__refreshDocs = () => {
      getDocumentos(id).then(docs => setDocumentos(docs || []));
    };

  }, [id, reset]);

  const onSubmit = async (data: PolicyEditFormInputs) => {
    if (!id) return;
    setSaving(true);
    
    // Create a snapshot for optimistic UI rollback
    const snapshot = { ...policyData };

    try {
      const payload = {
        luc: data.luc || id,
        lojista: data.loja,
        loja: data.loja,
        cnpj: data.cnpj,
        tipos_cobertura: data.tipos_cobertura,
        segmento: data.tipos_cobertura.join(', '), // para retrocompatibilidade
        seguradora: data.seguradora,
        vigencia: data.vigencia ? format(data.vigencia, "dd/MM/yyyy") : "",
        vencimento: data.vencimento ? format(data.vencimento, "dd/MM/yyyy") : "",
        cobertura: parseFloat(data.cobertura) || 0,
        responsavel: data.responsavel,
        observacoes: data.observacoes || ""
      };

      // Optimistic UI Update
      setPolicyData({ ...snapshot, ...payload });

      // Parallel/background API call
      await request(`/apolices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      
      toast.success("Apólice atualizada com sucesso!");
      navigate(`/seguros/apolice/${payload.luc}`);
    } catch (err) {
      console.error(err);
      // Revert state on error
      setPolicyData(snapshot);
      toast.error("Não foi possível salvar · Alterações revertidas", {
        action: {
          label: 'Tentar novamente',
          onClick: () => onSubmit(data) // Retry exactly the same submission
        }
      });
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
                      (diasRestantes <= 15 ? 'bg-orange-500 text-white' : 'bg-[#788033] text-white');

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
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
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
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-6">Dados da Apólice</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">LUC</label>
                <Input {...register("luc")} className="dark:bg-[#0a0a0a]" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Loja (Lojista/Fantasia)</label>
                <Input 
                  {...register("loja")}
                  placeholder="Nome da loja" 
                  className="dark:bg-[#0a0a0a]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">CNPJ <span className="text-red-500">*</span></label>
                <Input 
                  {...register("cnpj", { required: true })}
                  placeholder="00.000.000/0000-00"
                  className="dark:bg-[#0a0a0a]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Segmento</label>
                <Controller
                  name="tipos_cobertura"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      options={tiposCobertura}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Selecione o segmento"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora</label>
                <Input 
                  {...register("seguradora")}
                  placeholder="Ex: Porto Seguro"
                  autoComplete="off"
                  className="dark:bg-[#0a0a0a]"
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Início da Vigência</label>
                <Controller
                  name="vigencia"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a data de início"
                      />
                      {field.value && field.value < new Date(new Date().setHours(0,0,0,0)) && (
                        <p className="text-[#c4151f] text-[10px] mt-1 font-medium">Data de vigência está no passado.</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
                <Controller
                  name="vencimento"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a data de vencimento"
                      />
                      {field.value && field.value < new Date(new Date().setHours(0,0,0,0)) && (
                        <p className="text-[#c4151f] text-[10px] mt-1 font-medium">Data de vencimento está no passado.</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor Segurado Base</label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("cobertura", { min: 0 })}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                  placeholder="0.00" 
                  className="dark:bg-[#0a0a0a]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Responsável Interno</label>
                <Input 
                  {...register("responsavel")}
                  placeholder="Nome do responsável" 
                  autoComplete="off"
                  list="usuarios-list"
                  className="dark:bg-[#0a0a0a]"
                />
                <datalist id="usuarios-list">
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nome || u.id} />
                  ))}
                </datalist>
              </div>

            </div>
          </div>

          <DocumentListWithUpload 
            policyId={id!} 
            documentos={documentos} 
            onUploadSuccess={() => getDocumentos(id!).then(docs => setDocumentos(docs || []))}
            onExportApolice={() => {
              exportApoliceParaPDF(policyData, []);
            }}
          />
        </div>

        {/* Side Column (Sticky) */}
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-[#222222] p-6">
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Salvar Alterações</h3>
            <p className="text-xs text-gray-500 dark:text-[#94A3B8] text-center mb-6">
              Certifique-se de que os dados estão corretos antes de salvar.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-[#c4151f] hover:bg-[#a01119] text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Salvar Alterações
              </button>
              
              <button 
                type="button"
                onClick={() => navigate(`/seguros/apolice/${id}`)}
                disabled={saving}
                className="w-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>

              {canEdit && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#222222] mt-2">
                  <DeleteApoliceButton id={id!} />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}
