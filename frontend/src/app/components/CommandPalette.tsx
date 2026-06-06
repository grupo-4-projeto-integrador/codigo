import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { LayoutDashboard, ShieldPlus, Bell, FileText, Download, CheckCircle2, RefreshCw, Moon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listApolices } from '../../api/apolice';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentPolicies, setRecentPolicies] = useState<string[]>([]);
  const [apolices, setApolices] = useState<any[]>([]);
  const navigate = useNavigate();

  const renovarMatch = inputValue.toLowerCase().match(/^ren(?:ovar)?\s+(?:ap[oó]lice\s+)?([a-z0-9-]+)$/i);
  const renovarLuc = renovarMatch ? renovarMatch[1].toUpperCase() : null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem('recent_policies');
        if (stored) {
          setRecentPolicies(JSON.parse(stored).slice(0, 5));
        }
      } catch (e) {
        // ignore
      }
      if (apolices.length === 0) {
        listApolices().then(setApolices).catch(console.error);
      }
    }
  }, [open]);

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[4px]"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-[540px] bg-white dark:bg-[#1A1F2E] rounded-xl shadow-2xl border border-gray-100 dark:border-[#2E3447] overflow-hidden flex flex-col z-10"
          >
            <Command 
              label="Global Command Menu" 
              shouldFilter={true}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
            >
              <Command.Input 
                autoFocus
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Digite um comando ou busque (ex: renovar AE-03)..." 
                className="w-full px-4 py-4 text-[14px] bg-transparent border-b border-gray-100 dark:border-[#2E3447] outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-[#64748B]"
              />
            
            <Command.List className="max-h-[360px] overflow-y-auto p-2 scrollbar-hide">
              <Command.Empty className="py-6 text-center text-[13px] text-gray-500 dark:text-[#94A3B8]">
                Nenhum resultado encontrado.
              </Command.Empty>

              <Command.Group heading="Navegar" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2">
                <Command.Item 
                  onSelect={() => handleSelect(() => navigate('/'))}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 opacity-70" />
                  <span>Dashboard</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => navigate('/seguros/apolice/nova'))}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <ShieldPlus className="w-4 h-4 opacity-70" />
                  <span>Nova Apólice</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    window.dispatchEvent(new CustomEvent('abrir-notificacoes'));
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <Bell className="w-4 h-4 opacity-70" />
                  <span>Notificações</span>
                </Command.Item>
              </Command.Group>

              {recentPolicies.length > 0 && (
                <Command.Group heading="Apólices Recentes" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#2E3447]">
                  {recentPolicies.map((luc) => (
                    <Command.Item 
                      key={luc}
                      onSelect={() => handleSelect(() => navigate(`/seguros/apolice/${encodeURIComponent(luc)}`))}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 opacity-70" />
                        <span>Apólice <span className="font-semibold">{luc}</span></span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {apolices.length > 0 && inputValue.length > 0 && (
                <Command.Group heading="Apólices (Pesquisa)" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#2E3447]">
                  {apolices.map((a) => (
                    <Command.Item 
                      key={a.luc}
                      value={`${a.luc} ${a.fantasia || ''} ${a.lojista || ''} ${a.segmento || ''}`}
                      onSelect={() => handleSelect(() => navigate(`/seguros/apolice/${encodeURIComponent(a.luc)}`))}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 opacity-70" />
                        <span className="flex flex-col">
                          <span>Apólice <span className="font-semibold">{a.luc}</span></span>
                          {(a.fantasia || a.lojista) && <span className="text-[10px] text-gray-400 dark:text-[#64748B] capitalize -mt-0.5">{a.fantasia || a.lojista}</span>}
                        </span>
                      </div>
                      {a.segmento && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#242938] text-gray-500 dark:text-[#94A3B8] capitalize">
                          {a.segmento}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {renovarLuc && (
                <Command.Group heading="Comando Inteligente" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#2E3447]">
                  <Command.Item 
                    value={`renovar ${renovarLuc}`}
                    onSelect={() => handleSelect(() => {
                      // Navigate to edit/renew view
                      navigate(`/seguros/apolice/${encodeURIComponent(renovarLuc)}/editar`);
                    })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-white bg-[#9F1239] cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Renovar Apólice <strong>{renovarLuc}</strong></span>
                  </Command.Item>
                </Command.Group>
              )}

              <Command.Group heading="Ações" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#2E3447]">
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    const event = new CustomEvent('exportar-pdf');
                    window.dispatchEvent(event);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <Download className="w-4 h-4 opacity-70" />
                  <span>Exportar filtro atual (PDF)</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    const event = new CustomEvent('marcar-notificacoes-lidas');
                    window.dispatchEvent(event);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 opacity-70" />
                  <span>Marcar notificações como lidas</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    window.dispatchEvent(new CustomEvent('toggle-theme'));
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <Moon className="w-4 h-4 opacity-70" />
                  <span>Alternar Tema (Dark/Light)</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    if (window.location.pathname !== '/seguros' && window.location.pathname !== '/') {
                      navigate('/seguros');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('filtrar-vencidas')), 300);
                    } else {
                      window.dispatchEvent(new CustomEvent('filtrar-vencidas'));
                    }
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-[#A32D2D] dark:text-[#E23B44] cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 opacity-70" />
                  <span>Ver todas apólices vencidas</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
            
            <div className="px-4 py-3 border-t border-gray-100 dark:border-[#2E3447] flex items-center justify-between bg-gray-50 dark:bg-[#1E2435]/50">
              <span className="text-[11px] text-gray-500 dark:text-[#64748B] font-medium">Use as setas para navegar</span>
              <div className="flex gap-2">
                <kbd className="inline-flex items-center gap-1 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-[#94A3B8] shadow-sm">
                  Enter <span className="opacity-70">selecionar</span>
                </kbd>
                <kbd className="inline-flex items-center gap-1 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-[#94A3B8] shadow-sm">
                  Esc <span className="opacity-70">fechar</span>
                </kbd>
              </div>
            </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
