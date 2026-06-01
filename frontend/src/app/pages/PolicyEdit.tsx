import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { 
  ChevronRight, 
  ArrowLeft, 
  Shield, 
  FileText, 
  Download, 
  Clock, 
  Save, 
  X, 
  AlertTriangle,
  CalendarIcon
} from "lucide-react";
import { getApolice } from "../../api/apolice";
import { request } from "../../api/client";
import type { ApoliceRecord } from "../../types/apolice";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Button } from "../components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import joaoCarlosImg from "../../assets/joao-carlos.jpg";
import { formatLargeCurrency } from "../utils/currency";

export function PolicyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyData, setPolicyData] = useState<any>({});

  const [loja, setLoja] = useState("");
  const [segmento, setSegmento] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [vigencia, setVigencia] = useState<Date | undefined>(undefined);
  const [vencimento, setVencimento] = useState<Date | undefined>(undefined);
  const [vigenciaOpen, setVigenciaOpen] = useState(false);
  const [vencimentoOpen, setVencimentoOpen] = useState(false);
  const [cobertura, setCobertura] = useState<string>("0");
  const [responsavel, setResponsavel] = useState("");

  useEffect(() => {
    if (!id) return;
    
    getApolice(id)
      .then((data) => {
        setPolicyData(data);
        setLoja(data.lojista || "");
        setSegmento(data.tipo || "");
        setSeguradora(data.seguradora || "");
        
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

        if (data.vigencia) setVigencia(parseDateSafe(data.vigencia));
        if (data.vencimento) setVencimento(parseDateSafe(data.vencimento));
        
        setCobertura(data.cobertura?.toString() || "0");
        setResponsavel(data.responsavel || "");
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error("Erro ao carregar os dados da apólice");
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    
    try {
      const payload = {
        luc: id,
        loja,
        segmento,
        seguradora,
        vigencia: vigencia ? format(vigencia, "dd/MM/yyyy") : "",
        vencimento: vencimento ? format(vencimento, "dd/MM/yyyy") : "",
        cobertura: parseFloat(cobertura) || 0,
        observacoes: policyData.observacoes || ""
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
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#94A3B8] mb-6">
        <button onClick={() => navigate('/seguros')} className="hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Seguros
        </button>
        <ChevronRight className="w-4 h-4" />
        <button onClick={() => navigate(`/seguros/apolice/${id}`)} className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Apólice {id}
        </button>
        <ChevronRight className="w-4 h-4" />
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
                  value={loja} 
                  onChange={(e) => setLoja(e.target.value)} 
                  placeholder="Nome da loja" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Segmento / Tipo</label>
                <Select value={segmento} onValueChange={setSegmento}>
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
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Seguradora</label>
                <Select value={seguradora} onValueChange={setSeguradora}>
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
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Início da Vigência</label>
                <Popover open={vigenciaOpen} onOpenChange={setVigenciaOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal dark:bg-[#1A1F2E] ${!vigencia ? "text-muted-foreground" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {vigencia ? format(vigencia, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={vigencia}
                      onSelect={(date) => {
                        setVigencia(date);
                        setVigenciaOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
                <Popover open={vencimentoOpen} onOpenChange={setVencimentoOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal dark:bg-[#1A1F2E] ${!vencimento ? "text-muted-foreground" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {vencimento ? format(vencimento, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={vencimento}
                      onSelect={(date) => {
                        setVencimento(date);
                        setVencimentoOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor Segurado Base</label>
                <Input 
                  type="number"
                  value={cobertura} 
                  onChange={(e) => setCobertura(e.target.value)} 
                  placeholder="0.00" 
                  className="dark:bg-[#1A1F2E]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Responsável Interno</label>
                <Input 
                  value={responsavel} 
                  onChange={(e) => setResponsavel(e.target.value)} 
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
                onClick={handleSave}
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
    </div>
  );
}
