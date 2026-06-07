import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcuts = [
    {
      category: "Navegação",
      items: [
        { label: "Navegar para Nova Apólice", keys: ["Ctrl", "Shift", "N"] },
        { label: "Voltar para Início (Visão Geral)", keys: ["Alt", "H"] },
        { label: "Aba Visão Geral", keys: ["Ctrl", "1"] },
        { label: "Aba Audit Log", keys: ["Ctrl", "2"] },
        { label: "Aba Gestão de Usuários", keys: ["Ctrl", "3"] },
        { label: "Paginação Tabela: Próxima Pág.", keys: ["L"] },
        { label: "Paginação Tabela: Pág. Anterior", keys: ["J"] },
      ],
    },
    {
      category: "Ações",
      items: [
        { label: "Abrir Command Palette", keys: ["Ctrl", "K"] },
        { label: "Exportar filtro atual", keys: ["Ctrl", "Shift", "E"] },
        { label: "Focar na barra de busca", keys: ["Ctrl", "Shift", "F"] },
        { label: "Ver detalhes da apólice", keys: ["R"] },
        { label: "Editar apólice selecionada", keys: ["E"] },
      ],
    },
    {
      category: "Interface",
      items: [
        { label: "Abrir Tabela em Tela Cheia", keys: ["Alt", "T"] },
        { label: "Toggle Dark Mode", keys: ["Ctrl", "Shift", "D"] },
        { label: "Toggle Modo Apresentação", keys: ["Ctrl", "Shift", "P"] },
        { label: "Fechar modal/drawer/painel aberto", keys: ["Esc"] },
        { label: "Abrir painel de notificações", keys: ["Alt", "N"] },
        { label: "Abrir lista de atalhos", keys: ["Alt", "C"] },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] bg-white dark:bg-[#151515] border-gray-200 dark:border-[#222222]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="bg-gray-100 dark:bg-[#2a2a2a] p-1.5 rounded-md text-gray-500 dark:text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M4 8h16" />
                <path d="M8 8v8" />
              </svg>
            </span>
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                    <div className="flex gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-1 text-xs font-mono font-medium rounded border bg-gray-50 dark:bg-[#0a0a0a] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
