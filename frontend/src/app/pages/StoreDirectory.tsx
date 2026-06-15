import { useState } from "react";
import { Search, Store, Phone, Mail, FileText, AlertCircle, CheckCircle2, XCircle, ChevronRight, X } from "lucide-react";

// Mock Data
const stores = [
  { id: 1, name: "Zara", category: "Vestuário", piso: "L2", cnpj: "12.345.678/0001-90", policyActive: true, contact: "Carlos Mendes", phone: "(11) 98765-4321", email: "gerencia.zara@jpmall.com.br", claimsCount: 3 },
  { id: 2, name: "Starbucks", category: "Alimentação", piso: "L1", cnpj: "98.765.432/0001-10", policyActive: true, contact: "Mariana Silva", phone: "(11) 91234-5678", email: "loja.starbucks@jpmall.com.br", claimsCount: 1 },
  { id: 3, name: "Renner", category: "Vestuário", piso: "L2", cnpj: "45.678.123/0001-45", policyActive: false, contact: "Roberto Costa", phone: "(11) 97777-8888", email: "renner.jpmall@lojas.com.br", claimsCount: 0 },
  { id: 4, name: "Centauro", category: "Esportes", piso: "L3", cnpj: "78.910.111/0001-22", policyActive: true, contact: "Ana Paula", phone: "(11) 96666-5555", email: "gerente@centauro.com.br", claimsCount: 2 },
  { id: 5, name: "Fast Shop", category: "Eletrônicos", piso: "L1", cnpj: "33.444.555/0001-66", policyActive: true, contact: "Julio Nogueira", phone: "(11) 95555-4444", email: "julio.n@fastshop.com.br", claimsCount: 4 },
  { id: 6, name: "Outback", category: "Alimentação", piso: "L3", cnpj: "22.333.444/0001-55", policyActive: false, contact: "Fernanda Lima", phone: "(11) 94444-3333", email: "gerencia.outback@jpmall.com.br", claimsCount: 5 },
  { id: 7, name: "Vivara", category: "Acessórios", piso: "L1", cnpj: "11.222.333/0001-44", policyActive: true, contact: "Ricardo Alves", phone: "(11) 93333-2222", email: "loja.vivara@jpmall.com.br", claimsCount: 0 },
  { id: 8, name: "Riachuelo", category: "Vestuário", piso: "L2", cnpj: "55.666.777/0001-88", policyActive: true, contact: "Camila Barros", phone: "(11) 92222-1111", email: "camila@riachuelo.com.br", claimsCount: 1 },
];

export function StoreDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<typeof stores[0] | null>(null);

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.cnpj.includes(searchTerm)
  );

  return (
    <div className="relative h-full flex flex-col space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#8B1A1A]">Lojistas</h1>
          <p className="text-gray-600 mt-1">Diretório e consulta rápida de apólices e histórico.</p>
        </div>
        
        <div className="w-full md:w-96 relative shadow-sm rounded-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por Nome da Loja ou CNPJ..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#E8DCCB] rounded-xl focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent outline-none transition-all text-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
        {filteredStores?.map((store) => (
          <div 
            key={store.id} 
            className="bg-[#FAF7F2] border border-[#E8DCCB] rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-[#E8DCCB] text-[#8B1A1A]">
                <Store className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${store.policyActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {store.policyActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {store.policyActive ? 'Apólice Ativa' : 'Irregular'}
              </div>
            </div>
            
            <div className="mb-4 flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{store.name}</h3>
              <div className="flex items-center text-sm text-gray-500 gap-2">
                <span>{store.category}</span>
                <span>•</span>
                <span>Piso {store.piso}</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedStore(store)}
              className="mt-auto flex items-center justify-between w-full py-2.5 px-4 bg-white border border-[#E8DCCB] rounded-xl text-[#8B1A1A] font-medium hover:bg-[#8B1A1A] hover:text-white transition-colors group-hover:border-[#8B1A1A]"
            >
              Ver Detalhes
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        ))}
      </div>

      {/* Side Drawer Overlay */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={() => setSelectedStore(null)} />
      )}

      {/* Side Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#FAF7F2] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-[#E8DCCB] flex flex-col ${selectedStore ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedStore && (
          <>
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#E8DCCB] bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FAF7F2] rounded-xl flex items-center justify-center border border-[#E8DCCB] text-[#8B1A1A]">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedStore.name}</h2>
                  <p className="text-sm text-gray-500">{selectedStore.category} • Piso {selectedStore.piso}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStore(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${selectedStore.policyActive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                {selectedStore.policyActive ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-semibold ${selectedStore.policyActive ? 'text-emerald-800' : 'text-red-800'}`}>
                    {selectedStore.policyActive ? 'Apólice de Seguro Regular' : 'Atenção: Apólice Vencida ou Inexistente'}
                  </h3>
                  <p className={`text-sm mt-1 ${selectedStore.policyActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedStore.policyActive 
                      ? 'O lojista está em conformidade com as exigências contratuais do JP Mall.' 
                      : 'É necessário notificar o lojista para regularização imediata do seguro.'}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-xl border border-[#E8DCCB] p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">Informações de Contato</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">CNPJ</span>
                    <span className="text-gray-800 font-medium">{selectedStore.cnpj}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Telefone / WhatsApp</span>
                      <span className="text-gray-800 font-medium">{selectedStore.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">E-mail do Responsável</span>
                      <span className="text-gray-800 font-medium">{selectedStore.email}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Responsável Local</span>
                    <span className="text-gray-800 font-medium">{selectedStore.contact}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl border border-[#E8DCCB] p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">Documentos Anexados</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#8B1A1A]" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Contrato de Locação.pdf</p>
                        <p className="text-xs text-gray-500">Adicionado em 12/05/2022</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#8B1A1A]" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Apólice_Seguro_2023.pdf</p>
                        <p className="text-xs text-gray-500">Adicionado em {selectedStore.policyActive ? '15/01/2023' : 'Vencido em 10/10/2023'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick History */}
              <div className="bg-white rounded-xl border border-[#E8DCCB] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider">Histórico de Sinistros</h3>
                  <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                    {selectedStore.claimsCount} Registro(s)
                  </span>
                </div>
                
                {selectedStore.claimsCount > 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: Math.min(2, selectedStore.claimsCount) })?.map((_, i) => (
                      <div key={i} className="flex gap-4 p-3 rounded-lg border border-gray-100">
                        <div className="w-1.5 h-auto bg-[#D93030] rounded-full" />
                        <div>
                          <p className="text-sm font-semibold text-[#8B1A1A]">SIN-2023-08{90 - i}</p>
                          <p className="text-sm text-gray-600 mt-1">Vazamento interno afetando corredor L2.</p>
                          <p className="text-xs text-gray-400 mt-2">Ocorrido há {i + 2} meses</p>
                        </div>
                      </div>
                    ))}
                    {selectedStore.claimsCount > 2 && (
                      <button className="w-full py-2 text-sm text-[#8B1A1A] font-medium hover:underline text-center">
                        Ver todo o histórico
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum sinistro registrado para esta loja.</p>
                  </div>
                )}
              </div>

            </div>
            
            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[#E8DCCB] bg-white">
              <button className="w-full bg-[#8B1A1A] text-white py-3 rounded-xl font-medium hover:bg-[#701515] transition-colors shadow-sm">
                Notificar Lojista
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}