import React, { useState, useRef, useCallback } from "react";
import { FileText, Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadArquivo } from "../../api/apolice";
import { downloadArquivo as utilDownload } from "../utils/downloadUtils";

interface Documento {
  id: number;
  nome: string;
  data_adicao: string;
}

interface UploadingDoc {
  tempId: string;
  file: File;
  progress: number;
  error: boolean;
}

interface DocumentListWithUploadProps {
  policyId: string;
  documentos: Documento[];
  onUploadSuccess: () => void;
  onExportApolice?: () => void;
}

export function DocumentListWithUpload({ policyId, documentos, onUploadSuccess, onExportApolice }: DocumentListWithUploadProps) {
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadDoc = async (docId: number, nome: string) => {
    if (docId === -1 && onExportApolice) {
      onExportApolice();
      return;
    }
    
    try {
      setIsDownloading(prev => ({ ...prev, [docId]: true }));
      await utilDownload(docId, nome);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível baixar o arquivo");
    } finally {
      setIsDownloading(prev => ({ ...prev, [docId]: false }));
    }
  };
  
  const displayDocs = onExportApolice && !documentos.some(d => d.nome === 'Apolice_Completa.pdf')
    ? [{ id: -1, nome: `apólice_${policyId}.pdf`, data_adicao: new Date().toISOString() }, ...documentos]
    : documentos;

  const startUpload = (file: File) => {
    const tempId = Math.random().toString(36).substring(7);
    
    setUploadingDocs(prev => [...prev, { tempId, file, progress: 0, error: false }]);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadingDocs(prev => prev.map(doc => 
          doc.tempId === tempId ? { ...doc, progress: percent } : doc
        ));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadingDocs(prev => prev.filter(doc => doc.tempId !== tempId));
        onUploadSuccess();
        toast.success(`Upload de ${file.name} concluído`);
      } else {
        setUploadingDocs(prev => prev.map(doc => 
          doc.tempId === tempId ? { ...doc, error: true } : doc
        ));
      }
    });

    xhr.addEventListener("error", () => {
      setUploadingDocs(prev => prev.map(doc => 
        doc.tempId === tempId ? { ...doc, error: true } : doc
      ));
    });

    // We assume backend expects /api/apolices/:id/documentos
    // The base URL can be retrieved from client.ts, but let's construct it.
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    xhr.open("POST", `${apiUrl}/apolices/${policyId}/documentos`);
    
    // Get token if auth is needed
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  };

  const validateAndUpload = (files: FileList | File[]) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    Array.from(files).forEach(file => {
      if (allowedTypes.includes(file.type)) {
        startUpload(file);
      } else {
        toast.error("Formato não suportado: " + file.name);
      }
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files);
    }
  }, [policyId]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files);
    }
    // reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const retryUpload = (doc: UploadingDoc) => {
    setUploadingDocs(prev => prev.filter(d => d.tempId !== doc.tempId));
    startUpload(doc.file);
  };

  return (
    <div className="bg-white dark:bg-[#242938] rounded-xl shadow-sm border border-gray-100 dark:border-[#2E3447] p-6">
      <h3 className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-4">Documentos</h3>
      
      {documentos.length === 0 && uploadingDocs.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">Nenhum documento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Uploading Docs */}
          {uploadingDocs.map(doc => (
            <div key={doc.tempId} className={`relative flex flex-col justify-center p-3 border rounded-lg overflow-hidden ${doc.error ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30' : 'border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1A1F2E]'}`}>
              {/* Progress bar background */}
              {!doc.error && (
                <div 
                  className="absolute bottom-0 left-0 h-[3px] bg-[#c4151f] transition-all duration-300"
                  style={{ width: `${doc.progress}%` }}
                />
              )}
              
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${doc.error ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {doc.error ? <AlertCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium truncate max-w-[150px] ${doc.error ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {doc.file.name}
                    </p>
                    <p className={`text-xs ${doc.error ? 'text-red-600 dark:text-red-500 cursor-pointer hover:underline' : 'text-gray-500'}`} onClick={() => doc.error && retryUpload(doc)}>
                      {doc.error ? "Falha no upload · Tentar novamente" : `Enviando... ${doc.progress}%`}
                    </p>
                  </div>
                </div>
                {!doc.error && (
                  <div className="text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Existing Docs */}
          {displayDocs.map(doc => {
            const displayName = doc.nome === 'Apolice_Completa.pdf' ? `apólice_${policyId}.pdf` : doc.nome;
            return (
            <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-[#2E3447] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#c4151f] dark:group-hover:text-[#E04444] transition-colors truncate max-w-[150px]">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
                    Adicionado em {new Date(doc.data_adicao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleDownloadDoc(doc.id, displayName)}
                disabled={isDownloading[doc.id]}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {isDownloading[doc.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          )})}
        </div>
      )}

      {/* Upload Zone */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-2 rounded-[10px] p-4 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-[#c4151f] bg-[#c4151f]/[0.04]' 
            : 'border-gray-300 dark:border-[#2E3447] hover:bg-gray-50 dark:hover:bg-[#1A1F2E]'
          }`}
        style={{
          borderWidth: '1.5px',
          borderStyle: 'dashed',
          borderColor: isDragActive ? '#c4151f' : 'var(--color-border-secondary)'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={onFileSelect}
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
        />
        <i className="ti ti-cloud-upload" style={{ fontSize: '24px', color: 'var(--color-text-secondary)' }}></i>
        <p className="mt-2 text-gray-500 dark:text-[#94A3B8]" style={{ fontSize: '12px' }}>
          Arraste um PDF ou imagem, ou clique para selecionar
        </p>
      </div>
    </div>
  );
}
