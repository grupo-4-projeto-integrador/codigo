import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  X,
  Download,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2
} from 'lucide-react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from './ui/dropdown-menu';
import {
  getFullscreenTableOpen,
  getFullscreenTableFilter,
  setFullscreenTableOpen,
  setFullscreenTableFilter,
  subscribeFullscreenTable,
  type FullscreenTableFilter,
} from '../store';
import { listApolices } from '../../api/apolice';
import { exportToPDF, exportToXLSX } from '../utils/exportUtils';
import type { ApoliceRecord } from '../../types/apolice';

const FILTER_LABELS: Record<FullscreenTableFilter, string> = {
  all: 'Todas as Apólices',
  conforme: 'Conformes (Ativas)',
  'a-vencer': 'A Vencer',
  vencida: 'Vencidas',
};

const STATUS_CHIP_CLASSES: Record<FullscreenTableFilter, string> = {
  all: 'bg-gray-200 dark:bg-[#222] text-gray-700 dark:text-gray-200',
  conforme: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'a-vencer': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  vencida: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function matchesFilter(policy: ApoliceRecord, filter: FullscreenTableFilter): boolean {
  const status = (policy.status || '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'vencida') return status === 'vencida';
  if (filter === 'a-vencer') return status === 'a vencer';
  if (filter === 'conforme') return status === 'ativa' || status === 'conforme' || status === 'vigente';
  return true;
}

type SortDir = 'asc' | 'desc';

const COLUMNS = [
  { key: 'luc', label: 'LUC', sortable: true },
  { key: 'cnpj', label: 'CNPJ', sortable: true },
  { key: 'lojista', label: 'Loja / Segurado', sortable: true },
  { key: 'segmento', label: 'Segmento', sortable: true, align: 'center' },
  { key: 'seguradora', label: 'Seguradora / Corretor', sortable: true },
  { key: 'vigencia', label: 'Vigência', sortable: true },
  { key: 'vencimento', label: 'Vencimento', sortable: true },
  { key: 'status', label: 'Status', sortable: true, align: 'center' },
  { key: 'cobertura', label: 'Cobertura', sortable: true },
  { key: 'dias_restantes', label: 'Dias Rest.', sortable: true, align: 'center' },
  { key: 'responsavel', label: 'Responsável Interno', sortable: true },
];

const OPTIONAL_COLUMNS = ['cnpj', 'responsavel', 'seguradora', 'vigencia'];

const PAGE_SIZES = [10, 25, 50, 100];

function formatDate(val: any): string {
  if (!val) return '-';
  if (typeof val === 'string' && val.includes('T')) {
    return new Date(val).toLocaleDateString('pt-BR');
  }
  return String(val);
}

function formatCurrency(val: any): string {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  let mapped = s;
  if (s === 'ativa') mapped = 'conforme';

  let cls = 'px-3 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap';
  if (mapped === 'vencida') cls += ' bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  else if (mapped === 'a vencer') cls += ' bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  else cls += ' bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return <span className={cls}>{mapped || '-'}</span>;
}

export function FullscreenTable() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(getFullscreenTableOpen());
  const [filter, setFilter] = useState<FullscreenTableFilter>(getFullscreenTableFilter());
  const [policies, setPolicies] = useState<ApoliceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string>('luc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visible, setVisible] = useState(false);
  const hasFetchedRef = useRef(false);

  // New state variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('flamboyant_table_columns');
    if (saved) return JSON.parse(saved);
    return {
      cnpj: true,
      seguradora: true,
      vigencia: true,
      responsavel: true,
    };
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('flamboyant_table_columns', JSON.stringify(next));
      return next;
    });
  };

  // Subscribe to store
  useEffect(() => {
    const unsub = subscribeFullscreenTable(() => {
      setIsOpen(getFullscreenTableOpen());
      setFilter(getFullscreenTableFilter());
    });
    return unsub;
  }, []);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        setLoading(true);
        listApolices()
          .then(setPolicies)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    } else {
      setVisible(false);
    }
  }, [isOpen]);



  const handleSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return col;
    });
    setPage(1);
  }, []);

  const handleFilterChip = (f: FullscreenTableFilter) => {
    setFilter(f);
    setFullscreenTableFilter(f);
    setPage(1);
    setSelectedIds(new Set());
  };

  const filtered = useMemo(() => {
    return policies.filter(p => {
      if (!matchesFilter(p, filter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesLuc = String(p.luc || p.id || '').toLowerCase().includes(q);
        const matchesLoja = String(p.lojista || (p as any).fantasia || '').toLowerCase().includes(q);
        const matchesSegmento = String(p.segmento || p.tipo || '').toLowerCase().includes(q);
        return matchesLuc || matchesLoja || matchesSegmento;
      }
      return true;
    });
  }, [policies, filter, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = String((a as any)[sortCol] ?? '');
      const bVal = String((b as any)[sortCol] ?? '');
      const cmp = aVal.localeCompare(bVal, 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, sorted.length);
  const paginated = useMemo(() => sorted.slice(startIdx, endIdx), [sorted, startIdx, endIdx]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginated.map(p => p.id || p.luc);
      setSelectedIds(new Set([...selectedIds, ...pageIds]));
    } else {
      const pageIds = new Set(paginated.map(p => p.id || p.luc));
      const next = new Set([...selectedIds].filter(id => !pageIds.has(id)));
      setSelectedIds(next);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isAllPageSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p.id || p.luc));

  // ESC to close and J/K to paginate
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setFullscreenTableOpen(false);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setPage(p => Math.min(totalPages, p + 1));
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setPage(p => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, totalPages]);

  const handleExportPDF = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const isCustom = selectedIds.size > 0;
    const itemsToExport = isCustom ? sorted.filter(p => selectedIds.has(p.id || p.luc)) : sorted;
    const namePrefix = isCustom ? 'selecionadas' : filter;
    exportToPDF(itemsToExport, `apolices-${namePrefix}-${dateStr}.pdf`);
  };

  const handleExportXLSX = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const isCustom = selectedIds.size > 0;
    const itemsToExport = isCustom ? sorted.filter(p => selectedIds.has(p.id || p.luc)) : sorted;
    const namePrefix = isCustom ? 'selecionadas' : filter;
    exportToXLSX(itemsToExport, `apolices-${namePrefix}-${dateStr}.xlsx`);
  };

  const handleRowClick = (policy: ApoliceRecord) => {
    setFullscreenTableOpen(false);
    navigate(`/seguros/apolice/${encodeURIComponent(policy.luc || policy.id)}`);
  };

  if (!isOpen && !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col bg-white/95 dark:bg-[rgba(10,10,15,0.98)]"
      style={{
        transform: visible && isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {FILTER_LABELS[filter]}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white/80">
            {filtered.length} registros
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Colunas
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#111] z-[1000]">
              {OPTIONAL_COLUMNS.map(colKey => {
                const col = COLUMNS.find(c => c.key === colKey);
                if (!col) return null;
                return (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns[col.key]}
                    onCheckedChange={() => toggleColumn(col.key)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#c4151f] hover:bg-[#a01119] text-white transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar XLSX
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#9F1239] hover:bg-[#be123c] text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
          <button
            onClick={() => setFullscreenTableOpen(false)}
            className="ml-2 p-2 rounded-lg text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-gray-100 dark:bg-[#111] border-b border-gray-200 dark:border-white/10 flex-shrink-0 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
              {selectedIds.size} apólice{selectedIds.size === 1 ? '' : 's'} selecionada{selectedIds.size === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {/* Filter chips bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          {(Object.entries(FILTER_LABELS) as [FullscreenTableFilter, string][]).map(([key, label]) => {
            let countColor = '';
            if (key === 'conforme') countColor = 'text-[#639922]';
            else if (key === 'a-vencer') countColor = 'text-[#BA7517]';
            else if (key === 'vencida') countColor = 'text-[#c4151f]';

            return (
              <button
                key={key}
                onClick={() => handleFilterChip(key)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  filter === key
                    ? STATUS_CHIP_CLASSES[key] + ' ring-2 ring-gray-300 dark:ring-white/30'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/70'
                }`}
              >
                {label}
                {filter !== key && (
                  <span className={`ml-1.5 text-[11px] font-semibold ${countColor || 'opacity-60'}`}>
                    {policies.filter(p => matchesFilter(p, key)).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar LUC, loja ou segmento..."
              className="h-8 pl-8 text-[12px] w-[220px] bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-white/20"
            />
          </div>

          <span id="fs-table-shortcuts" className="text-[11px] text-gray-500 dark:text-white/30 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/50 font-mono text-[10px]">Esc</kbd>
            para fechar
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-white/40 text-sm">
            Carregando apólices...
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/30 gap-2">
            <span className="text-4xl">🗂️</span>
            <span className="text-sm">Nenhuma apólice encontrada para este filtro.</span>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead id="fs-table-header" className="sticky top-0 z-10 bg-gray-50 dark:bg-[#0f0f14]">
              <tr>
                <th id="fs-table-checkbox" className="w-10 px-4 py-3 border-b border-gray-200 dark:border-white/10">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300 dark:border-white/30 data-[state=checked]:bg-[#c4151f] data-[state=checked]:border-[#c4151f]"
                  />
                </th>
                {COLUMNS.filter(col => !OPTIONAL_COLUMNS.includes(col.key) || visibleColumns[col.key]).map(col => {
                  const isSorted = sortCol === col.key;
                  return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-white/10 whitespace-nowrap select-none ${col.sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-white/70' : ''} ${isSorted ? 'text-[#c4151f] dark:text-[#E23B44]' : 'text-gray-500 dark:text-white/40'} ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                      {col.label}
                      {col.sortable && (
                        isSorted
                          ? (sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3 text-[#c4151f] dark:text-[#E23B44]" />
                            : <ChevronDown className="w-3 h-3 text-[#c4151f] dark:text-[#E23B44]" />)
                          : <ChevronsUpDown className="w-3 h-3 opacity-30 text-gray-400 dark:text-white" />
                      )}
                    </div>
                  </th>
                )})}
              </tr>
            </thead>
            <tbody>
              {paginated.map((policy, idx) => {
                const isSelected = selectedIds.has(policy.luc || policy.id);
                return (
                <tr
                  key={policy.luc || policy.id || idx}
                  onClick={() => handleRowClick(policy)}
                  className={`border-b hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'border-gray-100 dark:border-white/5'}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(policy.luc || policy.id)}
                      className="border-gray-300 dark:border-white/30 data-[state=checked]:bg-[#c4151f] data-[state=checked]:border-[#c4151f]"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-[#E23B44] group-hover:text-red-600 dark:group-hover:text-red-400">
                    {policy.luc || policy.id || '-'}
                  </td>
                  {visibleColumns.cnpj && (
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono text-gray-500 dark:text-white/50">{policy.cnpj || '—'}</div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-900 dark:text-white/80">{policy.lojista || (policy as any).fantasia || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-white/60 capitalize">{policy.segmento || policy.tipo || '-'}</td>
                  
                  {visibleColumns.seguradora && (
                    <td className="px-4 py-3 text-gray-600 dark:text-white/60">
                      <div>{policy.seguradora || '-'}</div>
                      {policy.corretor && policy.corretor !== 'Corretora Padrão' && policy.corretor !== 'Padrão' && (
                        <div className="text-[10px] text-gray-400 dark:text-white/30">{policy.corretor}</div>
                      )}
                    </td>
                  )}
                  
                  {visibleColumns.vigencia && (
                    <td className="px-4 py-3 text-gray-600 dark:text-white/60">{formatDate(policy.vigencia)}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 dark:text-white/60">{formatDate(policy.vencimento)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={policy.status} /></td>
                  <td className="px-4 py-3 text-gray-900 font-medium dark:text-white/60 dark:font-normal">{formatCurrency(policy.cobertura)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${
                      (policy.dias_restantes ?? 0) < 0 ? 'text-red-600 dark:text-red-400' :
                      (policy.dias_restantes ?? 0) <= 30 ? 'text-orange-600 dark:text-orange-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {policy.dias_restantes !== undefined ? `${policy.dias_restantes}d` : '-'}
                    </span>
                  </td>
                  {visibleColumns.responsavel && (
                    <td className="px-4 py-3 text-gray-500 dark:text-white/50">{policy.responsavel || 'Não atribuído'}</td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-white/10 flex-shrink-0 bg-gray-50 dark:bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500 dark:text-white/40">Linhas por página:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white/70 text-[12px] rounded-lg px-2 py-1 outline-none focus:border-gray-400 dark:focus:border-white/30 cursor-pointer"
          >
            {PAGE_SIZES.map(s => (
              <option key={s} value={s} className="bg-white dark:bg-[#111] text-gray-900 dark:text-white">{s}</option>
            ))}
          </select>
          <span className="text-[11px] text-gray-500 dark:text-white/40">
            Mostrando{' '}
            <span className="text-gray-900 dark:text-white/60 font-medium">{sorted.length === 0 ? 0 : startIdx + 1}–{endIdx}</span>
            {' '}de{' '}
            <span className="text-gray-900 dark:text-white/60 font-medium">{sorted.length}</span>
            {' '}registros
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[11px] font-mono"
          >
            «
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-[12px] text-gray-500 dark:text-white/50">
            Pág. <span className="text-gray-900 dark:text-white/80 font-semibold">{page}</span> / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[11px] font-mono"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
