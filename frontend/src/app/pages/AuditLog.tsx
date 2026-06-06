import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Edit3,
  Trash2,
  RotateCcw,
  Download,
  LogIn,
  Upload,
  ExternalLink,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { listAuditLogs, type AuditLog, type AuditFilter } from "../../api/audit";
import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { DatePicker } from "../components/ui/date-picker";

/* ─── Helpers ───────────────────────────────────────────────── */

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(d);
}

const ACAO_META: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  criar:             { label: "Criar",           icon: FileText,   color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  editar:            { label: "Editar",          icon: Edit3,      color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  renovar:           { label: "Renovar",         icon: RotateCcw,  color: "#a0191e", bg: "rgba(160,25,30,0.1)" },
  excluir:           { label: "Excluir",         icon: Trash2,     color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  exportar:          { label: "Exportar",        icon: Download,   color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  login:             { label: "Login",           icon: LogIn,      color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  upload_documento:  { label: "Upload Doc",      icon: Upload,     color: "#10b981", bg: "rgba(16,185,129,0.1)" },
};

const ACOES = ["", "criar", "editar", "renovar", "excluir", "exportar", "login", "upload_documento"];
const ENTIDADES = ["", "apolice", "documento", "usuario", "sistema"];

function AcaoBadge({ acao }: { acao: string }) {
  const meta = ACAO_META[acao] ?? { label: acao, icon: AlertCircle, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

/* ─── Payload Diff Viewer ───────────────────────────────────── */
function PayloadDiff({ anterior, novo }: { anterior: string | null; novo: string | null }) {
  if (!anterior && !novo) return <span className="text-gray-400 text-[11px] italic">sem payload</span>;

  const parse = (s: string | null) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return s; }
  };

  const a = parse(anterior);
  const n = parse(novo);

  return (
    <div className="flex gap-2 text-[11px] font-mono max-w-full overflow-hidden">
      {a !== null && (
        <div className="flex-1 min-w-0 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-2 overflow-auto max-h-32 text-red-700 dark:text-red-300">
          <div className="text-[9px] font-sans uppercase tracking-wider mb-1 opacity-60">antes</div>
          <pre className="whitespace-pre-wrap break-all">{typeof a === "string" ? a : JSON.stringify(a, null, 2)}</pre>
        </div>
      )}
      {n !== null && (
        <div className="flex-1 min-w-0 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-2 overflow-auto max-h-32 text-green-700 dark:text-green-300">
          <div className="text-[9px] font-sans uppercase tracking-wider mb-1 opacity-60">depois</div>
          <pre className="whitespace-pre-wrap break-all">{typeof n === "string" ? n : JSON.stringify(n, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/* ─── Row Detail Drawer ─────────────────────────────────────── */
function LogDetailDrawer({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg md:w-[480px] bg-white dark:bg-[#1A1F2E] h-full shadow-2xl flex flex-col border-l border-[#a0191e]/20"
        style={{ boxShadow: `-20px 0 60px rgba(62, 0, 0, 0.12)` }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#2E3447]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#a0191e]" />
            <span className="font-bold text-gray-900 dark:text-white text-[15px]">Detalhes do Registro</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#a0191e]/10 text-gray-400 hover:text-[#a0191e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "ID", value: `#${log.id}` },
            { label: "Usuário", value: log.user_id },
            { label: "Entidade", value: log.entidade },
            { label: "ID Entidade", value: log.entidade_id || "—" },
            { label: "IP", value: log.ip || "—" },
            { label: "Timestamp", value: formatTimestamp(log.timestamp) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-[#242938] rounded-lg p-3">
              <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] mb-1">{label}</div>
              <div className="text-[13px] font-medium text-gray-900 dark:text-white break-all">{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-[#242938] rounded-lg p-3">
          <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] mb-2">Ação</div>
          <AcaoBadge acao={log.acao} />
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] mb-2">Payload (diff)</div>
          <PayloadDiff anterior={log.payload_anterior} novo={log.payload_novo} />
        </div>

        {log.user_agent && (
          <div className="bg-gray-50 dark:bg-[#242938] rounded-lg p-3 border border-gray-100 dark:border-[#2E3447]">
            <div className="text-[9px] uppercase tracking-wider text-[#a0191e]/70 dark:text-[#E04444]/70 mb-1 font-bold">User Agent</div>
            <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] break-all">{log.user_agent}</div>
          </div>
        )}
      </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export function AuditLog({ isTab = false }: { isTab?: boolean }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [filter, setFilter] = useState<AuditFilter>({
    acao: "",
    entidade: "",
    entidade_id: "",
    user_id: "",
    de: "",
    ate: "",
    page: 1,
    limit: 50,
  });
  const [search, setSearch] = useState("");

  const LIMIT = 50;
  const totalPages = Math.ceil(total / LIMIT);

  const load = useCallback(async (f: AuditFilter) => {
    setLoading(true);
    setError(null);
    try {
      const clean: AuditFilter = {};
      if (f.acao) clean.acao = f.acao;
      if (f.entidade) clean.entidade = f.entidade;
      if (f.entidade_id) clean.entidade_id = f.entidade_id;
      if (f.user_id) clean.user_id = f.user_id;
      if (f.de) clean.de = f.de;
      if (f.ate) clean.ate = f.ate;
      clean.page = f.page ?? 1;
      clean.limit = LIMIT;

      const resp = await listAuditLogs(clean);
      setLogs(resp.data ?? []);
      setTotal(resp.total ?? 0);
    } catch {
      setError("Não foi possível carregar o audit log. Verifique se o servidor está rodando.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, []);  // eslint-disable-line

  const applyFilter = (partial: Partial<AuditFilter>) => {
    const next = { ...filter, ...partial, page: 1 };
    setFilter(next);
    load(next);
  };

  const setPage = (p: number) => {
    const next = { ...filter, page: p };
    setFilter(next);
    load(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter({ entidade_id: search });
  };

  const clearFilters = () => {
    setSearch("");
    const reset: AuditFilter = { page: 1, limit: LIMIT };
    setFilter(reset);
    load(reset);
  };

  const hasFilters = !!(filter.acao || filter.entidade || filter.entidade_id || filter.user_id || filter.de || filter.ate);

  return (
    <div className={`max-w-[1400px] mx-auto flex flex-col gap-6 pb-8 ${isTab ? '' : 'pt-0'}`}>

      {/* Header */}
      {!isTab && (
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a0191e]/10 dark:bg-[#E04444]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#a0191e] dark:text-[#E04444]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
            <p className="text-sm text-gray-500 dark:text-[#94A3B8]">
              Registro imutável de todas as ações do sistema · {total.toLocaleString("pt-BR")} eventos
            </p>
          </div>
        </div>
        <button
          onClick={() => load(filter)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-[#242938] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#242938] rounded-xl border border-gray-100 dark:border-[#2E3447] p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Ação */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" /> Ação
            </label>
            <Select
              value={filter.acao || "todas"}
              onValueChange={v => applyFilter({ acao: v === "todas" ? "" : v })}
            >
              <SelectTrigger className="h-9 w-[160px] border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-[13px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-white dark:bg-[#242938]">
                <SelectItem value="todas" className="text-[13px]">Todas</SelectItem>
                {ACOES.filter(Boolean).map(a => (
                  <SelectItem key={a} value={a} className="text-[13px]">{ACAO_META[a]?.label ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entidade */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-medium">Entidade</label>
            <Select
              value={filter.entidade || "todas"}
              onValueChange={v => applyFilter({ entidade: v === "todas" ? "" : v })}
            >
              <SelectTrigger className="h-9 w-[160px] border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-white text-[13px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-white dark:bg-[#242938]">
                <SelectItem value="todas" className="text-[13px]">Todas</SelectItem>
                {ENTIDADES.filter(Boolean).map(e => (
                  <SelectItem key={e} value={e} className="text-[13px] capitalize">{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* De */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-medium">De</label>
            <DatePicker
              value={filter.de ? parseISO(filter.de) : undefined}
              onChange={(d) => applyFilter({ de: d ? format(d, "yyyy-MM-dd") : "" })}
              placeholder="00/00/0000"
              className="w-[140px]"
            />
          </div>

          {/* Até */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-medium">Até</label>
            <DatePicker
              value={filter.ate ? parseISO(filter.ate) : undefined}
              onChange={(d) => applyFilter({ ate: d ? format(d, "yyyy-MM-dd") : "" })}
              placeholder="00/00/0000"
              className="w-[140px]"
            />
          </div>

          {/* Search by Entidade ID */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-medium">Buscar ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="LUC, ID, usuário…"
                className="h-9 pl-8 pr-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 dark:bg-[#1A1F2E] dark:border-input dark:focus-within:ring-offset-[#1A1F2E]"
              />
            </div>
          </form>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-9 mt-auto px-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-[#1A1F2E] transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#242938] rounded-xl border border-gray-100 dark:border-[#2E3447] overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-gray-500 dark:text-[#94A3B8] text-sm max-w-sm text-center">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-[#8B1A1A] animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield className="w-10 h-10 text-gray-200 dark:text-[#2E3447]" />
            <p className="text-gray-400 text-sm">Nenhum evento encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F7F8FA] dark:bg-[#1A1F2E] border-b border-gray-100 dark:border-[#2E3447]">
                <tr>
                  {["#", "Timestamp", "Usuário", "Ação", "Entidade", "ID Entidade", "IP", ""].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400 dark:text-[#64748B]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-gray-50 dark:border-[#2E3447] cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#1E2435] transition-colors"
                  >
                    <td className="px-4 py-3 text-[12px] text-gray-400 dark:text-[#64748B] table-number">{log.id}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-[#94A3B8] whitespace-nowrap table-number">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-medium text-gray-900 dark:text-white">{log.user_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <AcaoBadge acao={log.acao} />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-[#94A3B8]">
                      {log.entidade}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-mono text-gray-700 dark:text-[#94A3B8] table-number">
                      {log.entidade_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 dark:text-[#64748B] font-mono table-number">
                      {log.ip || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-[#475569]" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#2E3447]">
            <span className="text-[12px] text-gray-400 dark:text-[#64748B]">
              Página {filter.page} de {totalPages} · {total.toLocaleString("pt-BR")} registros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, (filter.page ?? 1) - 1))}
                disabled={(filter.page ?? 1) <= 1}
                className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, (filter.page ?? 1) + 1))}
                disabled={(filter.page ?? 1) >= totalPages}
                className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
