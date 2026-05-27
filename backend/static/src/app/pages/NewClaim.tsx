import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { 
  Building2, 
  Calendar, 
  UploadCloud, 
  AlertCircle, 
  FileText,
  Save,
  X,
  File as FileIcon,
  Trash2
} from "lucide-react";
import { addClaim } from "../store";

type FormValues = {
  store: string;
  type: string;
  severity: "Baixa" | "Média" | "Alta";
  riskClass: string;
  date: string;
  description: string;
};

export function NewClaim() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      severity: "Média"
    }
  });

  const stores = [
    "Loja 101 - Acessórios",
    "Loja 102 - Calçados",
    "Loja 104 - Vestuário",
    "Loja 210 - Eletrônicos",
    "Praça de Alimentação",
    "Estacionamento G1",
    "Banheiros Ala Norte"
  ];

  const types = [
    "Vazamento / Infiltração",
    "Pico de Energia / Elétrico",
    "Incêndio",
    "Dano Físico / Vandalismo",
    "Acidente Pessoal",
    "Roubo / Furto",
    "Desastre Natural"
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormValues) => {
    // Generate mock ID
    const newId = `SIN-00${Math.floor(Math.random() * 900) + 100}`;
    
    addClaim({
      id: newId,
      store: data.store,
      type: data.type,
      severity: data.severity,
      status: "Aberto",
      date: data.date,
      description: data.description,
      files: files.map(f => f.name),
      fraudAlert: false
    });
    
    navigate("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-[#8B1A1A] rounded-lg flex items-center justify-center text-white shadow-sm">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Novo Sinistro</h1>
          <p className="text-sm text-gray-500">Preencha os dados detalhados da ocorrência no complexo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-lg font-semibold text-[#8B1A1A] flex items-center">
              <Building2 className="w-5 h-5 mr-2" /> Dados da Ocorrência
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loja / Local Afetado *
              </label>
              <select 
                {...register("store", { required: "Selecione o local" })}
                className={`w-full border ${errors.store ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2.5 px-3 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] bg-white text-gray-900 text-sm`}
              >
                <option value="">Selecione...</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.store && <p className="mt-1 text-xs text-red-500">{errors.store.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do Evento *
              </label>
              <div className="relative">
                <input 
                  type="date"
                  {...register("date", { required: "Data é obrigatória" })}
                  className={`w-full border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2.5 px-3 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] bg-white text-gray-900 text-sm`}
                />
              </div>
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Ocorrência *
              </label>
              <select 
                {...register("type", { required: "Selecione o tipo" })}
                className={`w-full border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm py-2.5 px-3 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] bg-white text-gray-900 text-sm`}
              >
                <option value="">Selecione...</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classificação de Risco
              </label>
              <select 
                {...register("riskClass")}
                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] bg-white text-gray-900 text-sm"
              >
                <option value="Estrutural">Estrutural</option>
                <option value="Conteúdo">Conteúdo (Mercadorias/Equipamentos)</option>
                <option value="Responsabilidade Civil">Responsabilidade Civil (Terceiros)</option>
                <option value="Lucros Cessantes">Lucros Cessantes</option>
              </select>
            </div>
            
            <div className="md:col-span-2 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Gravidade do Sinistro *
              </label>
              <Controller
                name="severity"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-4">
                    <label className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${field.value === 'Baixa' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" className="sr-only" {...field} value="Baixa" checked={field.value === 'Baixa'} />
                      <div className="w-3 h-3 rounded-full bg-green-500 mb-2"></div>
                      <span className={`text-sm font-medium ${field.value === 'Baixa' ? 'text-green-700' : 'text-gray-700'}`}>Baixa</span>
                    </label>
                    <label className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${field.value === 'Média' ? 'border-yellow-500 bg-yellow-50 ring-1 ring-yellow-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" className="sr-only" {...field} value="Média" checked={field.value === 'Média'} />
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mb-2"></div>
                      <span className={`text-sm font-medium ${field.value === 'Média' ? 'text-yellow-700' : 'text-gray-700'}`}>Média</span>
                    </label>
                    <label className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${field.value === 'Alta' ? 'border-[#D93030] bg-red-50 ring-1 ring-[#D93030]' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" className="sr-only" {...field} value="Alta" checked={field.value === 'Alta'} />
                      <div className="w-3 h-3 rounded-full bg-[#D93030] mb-2"></div>
                      <span className={`text-sm font-medium ${field.value === 'Alta' ? 'text-[#D93030]' : 'text-gray-700'}`}>Alta</span>
                    </label>
                  </div>
                )}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada do Evento *
              </label>
              <textarea 
                {...register("description", { required: "Descrição é obrigatória", minLength: 10 })}
                rows={5}
                placeholder="Descreva o que ocorreu, horários estimados, pessoas envolvidas e primeiras providências tomadas..."
                className={`w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm p-3 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] bg-white text-gray-900 text-sm`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-500">Forneça uma descrição detalhada (min 10 caracteres)</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-lg font-semibold text-[#8B1A1A] flex items-center">
              <UploadCloud className="w-5 h-5 mr-2" /> Evidências e Documentos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Anexe fotos do local, vídeos de segurança, BO ou laudos preliminares.</p>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging ? 'border-[#8B1A1A] bg-red-50/50' : 'border-gray-300 hover:bg-gray-50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Arraste arquivos ou clique para selecionar
            </p>
            <p className="text-xs text-gray-500 mb-4">
              JPG, PNG, PDF ou MP4 (Máx. 50MB)
            </p>
            <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              Selecionar Arquivos
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Arquivos Anexados ({files.length})</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileIcon className="w-5 h-5 text-[#8B1A1A] flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-6 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-[#8B1A1A] hover:bg-[#a43030] shadow-sm flex items-center transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Registro
          </button>
        </div>
      </form>
    </div>
  );
}
