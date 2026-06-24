import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { LayoutDashboard, ShieldPlus, Bell, FileText, Download, CheckCircle2, RefreshCw, Moon, AlertTriangle, Filter, Eye, Trash2, Edit, Table2, Share2 as TopologyStar3, Clapperboard, Tv2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from './ui/use-mobile';
import { searchApolices, deleteApolice, listApolices } from '../../api/apolice';
import { toast } from 'sonner';

import {
  setFullscreenTableOpen,
  setFullscreenTableFilter,
  getFullscreenTableFilter,
  subscribeFullscreenTable
} from '../store';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentPolicies, setRecentPolicies] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [deleteConfirmLuc, setDeleteConfirmLuc] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Pre-load policies for counts
  useEffect(() => {
    listApolices().then(setAllPolicies).catch(() => {});
  }, []);

  const counts = useMemo(() => ({
    all: allPolicies.length,
    vencida: allPolicies.filter(p => (p.status || '').toLowerCase() === 'vencida').length,
    'a-vencer': allPolicies.filter(p => (p.status || '').toLowerCase() === 'a vencer').length,
    conforme: allPolicies.filter(p => ['ativa','conforme','vigente'].includes((p.status || '').toLowerCase())).length,
  }), [allPolicies]);

  const renovarMatch = inputValue.toLowerCase().match(/^ren(?:ovar)?\s+(?:ap[oó]lice\s+)?([a-z0-9-]+)$/i);
  const renovarLuc = renovarMatch ? renovarMatch[1].toUpperCase() : null;

  const excluirMatch = inputValue.toLowerCase().match(/^exc(?:luir)?\s+(?:ap[oó]lice\s+)?([a-z0-9-]+)$/i);
  const excluirLuc = excluirMatch ? excluirMatch[1].toUpperCase() : null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    const handleCustomOpen = () => setOpen(true);
    const handleCustomClose = () => setOpen(false);
    
    document.addEventListener('keydown', down, { capture: true });
    window.addEventListener('open-command-palette', handleCustomOpen);
    window.addEventListener('close-command-palette', handleCustomClose);
    
    return () => {
      document.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('open-command-palette', handleCustomOpen);
      window.removeEventListener('close-command-palette', handleCustomClose);
    };
  }, []);

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem('recent_policies');
        if (stored) {
          setRecentPolicies(JSON.parse(stored).slice(0, 3));
        }
      } catch (e) {
        // ignore
      }
    } else {
      setInputValue('');
      setSearchResults([]);
      setDeleteConfirmLuc(null);
    }
  }, [open]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchApolices(inputValue.trim())
        .then(setSearchResults)
        .catch(console.error);
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[9999] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4 sm:p-6'}`}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[4px]"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={isMobile ? { y: 0, opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative w-full bg-white dark:bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col z-10 ${
              isMobile
                ? 'h-[85vh] rounded-t-2xl border-t border-gray-100 dark:border-[#222222]'
                : 'max-w-[540px] rounded-xl border border-gray-100 dark:border-[#222222]'
            }`}
          >
            {deleteConfirmLuc ? (
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir Apólice</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Tem certeza que deseja excluir a apólice <strong>{deleteConfirmLuc}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmLuc(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#22] dark:hover:bg-[#33] text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      const luc = deleteConfirmLuc;
                      try {
                        await deleteApolice(luc);
                        toast.success(`Apólice ${luc} excluída com sucesso.`);
                        if (window.location.pathname.includes(luc)) {
                          navigate('/seguros');
                          setTimeout(() => window.dispatchEvent(new CustomEvent('refresh-policies')), 100);
                        } else {
                          window.dispatchEvent(new CustomEvent('refresh-policies'));
                          window.dispatchEvent(new CustomEvent('go-visao-geral'));
                        }
                      } catch (e) {
                        toast.error(`Erro ao excluir a apólice ${luc}.`);
                      } finally {
                        setDeleteConfirmLuc(null);
                        setOpen(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Sim, excluir
                  </button>
                </div>
              </div>
            ) : (
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
                inputMode="search"
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Digite um comando ou busque (ex: renovar AE-03)..." 
                className="w-full px-4 py-4 text-[14px] bg-transparent border-b border-gray-100 dark:border-[#222222] outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-[#64748B]"
              />
            
            <Command.List className={`${isMobile ? 'flex-1 max-h-none' : 'max-h-[360px]'} overflow-y-auto p-2 scrollbar-hide`}>
              <Command.Empty className="py-6 text-center text-[13px] text-gray-500 dark:text-[#94A3B8]">
                Nenhum resultado encontrado.
              </Command.Empty>

              <Command.Group heading="Navegar" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2">
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('go-visao-geral')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 opacity-70" />
                  <span>Ir para Visão Geral</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-audit-log')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <FileText className="w-4 h-4 opacity-70" />
                  <span>Ir para Audit Log</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('go-visao-geral')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 opacity-70" />
                  <span>Ir para Tabela com todas as apólices</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => navigate('/seguros/apolice/nova'))}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <ShieldPlus className="w-4 h-4 opacity-70" />
                  <span>Ir para Nova Apólice</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => {
                    navigate('/graph');
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <TopologyStar3 className="w-4 h-4 opacity-70" />
                  <span>Graph View · Visualização por segmento</span>
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

              <Command.Group heading="Tabela em Tela Cheia" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                <Command.Item
                  onSelect={() => handleSelect(() => { 
                    if (isMobile) {
                      navigate('/seguros/tabela?filter=Todas');
                    } else {
                      setFullscreenTableFilter('all'); setFullscreenTableOpen(true); 
                    }
                  })}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 opacity-70" />
                    <span>Tabela Completa · Todas as apólices</span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-[#64748B]">{counts.all} registros</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => { 
                    if (isMobile) {
                      navigate('/seguros/tabela?filter=Vencidas');
                    } else {
                      setFullscreenTableFilter('vencida'); setFullscreenTableOpen(true); 
                    }
                  })}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-[#A32D2D] dark:text-[#E23B44] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 opacity-70" />
                    <span>Tabela Completa · Vencidas</span>
                  </div>
                  <span className="text-[10px] text-red-400/70">{counts.vencida} vencidas</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => { 
                    if (isMobile) {
                      navigate('/seguros/tabela?filter=A%20Vencer');
                    } else {
                      setFullscreenTableFilter('a-vencer'); setFullscreenTableOpen(true); 
                    }
                  })}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-orange-600 dark:text-orange-400 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 opacity-70" />
                    <span>Tabela Completa · A Vencer</span>
                  </div>
                  <span className="text-[10px] text-orange-400/70">{counts['a-vencer']} a vencer</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => { 
                    if (isMobile) {
                      navigate('/seguros/tabela?filter=Conformes');
                    } else {
                      setFullscreenTableFilter('conforme'); setFullscreenTableOpen(true); 
                    }
                  })}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-green-600 dark:text-green-400 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 opacity-70" />
                    <span>Tabela Completa · Conformes</span>
                  </div>
                  <span className="text-[10px] text-green-400/70">{counts.conforme} conformes</span>
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Filtros rápidos" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('filtrar-vencidas')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-[#A32D2D] dark:text-[#E23B44] cursor-pointer"
                >
                  <Filter className="w-4 h-4 opacity-70" />
                  <span>Ver apenas vencidas</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('filtrar-a-vencer')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-orange-600 dark:text-orange-400 cursor-pointer"
                >
                  <Filter className="w-4 h-4 opacity-70" />
                  <span>Ver apenas a vencer</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('filtrar-conformes')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-green-600 dark:text-green-400 cursor-pointer"
                >
                  <Filter className="w-4 h-4 opacity-70" />
                  <span>Ver apenas conformes</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => handleSelect(() => {
                    navigate('/seguros');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('filtrar-todas')), 100);
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <Filter className="w-4 h-4 opacity-70" />
                  <span>Limpar todos os filtros</span>
                </Command.Item>
              </Command.Group>

              {recentPolicies.length > 0 && (
                <Command.Group heading="Apólices Recentes" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
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

              {searchResults.length > 0 && inputValue.length > 0 && (
                <Command.Group heading="Apólices (Pesquisa)" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                  {searchResults.map((a) => (
                    <Command.Item 
                      key={a.luc}
                      value={`${a.luc} ${a.fantasia || ''} ${a.lojista || ''} ${a.segmento || ''} ${a.cnpj || ''}`}
                      onSelect={() => handleSelect(() => navigate(`/seguros/apolice/${encodeURIComponent(a.luc)}`))}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 opacity-70" />
                        <span className="flex flex-col">
                          <span>Apólice <span className="font-semibold">{a.luc}</span></span>
                          {(a.fantasia || a.lojista || a.cnpj) && <span className="text-[10px] text-gray-400 dark:text-[#64748B] capitalize -mt-0.5">{a.fantasia || a.lojista} {a.cnpj ? `· ${a.cnpj}` : ''}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.dias_restantes !== undefined && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                            a.dias_restantes < 0 ? 'bg-[#A32D2D]/10 text-[#A32D2D] dark:bg-[#E23B44]/10 dark:text-[#E23B44]' :
                            a.dias_restantes <= 30 ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                            'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                          }`}>
                            {a.dias_restantes < 0 ? 'Vencida' : a.dias_restantes <= 30 ? 'A Vencer' : 'Vigente'}
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {renovarLuc && (
                <Command.Group heading="Comando Inteligente" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                  <Command.Item 
                    value={`renovar ${renovarLuc}`}
                    onSelect={() => handleSelect(() => {
                      if (window.location.pathname !== '/seguros') {
                        navigate('/seguros');
                        setTimeout(() => window.dispatchEvent(new CustomEvent('open-renew-dialog', { detail: renovarLuc })), 100);
                      } else {
                        window.dispatchEvent(new CustomEvent('open-renew-dialog', { detail: renovarLuc }));
                      }
                    })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-white bg-[#9F1239] cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Renovar Apólice <strong>{renovarLuc}</strong></span>
                  </Command.Item>
                </Command.Group>
              )}

              {excluirLuc && (
                <Command.Group heading="Comando Inteligente" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                  <Command.Item 
                    value={`excluir ${excluirLuc}`}
                    onSelect={() => setDeleteConfirmLuc(excluirLuc)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-white bg-[#A32D2D] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Apólice <strong>{excluirLuc}</strong></span>
                  </Command.Item>
                </Command.Group>
              )}

              {window.location.pathname.startsWith('/seguros/apolice/') && window.location.pathname.split('/').length >= 4 && window.location.pathname.split('/')[3] !== 'nova' && (
                <Command.Group heading="Apólice atual" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
                  <Command.Item 
                    onSelect={() => handleSelect(() => {
                      const luc = decodeURIComponent(window.location.pathname.split('/')[3]);
                      if (window.location.pathname !== '/seguros') {
                        navigate('/seguros');
                        setTimeout(() => window.dispatchEvent(new CustomEvent('open-renew-dialog', { detail: luc })), 100);
                      } else {
                        window.dispatchEvent(new CustomEvent('open-renew-dialog', { detail: luc }));
                      }
                    })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 opacity-70" />
                    <span>Renovar {decodeURIComponent(window.location.pathname.split('/')[3])}</span>
                  </Command.Item>
                  <Command.Item 
                    onSelect={() => handleSelect(() => navigate(`/seguros/apolice/${window.location.pathname.split('/')[3]}/editar`))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <Edit className="w-4 h-4 opacity-70" />
                    <span>Editar {decodeURIComponent(window.location.pathname.split('/')[3])}</span>
                  </Command.Item>
                  <Command.Item 
                    onSelect={() => handleSelect(() => navigate(`/seguros/apolice/${window.location.pathname.split('/')[3]}`))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 opacity-70" />
                    <span>Ver apólice completa</span>
                  </Command.Item>
                  <Command.Item 
                    onSelect={() => handleSelect(() => window.dispatchEvent(new CustomEvent('exportar-pdf')))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <Download className="w-4 h-4 opacity-70" />
                    <span>Exportar PDF desta apólice</span>
                  </Command.Item>
                  <Command.Item 
                    onSelect={() => {
                      const luc = decodeURIComponent(window.location.pathname.split('/')[3]);
                      setDeleteConfirmLuc(luc);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-[#A32D2D] dark:text-[#E23B44] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 opacity-70" />
                    <span>Excluir {decodeURIComponent(window.location.pathname.split('/')[3])}</span>
                  </Command.Item>
                </Command.Group>
              )}



              <Command.Group heading="Ações / Tema" className="text-[11px] font-medium text-gray-500 dark:text-[#64748B] uppercase tracking-wider px-2 py-2 mt-1 border-t border-gray-100 dark:border-[#222222]">
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
                    window.dispatchEvent(new CustomEvent('toggle-presentation-mode'));
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 opacity-70" />
                  <span>Entrar no Modo Apresentação</span>
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
              </Command.Group>
            </Command.List>
            
            <div className="px-4 py-3 border-t border-gray-100 dark:border-[#222222] flex items-center justify-between bg-gray-50 dark:bg-[#1E2435]/50">
              <span className="text-[11px] text-gray-500 dark:text-[#64748B] font-medium">Use as setas para navegar</span>
              <div className="flex gap-2">
                <kbd className="inline-flex items-center gap-1 bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-[#94A3B8] shadow-sm">
                  Enter <span className="opacity-70">selecionar</span>
                </kbd>
                <kbd className="inline-flex items-center gap-1 bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-[#94A3B8] shadow-sm">
                  Esc <span className="opacity-70">fechar</span>
                </kbd>
              </div>
            </div>
            </Command>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
