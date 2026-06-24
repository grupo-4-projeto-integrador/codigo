import { Shield, Bell, AlertTriangle, AlertCircle, Plus, Search, MoreVertical, Activity, FolderOpen, Clock, BarChart3, Calendar, FileText, Edit, ChevronRight, ChevronLeft, Upload, X, ChevronUp, ChevronDown, User, Filter, CheckCircle2, SlidersHorizontal, Info, ShoppingBag, ShieldCheck, ShieldAlert, FilePlus, FilePenLine, RefreshCw, Trash2, Camera, Loader2, Settings2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

import React, { useState, useEffect, useRef, useId, memo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useUserProfile } from "../contexts/UserProfileContext";
import { useAuth } from "../contexts/AuthContext";
import { ComplianceMapV2, ComplianceSidePanel } from "../components/ComplianceMapV2";
import { SegmentRiskChart } from "../components/SegmentRiskChart";
import { ActionQueuePanel } from "../components/ActionQueuePanel";
import { getSelectedApoliceLuc, subscribeSelectedApoliceLuc, setMapFilters } from "../store";
import { exportToPDF, exportToCSV, exportRelatorioToPDF } from "../utils/exportUtils";
import { PolicyDetail } from "../components/PolicyDetail";
import { PolicyCreationWizard } from "../components/wizards/PolicyCreationWizard";
import { PolicyRenewalWizard } from "../components/wizards/PolicyRenewalWizard";
import { RequireRole } from "../components/RequireRole";
import { formatLargeCurrency } from "../utils/currency";
import { useCountUp } from "../hooks/useCountUp";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { request } from "../../api/client";
import { toast } from "sonner";
import { Usuarios } from "./Usuarios";
import { getHealthScore } from "../../api/apolice";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { SkeletonTable } from "../components/ui/SkeletonTable";
import { SkeletonMap } from "../components/ui/SkeletonMap";
import { AuditLog } from "./AuditLog";
import { useIsMobile } from "../components/ui/use-mobile";

import { PresentationMode } from "../components/PresentationMode";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { IconDownload } from '@tabler/icons-react';
import { exportToXLSX } from '../utils/exportUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
type KPIHistoryPoint = {
  label: string;
  value: number;
};

type KPIHistoryResponse = {
  metric: string;
  total: number;
  current: number;
  weekly_change_percent: number;
  points: KPIHistoryPoint[];
};

type CoverageHistoryResponse = {
  disponivel: number[];
  pago: number[];
};


type AtividadeRecente = {
  id: string;
  luc: string;
  nome_loja: string;
  acao: string;
  responsavel: string;
  timestamp: string;
};

const SyncFeedback = ({ lastSync }: { lastSync: Date }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(interval);
  }, []);

  const secondsAgo = Math.floor((now.getTime() - lastSync.getTime()) / 1000);

  let message = "Sincronizado agora";
  if (secondsAgo > 60) {
    const minutes = Math.floor(secondsAgo / 60);
    message = `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  } else if (secondsAgo > 10) {
    message = `há ${secondsAgo} segundos`;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {message}
      </motion.span>
    </AnimatePresence>
  );
};

const CardPulseOverlay = ({ value, color = "rgba(16, 185, 129, 0.15)" }: { value: any, color?: string }) => {
  const [pulseKey, setPulseKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setPulseKey(k => k + 1);
      prevValue.current = value;
    }
  }, [value]);

  if (pulseKey === 0) return null;

  return (
    <motion.div
      key={pulseKey}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 rounded-[14px] pointer-events-none z-10"
      style={{ backgroundColor: color }}
    />
  );
};

export function Insurance() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [periodFilter, setPeriodFilter] = useState("6meses");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredPolicyId, setHoveredPolicyId] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'audit-log' | 'usuarios'>('visao-geral');

  // Swipe logic
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 70;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const availableTabs = ['visao-geral'];
      if (can && can('ver_audit')) availableTabs.push('audit-log');
      if (role === 'admin') availableTabs.push('usuarios');
      
      const currentIndex = availableTabs.indexOf(activeTab);
      if (isLeftSwipe && currentIndex < availableTabs.length - 1) {
        setActiveTab(availableTabs[currentIndex + 1] as any);
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(availableTabs[currentIndex - 1] as any);
      }
    }
  };



  // Advanced filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileTable, setShowMobileTable] = useState(false);
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [seguradoraFilter, setSeguradoraFilter] = useState("todas");
  const [vigenciaFilter, setVigenciaFilter] = useState("");

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [vencimentoFilter, setVencimentoFilter] = useState("");

  // Modal states

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRenewalWizardOpen, setIsRenewalWizardOpen] = useState(false);
  const [renewalApoliceId, setRenewalApoliceId] = useState("");
  const [showViewApoliceModal, setShowViewApoliceModal] = useState(false);
  const [showEditApoliceModal, setShowEditApoliceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConformidadeModal, setShowConformidadeModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Relatório Executivo IA
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [relatorioTexto, setRelatorioTexto] = useState("");
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  // Table sorting states
  const [kpiMetrics, setKpiMetrics] = useState<any | null>(null);
  const [healthScore, setHealthScore] = useState<{ score: number, delta: number } | null>(null);
  const [localActivities, setLocalActivities] = useState<AtividadeRecente[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedLuc, setSelectedLuc] = useState(getSelectedApoliceLuc());

  // User profile and permissions from context
  const { canEdit } = useUserProfile();
  const isFocusMode = false;
  const { can, role } = useAuth();
  const [hoveredEditButton, setHoveredEditButton] = useState<string | null>(null);

  // Ref for filter panel and table section
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);

  // Form state para nova apólice
  const [formData, setFormData] = useState({
    luc: "",
    lojista: "",
    tipo: "",
    seguradora: "",
    vigencia: "",
    vencimento: "",
    cobertura: ""
  });

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();

    // Observer para mudanças no dark mode
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);



  // removed aggressive search query sync to avoid typing revert bug

  useEffect(() => {
    // Close filter panel when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false);
      }
    };

    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  useEffect(() => {
    const unsubscribe = subscribeSelectedApoliceLuc(() => {
      setSelectedLuc(getSelectedApoliceLuc());
      setCurrentPage(1);
    });

    return unsubscribe;
  }, []);

  // Brand colors - Responsive to dark mode
  const colors = {
    brandRed: "#a0191e",
    brandDarkRed: "#6e150e",
    brandMaroon: isDarkMode ? "#F1F5F9" : "#3e0000",
    olive: "#788033",
    forest: isDarkMode ? "#168821" : "#1c3d32",
    tan: "#bc9b7c",
    cream: "#f9e4a0",
    pageBg: isDarkMode ? "#0F1117" : "#faf8f5",
    cardBorder: isDarkMode ? "#222222" : "#f0ede8"
  };

  // Mini sparkline data for top cards
  const sparklineActive = [
    { value: 15 }, { value: 16 }, { value: 18 }, { value: 17 }, { value: 19 }, { value: 19 }
  ];
  const sparklineExpiring = [
    { value: 1 }, { value: 0 }, { value: 2 }, { value: 1 }, { value: 2 }, { value: 2 }
  ];
  const sparklineExpired = [
    { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 8 }, { value: 9 }
  ];

  // Horizontal Bar Chart Data - Cobertura por Tipo de Seguro
  // valor = limite contratado (milhões), sinistrosPagos = % utilizado no ano
  const insuranceCoverageData = [
    { categoria: "Incêndio", apolices: 7, valor: 86.4, sinistrosPagos: 42, color: colors.forest },
    { categoria: "Resp. Civil", apolices: 5, valor: 29.2, sinistrosPagos: 35, color: colors.olive },
    { categoria: "Roubo e Furto", apolices: 4, valor: 16.0, sinistrosPagos: 58, color: colors.brandRed },
    { categoria: "Danos Elétricos", apolices: 4, valor: 10.2, sinistrosPagos: 28, color: colors.tan },
    { categoria: "Vidros e Fachadas", apolices: 4, valor: 4.8, sinistrosPagos: 15, color: colors.cream },
    { categoria: "Alagamento", apolices: 3, valor: 6.0, sinistrosPagos: 12, color: colors.brandDarkRed },
    { categoria: "Equipamentos Eletrônicos", apolices: 3, valor: 11.6, sinistrosPagos: 22, color: colors.olive }
  ];

  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [selectedMapLuc, setSelectedMapLuc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conformesHistory, setConformesHistory] = useState<KPIHistoryResponse | null>(null);
  const [vencidasHistoryData, setVencidasHistoryData] = useState<KPIHistoryResponse | null>(null);
  const [coverageHistory, setCoverageHistory] = useState<CoverageHistoryResponse | null>(null);
  const [atividadesRecentes, setAtividadesRecentes] = useState<AtividadeRecente[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(true);
  const sparklineGradientId = useId().replace(/:/g, "-");
  const expiringSparklineId = useId().replace(/:/g, "-");
  const expiredSparklineId = useId().replace(/:/g, "-");
  const coverageSparklineId = useId().replace(/:/g, "-");

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const activePolicyId = hoveredPolicyId || (selectedMapLuc ? allPolicies.find(p => p.id === selectedMapLuc || p.luc === selectedMapLuc)?.id : null);

      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('visao-geral');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        if (can && can('ver_audit')) {
          setActiveTab('audit-log');
        }
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        if (role === 'admin') {
          setActiveTab('usuarios');
        }
      } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'r' && activePolicyId) {
          try {
            const stored = localStorage.getItem('recent_policies');
            let recent = stored ? JSON.parse(stored) : [];
            recent = [activePolicyId, ...recent.filter((id: string) => id !== activePolicyId)].slice(0, 5);
            localStorage.setItem('recent_policies', JSON.stringify(recent));
          } catch (e) { }
          navigate(`/seguros/apolice/${encodeURIComponent(activePolicyId)}`);
        } else if (e.key.toLowerCase() === 'e' && activePolicyId) {
          navigate(`/seguros/apolice/${encodeURIComponent(activePolicyId)}/editar`);
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          setCurrentPage(p => Math.min(totalFilteredPages, p + 1));
        } else if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          setCurrentPage(p => Math.max(1, p - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredPolicyId, selectedMapLuc, allPolicies, navigate]);

  // Derived metrics for KPIs
  const activePolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "ativa" || (p.status ?? "").toLowerCase() === "conforme").length;
  const expiringPolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "a vencer").length;
  const expiredPolicies = allPolicies.filter((p) => (p.status ?? "").toLowerCase() === "vencida").length;
  const totalPolicies = allPolicies.length;

  const percAVencer = totalPolicies ? Math.round((expiringPolicies / totalPolicies) * 100) : 0;
  const percVencidas = totalPolicies ? Math.round((expiredPolicies / totalPolicies) * 100) : 0;
  const totalCobertura = allPolicies.reduce((acc, p) => acc + (Number(p.cobertura) || 0), 0);


  const sparklineDataAtivas = [
    { value: Math.max(0, activePolicies - 15) }, { value: Math.max(0, activePolicies - 10) }, { value: Math.max(0, activePolicies - 12) }, { value: Math.max(0, activePolicies - 5) }, { value: Math.max(0, activePolicies - 2) }, { value: activePolicies }
  ];
  const sparklineDataAVencer = [
    { value: Math.max(0, expiringPolicies - 8) }, { value: Math.max(0, expiringPolicies - 3) }, { value: Math.max(0, expiringPolicies - 5) }, { value: Math.max(0, expiringPolicies + 2) }, { value: Math.max(0, expiringPolicies + 1) }, { value: expiringPolicies }
  ];
  const sparklineDataVencidas = [
    { value: Math.max(0, expiredPolicies + 10) }, { value: Math.max(0, expiredPolicies + 5) }, { value: Math.max(0, expiredPolicies + 7) }, { value: Math.max(0, expiredPolicies - 2) }, { value: Math.max(0, expiredPolicies + 1) }, { value: expiredPolicies }
  ];
  const coverageDisponivelValues = coverageHistory?.disponivel?.length ? coverageHistory.disponivel : Array.from({ length: 8 }, () => totalCobertura);
  const coveragePagoValues = coverageHistory?.pago?.length ? coverageHistory.pago : Array.from({ length: 8 }, () => 0);
  const coverageGlobalMax = Math.max(...coverageDisponivelValues, ...coveragePagoValues, 1);

  const buildCoveragePath = (values: number[]) => {
    const width = 280;
    const height = 44;
    const minY = 36;
    const maxY = 8;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;

    const points = values.map((value, index) => {
      const normalized = value / coverageGlobalMax;
      const y = minY - normalized * (minY - maxY);
      return { x: index * stepX, y };
    });

    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const area = `${line} L 280 44 L 0 44 Z`;
    return { line, area };
  };

  const { line: coverageDisponivelLine, area: coverageDisponivelArea } = buildCoveragePath(coverageDisponivelValues);
  const { line: coveragePagoLine, area: coveragePagoArea } = buildCoveragePath(coveragePagoValues);


  const conformidadeCount = conformesHistory?.current ?? activePolicies;
  const conformidadeTotal = conformesHistory?.total ?? 290;
  const complianceRate = conformidadeTotal > 0 ? (conformidadeCount / conformidadeTotal) * 100 : 0;

  const animatedConformidade = Math.round(useCountUp(conformidadeCount));
  const animatedExpiring = Math.round(useCountUp(expiringPolicies));
  const animatedExpired = Math.round(useCountUp(expiredPolicies));
  const animatedTotalCobertura = useCountUp(totalCobertura);
  const formattedCoverageTotal = formatLargeCurrency(animatedTotalCobertura);
  const weeklyVariation = conformesHistory?.weekly_change_percent ?? 0;
  const sparklineValues = (conformesHistory?.points?.length)
    ? conformesHistory.points.map((point) => point.value)
    : Array.from({ length: 8 }, () => conformidadeCount);
  const expiringSparklineValues = sparklineDataAVencer.map((point) => point.value);
  const vencidasHistory = vencidasHistoryData?.points?.length
    ? vencidasHistoryData.points.map((point) => point.value)
    : Array.from({ length: 8 }, () => expiredPolicies);

  const buildSparklinePath = (values: number[]) => {
    if (values.length === 0) {
      return { line: "", area: "" };
    }

    const width = 280;
    const height = 44;
    const minY = 36;
    const maxY = 8;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;

    const points = values.map((value, index) => {
      const normalized = (value - minValue) / range;
      const y = minY - normalized * (minY - maxY);
      return { x: index * stepX, y };
    });

    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const area = `${line} L 280 44 L 0 44 Z`;
    return { line, area };
  };

  const { line: sparklineLine, area: sparklineArea } = buildSparklinePath(sparklineValues);
  const { line: expiringLine, area: expiringArea } = buildSparklinePath(expiringSparklineValues);
  const { line: vencidasLine, area: vencidasArea } = buildSparklinePath(vencidasHistory);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const data = await request<any[]>('/apolices');
      setAllPolicies(data || []);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Failed to fetch policies", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();

    const handleRefresh = () => fetchPolicies();
    window.addEventListener('refresh-policies', handleRefresh);
    return () => window.removeEventListener('refresh-policies', handleRefresh);
  }, []);

  useEffect(() => {
    if (activeTab === 'visao-geral') {
      getHealthScore()
        .then(setHealthScore)
        .catch(err => console.error("Failed to fetch health score", err));
    }
  }, [activeTab]);

  // Sync active filters to the map store so tiles dim accordingly
  useEffect(() => {
    setMapFilters(
      tipoFilter !== 'todos' ? tipoFilter : '',
      seguradoraFilter !== 'todas' ? seguradoraFilter : '',
      statusFilter !== 'todas' ? statusFilter.toLowerCase() : ''
    );
  }, [tipoFilter, seguradoraFilter, statusFilter]);

  useEffect(() => {
    let active = true;

    const fetchHistory = async () => {
      try {
        const data = await request<KPIHistoryResponse>('/kpis/history?metric=conformes&weeks=8');
        if (active) {
          setConformesHistory(data);
        }
      } catch {
        if (active) {
          setConformesHistory(null);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchCoverageHistory = async () => {
      try {
        const data = await request<CoverageHistoryResponse>('/kpis/coverage-history?weeks=8');
        if (active) {
          setCoverageHistory(data);
        }
      } catch {
        if (active) {
          setCoverageHistory(null);
        }
      }
    };

    fetchCoverageHistory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchHistory = async () => {
      try {
        const data = await request<KPIHistoryResponse>('/kpis/history?metric=vencidas&weeks=8');
        if (active) {
          setVencidasHistoryData(data);
        }
      } catch {
        if (active) {
          setVencidasHistoryData(null);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, []);

  const fetchAtividadesGlobais = async () => {
    setLoadingAtividades(true);
    try {
      const data = await request<AtividadeRecente[]>('/apolices/atividade-recente?limit=5');
      setAtividadesRecentes(data || []);
    } catch {
      setAtividadesRecentes([]);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const fetchLocalAtividades = async (luc: string) => {
    setLoadingLocal(true);
    try {
      const policy = allPolicies.find(p => p.id === luc || p.luc === luc);
      const actualLuc = policy ? (policy.luc || policy.id) : luc;

      const data = await request<any[]>(`/apolices/${actualLuc}/historico`);
      setLocalActivities((data || []).map(h => {
        const acaoLower = (h.descricao || '').toLowerCase();
        const mappedAcao = acaoLower.includes('criada') ? 'criada' :
          acaoLower.includes('renova') ? 'renovada' :
            acaoLower.includes('exclu') ? 'excluida' :
              acaoLower.includes('observaç') ? 'observacoes' : 'editada';
        return {
          id: h.id?.toString() || Math.random().toString(),
          luc: h.apolice_luc,
          nome_loja: policy ? policy.loja : actualLuc,
          acao: mappedAcao,
          responsavel: h.ator || 'Sistema',
          timestamp: h.data
        };
      }));
    } catch {
      setLocalActivities([]);
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchAtividadesGlobais();

    const handleRefresh = () => {
      fetchAtividadesGlobais();
      if (selectedMapLuc) fetchLocalAtividades(selectedMapLuc);
    };
    window.addEventListener('refresh-policies', handleRefresh);
    return () => window.removeEventListener('refresh-policies', handleRefresh);
  }, []);

  useEffect(() => {
    if (selectedMapLuc && allPolicies.length > 0) {
      fetchLocalAtividades(selectedMapLuc);
    } else {
      setLocalActivities([]);
    }
  }, [selectedMapLuc, allPolicies.length]);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Extract unique values for filter options
  const uniqueTipos = Array.from(new Set(allPolicies.map(p => p.tipo))).sort();
  const uniqueSeguradoras = Array.from(new Set(allPolicies.map(p => p.seguradora))).sort();

  // Count active filters
  const activeFiltersCount = [
    tipoFilter !== "todos",
    seguradoraFilter !== "todas",
    vigenciaFilter !== "",
    vencimentoFilter !== "",
    statusFilter !== "todas"
  ].filter(Boolean).length;

  // Clear all filters
  const handleClearFilters = () => {
    setTipoFilter("todos");
    setSeguradoraFilter("todas");
    setVigenciaFilter("");
    setVencimentoFilter("");
    setStatusFilter("todas");
  };


  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tipoFilter, seguradoraFilter, vigenciaFilter, vencimentoFilter]);

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query === "") {
      // Quando limpa a busca, soltamos qualquer seleção do mapa
      setSelectedMapLuc(null);
      setSelectedLuc(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const searchInput = document.getElementById("insurance-search-input");
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Helper function to convert DD/MM/YYYY to Date object
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const normalizeText = (text: string) => {
    return String(text || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .toLowerCase();
  };

  const normalizeForSearch = (text: string) => {
    return normalizeText(text).replace(/[^a-z0-9]/g, ""); // Remove spaces and special chars
  };

  const filteredPolicies = allPolicies.filter(policy => {
    const searchLower = normalizeForSearch(searchQuery);
    const matchesSearch =
      searchLower === "" ||
      normalizeForSearch(policy.lojista).includes(searchLower) ||
      normalizeForSearch(policy.tipo).includes(searchLower) ||
      normalizeForSearch(policy.id).includes(searchLower) ||
      normalizeForSearch(policy.seguradora).includes(searchLower) ||
      normalizeForSearch(policy.status).includes(searchLower);
    const matchesStatus = statusFilter === "todas" ||
      String(policy.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesTipo = tipoFilter === "todos" || policy.tipo === tipoFilter;
    const matchesSeguradora = seguradoraFilter === "todas" || policy.seguradora === seguradoraFilter;

    // Date filtering logic
    const matchesVigencia = !vigenciaFilter || parseDate(policy.vigencia).toDateString() === new Date(vigenciaFilter).toDateString();
    const matchesVencimento = !vencimentoFilter || parseDate(policy.vencimento).toDateString() === new Date(vencimentoFilter).toDateString();

    return matchesSearch && matchesStatus && matchesTipo && matchesSeguradora && matchesVigencia && matchesVencimento;
  });

  // Auto-selecionar no mapa se a busca retornar exatamente 1 resultado
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      if (filteredPolicies.length === 1) {
        if (selectedMapLuc !== filteredPolicies[0].id) {
          setSelectedMapLuc(filteredPolicies[0].id);
          setSelectedLuc(filteredPolicies[0].id);
        }
      } else {
        if (selectedMapLuc !== null) {
          setSelectedMapLuc(null);
          setSelectedLuc(null);
        }
      }
    }
  }, [searchQuery, filteredPolicies.length, selectedMapLuc]);

  const filteredByMap = selectedLuc
    ? filteredPolicies.filter((policy) => String(policy.id || '').toLowerCase() === String(selectedLuc || '').toLowerCase())
    : filteredPolicies;

  // Ordenação
  const sortedPolicies = [...filteredByMap].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number = String(a[sortColumn as keyof typeof a] ?? "");
    let bValue: string | number = String(b[sortColumn as keyof typeof b] ?? "");

    // Convert dates to comparable format
    if (sortColumn === 'vigencia' || sortColumn === 'vencimento') {
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      };
      aValue = parseDate(String(aValue));
      bValue = parseDate(String(bValue));
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });



  // Listen for custom events from CommandPalette
  useEffect(() => {
    const handleExport = () => {
      const statusName = statusFilter === 'todas' ? 'todas' : statusFilter.replace(/\s+/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      exportToPDF(sortedPolicies, `apolices-${statusName}-${dateStr}.pdf`);
    };

    const handleFocusSearch = () => {
      const input = document.getElementById("insurance-search-input");
      if (input) input.focus();
    };

    const handleOpenAuditLog = () => {
      if (can && can('ver_audit')) setActiveTab('audit-log');
    };

    const handleOpenRenew = (e: any) => {
      const luc = e.detail;
      const policy = sortedPolicies.find(p => p.luc === luc);
      if (policy && canEdit) {
        setRenewalApoliceId(policy.id);
        setIsRenewalWizardOpen(true);
      }
    };

    const handleCloseModalsEvent = () => {
      setShowViewApoliceModal(false);
      setShowEditApoliceModal(false);
      setIsRenewalWizardOpen(false);
      setShowUploadModal(false);
      setShowDropdown(false);
      setShowConformidadeModal(false);
      setSelectedPolicy(null);
      setUploadedFile(null);
      setIsDragging(false);
    };

    const handleGoVisaoGeral = () => {
      setActiveTab('visao-geral');
    };

    window.addEventListener("export-filter", handleExport);
    window.addEventListener("focus-search", handleFocusSearch);
    window.addEventListener("open-audit-log", handleOpenAuditLog);
    window.addEventListener("open-renew-dialog", handleOpenRenew);
    window.addEventListener("close-modals", handleCloseModalsEvent);
    window.addEventListener("go-visao-geral", handleGoVisaoGeral);

    return () => {
      window.removeEventListener("export-filter", handleExport);
      window.removeEventListener("focus-search", handleFocusSearch);
      window.removeEventListener("open-audit-log", handleOpenAuditLog);
      window.removeEventListener("open-renew-dialog", handleOpenRenew);
      window.removeEventListener("close-modals", handleCloseModalsEvent);
      window.removeEventListener("go-visao-geral", handleGoVisaoGeral);
    };
  }, [sortedPolicies, statusFilter, canEdit, can]);

  // Listen for custom events from CommandPalette
  useEffect(() => {
    const handleExportarPdf = () => {
      const statusName = statusFilter === 'todas' ? 'todas' : statusFilter.replace(/\s+/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      exportToPDF(sortedPolicies, `apolices-${statusName}-${dateStr}.pdf`);
    };

    const handleFiltrarVencidas = () => {
      setStatusFilter('vencida');
      setCurrentPage(1);
      setTimeout(() => {
        tableSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    };

    const handleFiltrarAVencer = () => {
      setStatusFilter('a vencer');
      setCurrentPage(1);
      setTimeout(() => { tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    };

    const handleFiltrarConformes = () => {
      setStatusFilter('ativa');
      setCurrentPage(1);
      setTimeout(() => { tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    };

    const handleFiltrarTodas = () => {
      setStatusFilter('todas');
      setCurrentPage(1);
      setTimeout(() => { tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    };

    window.addEventListener('exportar-pdf', handleExportarPdf);
    window.addEventListener('filtrar-vencidas', handleFiltrarVencidas);
    window.addEventListener('filtrar-a-vencer', handleFiltrarAVencer);
    window.addEventListener('filtrar-conformes', handleFiltrarConformes);
    window.addEventListener('filtrar-todas', handleFiltrarTodas);

    return () => {
      window.removeEventListener('exportar-pdf', handleExportarPdf);
      window.removeEventListener('filtrar-vencidas', handleFiltrarVencidas);
      window.removeEventListener('filtrar-a-vencer', handleFiltrarAVencer);
      window.removeEventListener('filtrar-conformes', handleFiltrarConformes);
      window.removeEventListener('filtrar-todas', handleFiltrarTodas);
    };
  }, [sortedPolicies, statusFilter]);

  // Paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPolicies = sortedPolicies.slice(startIndex, endIndex);
  const totalFilteredPages = Math.ceil(sortedPolicies.length / itemsPerPage);

  // Handlers
  const handleNovaApolice = () => {
    setIsWizardOpen(true);
  };

  const handleVerApolice = (policyId: string) => {
    try {
      const stored = localStorage.getItem('recent_policies');
      let recent = stored ? JSON.parse(stored) : [];
      recent = [policyId, ...recent.filter((id: string) => id !== policyId)].slice(0, 5);
      localStorage.setItem('recent_policies', JSON.stringify(recent));
    } catch (e) { }
    navigate(`/seguros/apolice/${encodeURIComponent(policyId)}`);
  };

  const handleEditarApolice = (policyId: string) => {
    navigate(`/seguros/apolice/${encodeURIComponent(policyId)}/editar`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };



  const handleSubmitEditApolice = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Apólice ${selectedPolicy?.id} atualizada com sucesso!`);
    setShowEditApoliceModal(false);
  };

  const handleCloseModals = () => {

    setShowViewApoliceModal(false);
    setShowEditApoliceModal(false);
    setIsRenewalWizardOpen(false);
    setShowUploadModal(false);
    setShowDropdown(false);
    setShowConformidadeModal(false);
    setSelectedPolicy(null);
    setUploadedFile(null);
    setIsDragging(false);
  };

  const handleUploadApolice = () => {
    setShowDropdown(false);
    setShowUploadModal(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(file.type)) {
        toast.error(`Formato não suportado: ${file.type}. Use PDF, JPG ou PNG.`);
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!tiposPermitidos.includes(file.type)) {
        toast.error(`Formato não suportado: ${file.type}. Use PDF, JPG ou PNG.`);
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleConfirmUpload = () => {
    if (uploadedFile) {
      alert(`Arquivo "${uploadedFile.name}" enviado com sucesso!\n\nA apólice será processada e adicionada ao sistema.`);
      handleCloseModals();
    }
  };

  const handleGerarRelatorio = async () => {
    setLoadingRelatorio(true);
    setShowRelatorioModal(true);
    setRelatorioTexto("");
    try {
      const segmentosCriticos = [
        ...new Set(
          allPolicies
            .filter(p => (p.status || '').toLowerCase() === 'vencida')
            .map(p => p.segmento || p.tipo || '')
            .filter(Boolean)
        )
      ].slice(0, 3).join(', ') || 'Nenhum';

      const acoesUrgentes = allPolicies
        .filter(p => (p.status || '').toLowerCase() === 'vencida' || (p.status || '').toLowerCase() === 'a vencer')
        .slice(0, 3)
        .map(p => `${p.loja || p.lojista || p.luc}: ${p.status}`)
        .join('; ') || 'Nenhuma';

      const payload = {
        nome_shopping: 'Flamboyant',
        health_score: healthScore?.score ?? 0,
        delta_semanal: healthScore?.delta ?? 0,
        total_apolices: totalPolicies,
        conformes: activePolicies,
        a_vencer: expiringPolicies,
        vencidas: expiredPolicies,
        cobertura_total_m: parseFloat((totalCobertura / 1_000_000).toFixed(1)),
        segmentos_criticos: segmentosCriticos,
        acoes_urgentes: acoesUrgentes,
        data_referencia: new Date().toLocaleDateString('pt-BR'),
      };

      const data = await request<{ relatorio: string }>('/relatorio/executivo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setRelatorioTexto(data?.relatorio || 'Não foi possível gerar o relatório.');
    } catch (err) {
      console.error('Erro ao gerar relatório IA:', err);
      setRelatorioTexto('Serviço de IA indisponível. Contate o administrador do sistema.');
    } finally {
      setLoadingRelatorio(false);
    }
  };

  const handleRenovarApolice = (policyId: string) => {
    setRenewalApoliceId(policyId);
    setIsRenewalWizardOpen(true);
  };

  const handleConfirmarRenovacao = async () => {
    if (!selectedPolicy) return;
    try {
      // Create a date next year for new vigencia
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const payload = {
        nova_vigencia: nextYear.toLocaleDateString('pt-BR'),
        novo_valor: parseFloat((selectedPolicy.cobertura || '0').replace(/\D/g, '')) / 100 || 0
      };

      await request(`/apolices/${selectedPolicy.id}/renovar`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      alert(`Renovação da apólice ${selectedPolicy.id} confirmada!\n\nA apólice será renovada por mais 12 meses.`);
      setIsRenewalWizardOpen(false);
      setSelectedPolicy(null);
      fetchAtividadesGlobais();
    } catch (err) {
      console.error(err);
      alert("Falha ao renovar a apólice");
    }
  };

  const handleVerApoliceCard = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    setSelectedPolicy(policy);
    setShowViewApoliceModal(true);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalFilteredPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // KPI Card Click Handlers - Navigate to table with filter applied
  const handleKPICardClick = (filterStatus: string) => {
    setStatusFilter(filterStatus);
    setCurrentPage(1);

    // Scroll to table section with smooth animation
    setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Chart Bar Click Handler - Navigate to table with tipo filter applied
  const handleChartBarClick = (tipoSeguro: string) => {
    setTipoFilter(tipoSeguro);
    setCurrentPage(1);

    // Scroll to table section with smooth animation
    setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Non-conforming stores data (9 stores with expired policies)
  const nonConformingStores = [
    { nome: "Zara", motivo: "Apólice AP-2024-112 vencida em 08/03/2025", tipo: "Danos Elétricos" },
    { nome: "Renner", motivo: "Apólice SU-2024-4521 vencida em 08/03/2025", tipo: "Alagamento" },
    { nome: "C&A", motivo: "Apólice AP-2024-198 vencida em 15/11/2024", tipo: "Responsabilidade Civil" },
    { nome: "Riachuelo", motivo: "Apólice AP-2024-234 vencida em 12/01/2025", tipo: "Incêndio" },
    { nome: "Lojas Americanas", motivo: "Apólice AP-2024-267 vencida em 20/02/2025", tipo: "Vidros e Fachadas" },
    { nome: "Pernambucanas", motivo: "Apólice AP-2024-289 vencida em 01/12/2024", tipo: "Incêndio" },
    { nome: "Marisa", motivo: "Apólice AP-2024-301 vencida em 15/04/2025", tipo: "Equipamentos Eletrônicos" },
    { nome: "Casas Bahia", motivo: "Apólice AP-2024-312 vencida em 20/04/2025", tipo: "Danos Elétricos" },
    { nome: "Magazine Luiza", motivo: "Apólice AP-2024-345 vencida em 10/06/2025", tipo: "Roubo e Furto" }
  ];

  // Compliance Map - Floor × Sector Data Structure
  // Setores: Moda | Alimentação | Eletrônicos | Serviços | Âncoras
  const complianceMapData = [
    {
      floor: "Piso 3",
      sectors: [
        { sector: "Moda", icon: "👔", status: "compliant", stores: ["Zara", "Renner"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Zara: AP-2024-112 vencida há 54 dias\nRenner: SU-2024-4521 vencida há 54 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Eletrônicos", icon: "📱", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Serviços", icon: "🔧", status: "warning", stores: ["Magazine Luiza"], expired: 0, warning: 1, daysToExpire: 8, storeDetails: "Magazine Luiza: AP-2025-249 vence em 6 dias" },
        { sector: "Âncoras", icon: "🏬", status: "critical", stores: ["C&A"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "C&A: AP-2024-198 vencida há 168 dias" }
      ]
    },
    {
      floor: "Piso 2",
      sectors: [
        { sector: "Moda", icon: "👔", status: "critical", stores: ["Riachuelo", "Lojas Americanas"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Riachuelo: AP-2024-234 vencida há 110 dias\nLojas Americanas: AP-2024-267 vencida há 71 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Eletrônicos", icon: "📱", status: "critical", stores: ["Casas Bahia"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "Casas Bahia: AP-2024-312 vencida há 12 dias" },
        { sector: "Serviços", icon: "🔧", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Âncoras", icon: "🏬", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" }
      ]
    },
    {
      floor: "Piso 1",
      sectors: [
        { sector: "Moda", icon: "👔", status: "critical", stores: ["Pernambucanas", "Marisa"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Pernambucanas: AP-2024-289 vencida há 152 dias\nMarisa: AP-2024-301 vencida há 17 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "warning", stores: ["Outback"], expired: 0, warning: 1, daysToExpire: 18, storeDetails: "Outback: TM-2024-9012 vence em 18 dias" },
        { sector: "Eletrônicos", icon: "📱", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Serviços", icon: "🔧", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Âncoras", icon: "🏬", status: "critical", stores: ["Extra Hipermercado"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "Extra: AP-2024-345 vencida há 326 dias" }
      ]
    }
  ];

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "compliant": return "#2E7D32"; // Verde - 100% conformidade
      case "warning": return "#FBC02D"; // Amarelo - A vencer
      case "critical": return "#D32F2F"; // Vermelho - Vencidas
      default: return "#E5E7EB";
    }
  };

  const handleComplianceCellClick = (floor: string, sector: string) => {
    // Aplica filtro na tabela baseado no piso/setor clicado
    // Por enquanto, vamos apenas scrollar até a tabela
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Aqui você pode adicionar lógica adicional de filtro se necessário
    // Por exemplo, filtrar por lojas específicas daquele piso/setor
  };

  // Performance Data - Donut segmentado (3 estados)
  const performanceData = [
    { name: "Conformes", value: 21, color: colors.forest, label: "21 apólices" },
    { name: "A regularizar", value: 0, color: colors.tan, label: "0 apólices" },
    { name: "Crítico", value: 9, color: colors.brandRed, label: "9 apólices" }
  ];

  const totalLojas = performanceData.reduce((sum, item) => sum + item.value, 0);
  const conformidadePercentual = Math.round((performanceData[0].value / totalLojas) * 100);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return colors.forest;
      case "moderate": return colors.cream;
      case "alert": return colors.tan;
      case "critical": return colors.brandRed;
      default: return "#E5E7EB";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low": return "Baixo Risco";
      case "moderate": return "Risco Moderado";
      case "alert": return "Alerta";
      case "critical": return "Risco Crítico";
      default: return "";
    }
  };

  const handleMouseEnter = (row: number, col: number, e: React.MouseEvent) => {
    setHoveredCell({ row, col });
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: rect.left, y: rect.bottom + 5 });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const generateCoverageValue = (luc: string) => {
    if (!luc) return 0;
    let hash = 0;
    for (let i = 0; i < luc.length; i++) {
      hash = luc.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absoluteHash = Math.abs(hash);
    const baseValue = 500000 + (absoluteHash % 2500000);
    return Math.round(baseValue / 10000) * 10000;
  };

  const getDiasRestantesColor = (dias: number) => {
    if (dias < 0) return colors.brandRed;
    if (dias <= 15) return colors.olive;
    return colors.forest;
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    let mapped = s;
    if (s === 'ativa') mapped = 'conforme';

    let cls = 'px-3 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap';
    if (mapped === 'vencida') cls += ' bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    else if (mapped === 'a vencer') cls += ' bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    else cls += ' bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

    return (
      <span className={cls}>
        {mapped || '-'}
      </span>
    );
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalFilteredPages <= 5) {
      for (let i = 1; i <= totalFilteredPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalFilteredPages);
      } else if (currentPage >= totalFilteredPages - 2) {
        pages.push(1, '...', totalFilteredPages - 3, totalFilteredPages - 2, totalFilteredPages - 1, totalFilteredPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalFilteredPages);
      }
    }
    return pages;
  }; const renderSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b h-12" style={{ borderColor: colors.cardBorder }}>
          {Array(9).fill(0).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-[#1E2435] rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  const renderEmptyState = () => (
    <tr>
      <td colSpan={9} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-[#1E2435] rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: colors.brandMaroon }}>Nenhuma apólice encontrada</h3>
          <p className="text-sm text-gray-500 max-w-md mb-4">Não encontramos resultados para os filtros selecionados. Tente limpar os filtros ou buscar por termos diferentes.</p>
          {(activeFiltersCount > 0 || searchQuery) && (
            <button
              onClick={() => { handleClearFilters(); setSearchQuery(''); }}
              className="px-4 py-2 bg-gray-100 dark:bg-[#151515] hover:bg-gray-200 dark:hover:bg-[#222222] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Limpar busca e filtros
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div
      ref={dashboardRef}
      className="flex flex-col min-h-[calc(100dvh-120px)] transition-all duration-500"
      style={{
        backgroundColor: colors.pageBg,
        fontSize: isFocusMode ? '115%' : undefined,
      }}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchMove={isMobile ? onTouchMove : undefined}
      onTouchEnd={isMobile ? onTouchEndEvent : undefined}
    >
      {/* Page Header (Breadcrumb, Sync Status, Title & Filters) */}
      <div className={`flex-shrink-0 mb-4 space-y-2 px-6 pt-4 transition-all duration-500 overflow-hidden ${isFocusMode ? 'hidden' : ''}`}>
        <div className="hidden md:flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8]">
            <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/')}>Flamboyant Shopping</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-800 dark:text-gray-300">Seguros</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-[#94A3B8] font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
            <SyncFeedback lastSync={lastSyncTime} />
            <button
              onClick={() => { setLastSyncTime(new Date()); /* triggers visual sync, real sync can be added here */ }}
              className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-[#222222] rounded-md transition-colors"
              title="Sincronizar agora"
            >
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 page-header">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-[length:var(--font-page-title)] font-bold text-gray-900 dark:text-white leading-tight page-title" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>Seguros</h1>
              <p className="text-[13px] text-gray-500 dark:text-[#94A3B8] mt-1 page-description">Gestão de apólices, mapa de lucs e auditoria de ações.</p>
            </div>

            {/* Health Score Widget */}
            {healthScore && (
              <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-gray-200 dark:border-[#222222] health-score-block">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#64748B] font-bold mb-0.5" style={{ letterSpacing: '0.12em' }}>Health Score</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[length:var(--font-kpi)] font-light tracking-[-0.02em] text-[#0F172A] dark:text-white leading-none tabular-nums health-score-value" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                      {healthScore.score}
                    </span>
                    <span className="text-[10px] font-medium health-score-delta opacity-75">
                      {healthScore.delta === 0 ? (
                        <span className="text-gray-500">Estável</span>
                      ) : healthScore.delta > 0 ? (
                        <span className="text-[#639922]">↑ {healthScore.delta} {healthScore.delta === 1 ? 'ponto' : 'pontos'}</span>
                      ) : (
                        <span className="text-[#E23B44]">↓ {Math.abs(healthScore.delta)} {Math.abs(healthScore.delta) === 1 ? 'ponto' : 'pontos'}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'visao-geral' && (
            <div className="flex items-center justify-end flex-1 w-full gap-2 lg:gap-2.5 filter-row min-w-0" id="filtros-tour">
              {/* ACTION BAR: Filtros, Busca, Download, Snapshot, Nova Apólice (Ancorada à Direita) */}
              <div className="flex items-center gap-2 flex-1 w-full min-w-0 flex-nowrap md:flex-wrap overflow-x-auto scrollbar-hide justify-between md:justify-end pb-1">
                {/* Popover Filtros Agrupado (Todas as Resoluções) */}
                <div className="flex flex-shrink-0">
                  <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-center h-9 px-3 gap-2 rounded-lg border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#151515] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors shadow-sm">
                        <Filter className="w-4 h-4" />
                        <span className="text-[13px] font-medium">Filtros</span>
                        {(seguradoraFilter !== 'todas' || tipoFilter !== 'todos' || statusFilter !== 'todas') && (
                          <span className="w-2 h-2 rounded-full bg-[#c4151f]"></span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-64 p-4 rounded-xl shadow-xl border-[#c4151f]/20 bg-white dark:bg-[#151515] z-[100]">
                      <div className="flex flex-col gap-4">
                        <div className="text-[13px] font-bold text-[#9F1239] dark:text-[#E23B44] border-b border-gray-100 dark:border-[#222222] pb-2">
                          Filtros de Apólice
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Seguradora</label>
                          <Select value={seguradoraFilter} onValueChange={setSeguradoraFilter}>
                            <SelectTrigger className={`h-9 border rounded-lg text-[13px] font-medium transition-colors ${seguradoraFilter !== 'todas' ? 'border-[#c4151f] text-white bg-[#9F1239] hover:bg-[#880d2f]' : 'bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-200'}`}>
                              <SelectValue placeholder="Seguradora" />
                            </SelectTrigger>
                            <SelectContent className="z-[110] bg-white dark:bg-[#151515]">
                              <SelectItem value="todas">Todas</SelectItem>
                              {uniqueSeguradoras.map(seg => <SelectItem key={seg} value={seg}>{seg}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Segmento</label>
                          <Select value={tipoFilter} onValueChange={setTipoFilter}>
                            <SelectTrigger className={`h-9 border rounded-lg text-[13px] font-medium transition-colors ${tipoFilter !== 'todos' ? 'border-[#c4151f] text-white bg-[#9F1239] hover:bg-[#880d2f]' : 'bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-200'}`}>
                              <SelectValue placeholder="Segmento" />
                            </SelectTrigger>
                            <SelectContent className="z-[110] bg-white dark:bg-[#151515]">
                              <SelectItem value="todos">Todos</SelectItem>
                              {uniqueTipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className={`h-9 border rounded-lg text-[13px] font-medium transition-colors ${statusFilter !== 'todas' ? 'border-[#c4151f] text-white bg-[#9F1239] hover:bg-[#880d2f]' : 'bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-[#222222] text-gray-700 dark:text-gray-200'}`}>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="z-[110] bg-white dark:bg-[#151515]">
                              <SelectItem value="todas">Todos</SelectItem>
                              <SelectItem value="ativa">Ativa</SelectItem>
                              <SelectItem value="a vencer">A Vencer</SelectItem>
                              <SelectItem value="vencida">Vencida</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-[#222222]">
                          <button
                            onClick={() => {
                              setIsFilterOpen(false);
                              if (isMobile) {
                                const filterMap: Record<string, string> = {
                                  'todas': 'Todas',
                                  'ativa': 'Conformes',
                                  'a vencer': 'A Vencer',
                                  'vencida': 'Vencidas'
                                };
                                navigate(`/seguros/tabela?filter=${filterMap[statusFilter] || 'Todas'}&seguradora=${encodeURIComponent(seguradoraFilter)}&segmento=${encodeURIComponent(tipoFilter)}`);
                              }
                            }}
                            className="w-full bg-[#c4151f] hover:bg-[#a0191e] text-white font-medium py-2 rounded-lg text-[13px] transition-colors"
                          >
                            {isMobile ? `Ver ${sortedPolicies.length} resultados na tabela` : `Aplicar Filtros (${sortedPolicies.length})`}
                          </button>
                          {(seguradoraFilter !== 'todas' || tipoFilter !== 'todos' || statusFilter !== 'todas') && (
                            <button
                              onClick={() => { setSeguradoraFilter('todas'); setTipoFilter('todos'); setStatusFilter('todas'); }}
                              className="text-[12px] font-medium text-[#c4151f] hover:underline text-center"
                            >
                              Limpar Filtros
                            </button>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className={`relative ${isMobile ? 'w-auto' : 'w-full search-bar-dynamic'} flex-shrink-0`}>
                  {isMobile ? (
                    <button
                      className="flex-shrink-0 flex items-center justify-center w-9 h-9 bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors shadow-sm"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                      aria-label="Buscar"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <input
                        id="insurance-search-input"
                        type="text"
                        placeholder="Buscar loja, LUC ou segmento..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onClick={(e) => e.currentTarget.select()}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded-lg text-[13px] text-[#9F1239] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#9F1239] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      />
                    </>
                  )}
                </div>






                <DropdownMenu>
                  <TooltipProvider>
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button className="flex flex-shrink-0 items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#151515] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors shadow-sm">
                            <IconDownload size={18} stroke={1.5} />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Exportar filtro atual</p>
                      </TooltipContent>
                    </ShadcnTooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="end" className="w-40 z-50">
                    <DropdownMenuItem onClick={() => {
                      const statusName = statusFilter === 'todas' ? 'todas' : statusFilter.replace(/\s+/g, '-');
                      const dateStr = new Date().toISOString().split('T')[0];
                      exportToPDF(sortedPolicies, `apolices-${statusName}-${dateStr}.pdf`);
                    }}>
                      Baixar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const statusName = statusFilter === 'todas' ? 'todas' : statusFilter.replace(/\s+/g, '-');
                      const dateStr = new Date().toISOString().split('T')[0];
                      exportToXLSX(sortedPolicies, `apolices-${statusName}-${dateStr}.xlsx`);
                    }}>
                      Baixar XLSX
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  id="snapshot-tour"
                  onClick={() => window.dispatchEvent(new CustomEvent("trigger-snapshot"))}
                  className="flex flex-shrink-0 items-center justify-center w-9 h-9 md:w-auto md:px-3 gap-2 rounded-lg border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#151515] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors shadow-sm"
                  title="Capturar snapshot em PNG"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[13px] font-medium hidden xl:inline">Snapshot</span>
                </button>

                {/* Botão Relatório IA */}
                <RequireRole roles={['admin', 'gestor']}>
                  <TooltipProvider>
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          id="relatorio-ia-btn"
                          onClick={handleGerarRelatorio}
                          disabled={loadingRelatorio}
                          className="flex items-center justify-center flex-shrink-0 h-9 px-3 gap-2 rounded-lg border-none text-[13px] font-semibold transition-colors shadow-sm whitespace-nowrap relative overflow-hidden group btn-shimmer-brand"
                          whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(159,18,57,0.3)' }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <span className="relative z-10 flex items-center gap-1.5 text-[#f9e4a0]">
                            {loadingRelatorio ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                              </svg>
                            )}
                            <span className="hidden xl:inline">Relatório IA</span>
                          </span>
                          <motion.div
                            className="absolute inset-y-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] w-[60%] pointer-events-none"
                            animate={{ left: ["-100%", "200%", "-100%"] }}
                            transition={{
                              repeat: Infinity,
                              duration: 6,
                              ease: "linear",
                            }}
                          />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Gerar relatório executivo com IA</p>
                      </TooltipContent>
                    </ShadcnTooltip>
                  </TooltipProvider>
                </RequireRole>

                <RequireRole roles={['admin', 'gestor']}>
                  <motion.button
                    onClick={handleNovaApolice}
                    className="btn-nova-apolice hidden md:flex flex-shrink-0 relative overflow-hidden px-4 py-2 rounded-lg border-none text-[13px] font-semibold items-center justify-center shadow-sm whitespace-nowrap group btn-shimmer-brand"
                    whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(159, 18, 57, 0.3)" }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <span className="relative z-10 flex items-center gap-1.5 text-[#f9e4a0]">
                      <Plus className="w-4 h-4" /> Nova Apólice
                    </span>

                    <motion.div
                      className="absolute inset-y-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] w-[60%] pointer-events-none"
                      animate={{ left: ["-100%", "200%", "-100%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 6,
                        ease: "linear"
                      }}
                    />
                  </motion.button>
                </RequireRole>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={`flex items-center gap-6 border-b border-gray-200 dark:border-[#222222] transition-all duration-300 ${isFocusMode ? 'mb-2 px-6' : 'mb-4'}`}>
          <button
            onClick={() => setActiveTab('visao-geral')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'visao-geral' ? 'text-[#c4151f] dark:text-[#E04444]' : 'text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-gray-300'}`}
          >
            Visão Geral
            {activeTab === 'visao-geral' && (
              <motion.div layoutId="activeTabSeguros" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4151f] dark:bg-[#E04444]" />
            )}
          </button>
          <RequireRole roles={['admin']}>
            <button
              onClick={() => setActiveTab('audit-log')}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'audit-log' ? 'text-[#c4151f] dark:text-[#E04444]' : 'text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-gray-300'}`}
            >
              Audit Log
              {activeTab === 'audit-log' && (
                <motion.div layoutId="activeTabSeguros" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4151f] dark:bg-[#E04444]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'usuarios' ? 'text-[#c4151f] dark:text-[#E04444]' : 'text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-gray-300'}`}
            >
              Gestão de Usuários
              {activeTab === 'usuarios' && (
                <motion.div layoutId="activeTabSeguros" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4151f] dark:bg-[#E04444]" />
              )}
            </button>
          </RequireRole>
        </div>
      </div>

      {activeTab === 'visao-geral' && (
        <>
          {/* Mobile Health Score */}
          {healthScore && (
            <div className="md:hidden flex items-center justify-between p-4 mx-6 mt-0 mb-3 bg-white dark:bg-[#151515] rounded-[14px] border border-gray-100 dark:border-[#222222] shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#94A3B8]">Health Score</span>
                <span className="text-[length:var(--font-kpi)] font-light text-[#0F172A] dark:text-white leading-none mt-1">{healthScore.score}</span>
              </div>
              <div className="flex flex-col items-end">
                {healthScore.delta === 0 ? (
                  <span className="text-[12px] font-medium text-gray-500 bg-gray-100 dark:bg-[#222] px-2 py-1 rounded-md">Estável</span>
                ) : (
                  <span className={`text-[12px] font-medium px-2 py-1 rounded-md flex items-center gap-1 ${healthScore.delta > 0 ? 'text-[#639922] bg-[#639922]/10' : 'text-[#c4151f] bg-[#c4151f]/10'}`}>
                    {healthScore.delta > 0 ? '↑' : '↓'} {Math.abs(healthScore.delta)} pts na sem.
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 ${isFocusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_350px]'} flex-1 gap-x-6 gap-y-3 md:gap-y-4 lg:gap-y-6 min-h-0 px-6 pb-4 items-stretch`}>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 order-1 md:order-none kpi-grid" id="kpis-tour">
              {isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  {/* Card 1 - Taxa de Conformidade */}
                  <div
                    className="relative bg-white dark:bg-[#151515] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)] kpi-card overflow-hidden"
                    style={{ border: 'none' }}
                  >
                    <CardPulseOverlay value={conformidadeCount} color="rgba(16, 185, 129, 0.15)" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8] kpi-label" style={{ letterSpacing: '0.12em' }}>
                          TAXA DE CONFORMIDADE
                        </p>

                        <div className="mt-2 flex items-baseline gap-1 leading-none flex-wrap">
                          <span className="text-[length:var(--font-kpi)] font-light tracking-[-0.02em] text-[#0F172A] dark:text-white kpi-number kpi-value">
                            {animatedConformidade}
                          </span>
                          <span className="text-[14px] font-normal text-gray-500 dark:text-[#94A3B8] whitespace-nowrap">
                            /{conformidadeTotal}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                            apólices conformes
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[#639922]">
                            {weeklyVariation >= 0 ? '↑' : '↓'} {Math.abs(weeklyVariation)}% vs semana anterior
                          </span>
                        </div>
                      </div>

                      <div className="relative h-[44px] w-[44px] flex-shrink-0">
                        <svg viewBox="0 0 44 44" width="44" height="44" className="block -rotate-90">
                          <circle cx="22" cy="22" r="17" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="4" />
                          <circle
                            cx="22"
                            cy="22"
                            r="17"
                            fill="none"
                            stroke="#639922"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${(complianceRate / 100) * 106.8} ${106.8 - (complianceRate / 100) * 106.8}`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-[#0F172A] dark:text-white">
                          {Math.round(complianceRate)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-[9px] uppercase tracking-[0.06em] text-gray-500 opacity-60 dark:text-[#94A3B8]">
                      Evolução 8 semanas
                    </div>

                    <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)] kpi-sparkline">
                      <MemoSingleSparkline
                        values={sparklineValues}
                        area={sparklineArea}
                        line={sparklineLine}
                        gradientId={`kpi-history-gradient-${sparklineGradientId}`}
                        color="#639922"
                        ariaLabel="Evolução de conformidade nas últimas 8 semanas"
                      />
                    </div>
                  </div>

                  {/* Card 2 - A Vencer */}
                  <div
                    className="relative bg-white dark:bg-[#151515] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)] kpi-card overflow-hidden"
                    style={{ border: 'none' }}
                  >
                    <CardPulseOverlay value={expiringPolicies} color="rgba(245, 158, 11, 0.15)" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8] kpi-label" style={{ letterSpacing: '0.12em' }}>
                          A VENCER
                        </p>

                        <div className="mt-2 flex items-baseline gap-1 leading-none flex-wrap">
                          <span className="text-[length:var(--font-kpi)] font-light tracking-[-0.02em] text-[#BA7517] kpi-number kpi-value">
                            {animatedExpiring}
                          </span>
                          <span className="text-[14px] font-normal text-[#BA7517] opacity-60 whitespace-nowrap">
                            apólices
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                            nos próximos 15 dias
                          </span>
                          <span className="text-[11px] font-medium text-[#BA7517]">
                            {percAVencer}% do total
                          </span>
                        </div>
                      </div>

                      <div className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center text-[15px] text-[#BA7517]">
                        <Clock className="h-[15px] w-[15px]" />
                      </div>
                    </div>

                    <div className="mt-3 text-[9px] uppercase tracking-[0.06em] text-gray-500 opacity-60 dark:text-[#94A3B8]">
                      Vencimentos por semana
                    </div>

                    <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)] kpi-sparkline">
                      <MemoSingleSparkline
                        values={expiringSparklineValues}
                        area={expiringArea}
                        line={expiringLine}
                        gradientId={`expiring-history-gradient-${expiringSparklineId}`}
                        color="#BA7517"
                        ariaLabel="Vencimentos por semana"
                      />
                    </div>
                  </div>

                  {/* Card 3 - Vencidas */}
                  <div
                    className="relative bg-white dark:bg-[#151515] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)] kpi-card overflow-hidden"
                    style={{ border: 'none' }}
                  >
                    <CardPulseOverlay value={expiredPolicies} color="rgba(159, 18, 57, 0.15)" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8] kpi-label" style={{ letterSpacing: '0.12em' }}>
                          VENCIDAS
                        </p>

                        <div className="mt-2 flex items-baseline gap-1 leading-none flex-wrap">
                          <span className="text-[length:var(--font-kpi)] font-light tracking-[-0.02em] text-[#A32D2D] kpi-number kpi-value">
                            {animatedExpired}
                          </span>
                          <span className="text-[14px] font-normal text-[#A32D2D] opacity-60 whitespace-nowrap">
                            apólices
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                            requerem ação imediata
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[#A32D2D]">
                            ↑ {percVencidas}% do total
                          </span>
                        </div>
                      </div>

                      <div className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center text-[15px] text-[#A32D2D]">
                        <AlertCircle className="h-[15px] w-[15px]" />
                      </div>
                    </div>

                    <div className="mt-3 text-[9px] uppercase tracking-[0.06em] text-gray-500 opacity-60 dark:text-[#94A3B8]">
                      Acumulado 8 semanas
                    </div>

                    <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)] kpi-sparkline">
                      <MemoSingleSparkline
                        values={vencidasHistory}
                        area={vencidasArea}
                        line={vencidasLine}
                        gradientId={`expired-history-gradient-${expiredSparklineId}`}
                        color="#A32D2D"
                        ariaLabel="Acumulado de vencidas nas últimas 8 semanas"
                      />
                    </div>
                  </div>

                  {/* Card 4 - Valor Segurado */}
                  <div
                    className="relative bg-white dark:bg-[#151515] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
                    style={{ border: 'none' }}
                  >
                    <CardPulseOverlay value={totalCobertura} color="rgba(59, 130, 246, 0.15)" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8]" style={{ letterSpacing: '0.12em' }}>
                          COBERTURA TOTAL
                        </p>

                        <div className="mt-2 flex items-baseline gap-1 leading-none flex-nowrap whitespace-nowrap">
                          <span className="text-[length:var(--font-kpi)] font-light tracking-[-0.02em] text-[#0F172A] dark:text-white kpi-number kpi-value">
                            {formattedCoverageTotal.value}
                          </span>
                          {formattedCoverageTotal.suffix && (
                            <span className="text-[14px] font-normal text-gray-500 dark:text-[#94A3B8] whitespace-nowrap">
                              {formattedCoverageTotal.suffix}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                            valor total assegurado
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[#639922]">
                            <ChevronUp className="w-3 h-3" /> {Math.abs(Math.round(((coverageDisponivelValues[coverageDisponivelValues.length - 1] ?? totalCobertura) - (coverageDisponivelValues[coverageDisponivelValues.length - 2] ?? totalCobertura)) / Math.max(coverageDisponivelValues[coverageDisponivelValues.length - 2] ?? totalCobertura, 1) * 100))}% vs sem. ant.
                          </span>
                        </div>
                      </div>

                      <div className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center text-[15px] text-[#94A3B8]">
                        <ShieldCheck className="h-[15px] w-[15px]" />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] uppercase tracking-[0.06em] text-gray-500 opacity-60 dark:text-[#94A3B8]">
                      <span>Cobertura disp. vs sinistros</span>
                      <span className="flex items-center gap-1 normal-case tracking-normal opacity-100">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#639922]" />
                        <span>Disponível</span>
                      </span>
                      <span className="flex items-center gap-1 normal-case tracking-normal opacity-100 hide-on-laptop">
                        <span className="inline-block h-2 w-2 rounded-full border-2 border-dashed border-[#A32D2D]" />
                        <span>Sinistros pagos</span>
                      </span>
                    </div>

                    <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)]">
                      <MemoDoubleSparkline
                        values1={coverageDisponivelValues}
                        values2={coveragePagoValues}
                        area1={coverageDisponivelArea}
                        area2={coveragePagoArea}
                        line1={coverageDisponivelLine}
                        line2={coveragePagoLine}
                        gradientId1={`coverage-available-gradient-${coverageSparklineId}`}
                        gradientId2={`coverage-paid-gradient-${coverageSparklineId}`}
                        color1="#639922"
                        color2="#A32D2D"
                        globalMax={coverageGlobalMax}
                        ariaLabel="Cobertura disponível versus sinistros pagos nas últimas 8 semanas"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ActionQueuePanel aligned with Metric Cards */}
            <div className={`w-full transition-all duration-500 overflow-hidden ${isFocusMode ? 'hidden' : 'block'} order-3 md:order-none`}>
              <ActionQueuePanel onSelectLuc={(luc) => {
                if (window.innerWidth <= 640) {
                  navigate(`/seguros/apolice/${encodeURIComponent(luc)}`);
                } else {
                  setSelectedMapLuc(luc);
                }
              }} />
            </div>

            <div
              id="mapa-tour"
              className={`order-2 md:order-none grid gap-4 transition-all duration-500 md:h-[340px] lg:h-[340px] xl:h-[400px] 2xl:h-[440px] ${isFocusMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]"}`}
            >
              <div className="min-h-0 relative">
                {isLoading ? (
                  <SkeletonMap />
                ) : (
                  <ComplianceMapV2
                    selectedLuc={selectedMapLuc}
                    onSelectLuc={setSelectedMapLuc}
                    onShowMobileTable={() => {
                      if (showMobileTable) {
                        setShowMobileTable(false);
                      } else {
                        setShowMobileTable(true);
                        setTimeout(() => {
                          document.getElementById('tabela-tour')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 150);
                      }
                    }}
                    isMobileTableOpen={showMobileTable}
                  />
                )}
              </div>
              {!isFocusMode && (
                <div className="relative min-h-0 h-full">
                  <div className="absolute inset-0">
                    <SegmentRiskChart />
                  </div>
                </div>
              )}
            </div>

            {/* ComplianceSidePanel aligned with Map & Risk Chart */}
            <div className={`w-full transition-all duration-500 ${isFocusMode ? 'hidden' : (!selectedMapLuc ? 'hidden md:block' : 'block')} order-3 md:order-none relative md:min-h-0`}>
              <div className="md:absolute md:inset-0 h-full">
                <ComplianceSidePanel
                  selectedLuc={selectedMapLuc}
                  onClose={() => setSelectedMapLuc(null)}
                  onViewApolice={handleVerApolice}
                  onEditApolice={handleEditarApolice}
                  onRenovarApolice={handleRenovarApolice}
                />
              </div>
            </div>

            {/* Data Table — Hidden in Focus Mode */}
            {!isFocusMode && (
              <div className={`order-4 md:order-none transition-all duration-300 ${!showMobileTable ? 'hidden md:block' : 'block w-full mt-4 bg-white dark:bg-[#151515] rounded-xl overflow-hidden'}`}>
                {showMobileTable && (
                  <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#151515] border-b border-gray-200 dark:border-[#222]">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 8h12" /><path d="M7 12h12" /><path d="M7 16h12" /></svg>
                      Visualização da Tabela
                    </h2>
                    <button onClick={() => {
                      setShowMobileTable(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="p-1.5 bg-gray-100 dark:bg-[#222] rounded-md text-gray-600 dark:text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </div>
                )}
                <div className={`${showMobileTable ? 'p-4 flex-1' : ''}`}>
                  {isLoading ? (
                    <SkeletonTable />
                  ) : (
                    <motion.div
                      ref={tableSectionRef}
                      id="tabela-tour"
                      className={`bg-white dark:bg-[#151515] rounded-xl border overflow-hidden relative ${showMobileTable ? 'shadow-sm md:shadow-[0_1px_4px_rgba(159,18,57,0.05)]' : ''}`}
                      style={{ borderColor: colors.cardBorder, boxShadow: showMobileTable ? 'none' : `0 1px 4px ${colors.brandMaroon}0F` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <style>{`
                  .table-container {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(196,21,31,0.3) transparent;
                  }
                  .table-wrapper-outer {
                    position: relative;
                  }
                  .table-wrapper-outer::after {
                    content: '';
                    position: absolute;
                    right: 0; top: 0; bottom: 0;
                    width: 32px;
                    background: linear-gradient(to left, var(--color-background-primary, #fff), transparent);
                    pointer-events: none;
                  }
                  .dark .table-wrapper-outer::after {
                    background: linear-gradient(to left, #151515, transparent);
                  }
                  @media (max-width: 640px) {
                    .hide-on-mobile, .hide-on-laptop-sidebar-open { display: table-cell !important; }
                    .responsive-table {
                      table-layout: auto !important;
                      min-width: max-content !important;
                    }
                    .responsive-table th, .responsive-table td {
                      width: auto !important;
                      white-space: nowrap !important;
                    }
                    .sticky-col-luc {
                      position: sticky !important;
                      left: 0 !important;
                      z-index: 20 !important;
                      background-color: #fff !important;
                      border-right: 1px solid #f3f4f6 !important;
                      box-shadow: 2px 0 5px rgba(0,0,0,0.05) !important;
                    }
                    .dark .sticky-col-luc {
                      background-color: #151515 !important;
                      border-right-color: #222 !important;
                      box-shadow: 2px 0 5px rgba(0,0,0,0.2) !important;
                    }
                    .table-wrapper-outer::after { display: none !important; }
                    .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
                    .modal-content { border-radius: 20px 20px 0 0 !important; max-height: 90vh !important; width: 100% !important; animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
                  }
                  @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                  }
                  @media (min-width: 641px) {
                    .mobile-only-expanded-row { display: none !important; }
                    .table-wrapper-outer::after { display: none; }
                  }
                `}</style>
                      {/* Table wrapper */}
                      <div className="table-wrapper-outer">
                        <div className="table-container">
                          <table className="w-full min-w-[800px] lg:min-w-0 xl:min-w-[800px] text-left border-collapse responsive-table table-fixed">
                            <thead className="bg-[#F7F8FA] dark:bg-[#0a0a0a]">
                              <tr>
                                <th className="px-4 py-3 text-left w-[8%] sticky-col-luc" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  <div className="flex items-center gap-1.5">
                                    LUC
                                    <TooltipProvider>
                                      <ShadcnTooltip>
                                        <TooltipTrigger className="info-laptop-only cursor-help">
                                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[250px] text-center">
                                          <p>Algumas colunas ocultas nesta resolução. Use a Tabela Completa (Alt+T) para ver todas.</p>
                                        </TooltipContent>
                                      </ShadcnTooltip>
                                    </TooltipProvider>
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-left w-[21%] col-loja" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Loja</th>
                                <th className="px-4 py-3 text-left hide-on-mobile w-[9%] col-segmento" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Segmento</th>
                                <th className="px-4 py-3 text-left hide-on-mobile w-[15%] col-seguradora" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Seguradora</th>
                                <th className="px-4 py-3 text-left hide-on-mobile w-[10%] col-vigencia" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vigência</th>
                                <th className="px-4 py-3 text-left hide-on-mobile hide-on-laptop-sidebar-open w-[10%]" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vencimento</th>

                                <th className="px-4 py-3 text-left w-[12%]" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '110px' }}>Status</th>
                                <th className="px-4 py-3 text-left hide-on-mobile hide-on-laptop-sidebar-open w-[14%] col-cobertura" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cobertura</th>
                                <th className="px-4 py-3 text-left w-[9%]" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Dias rest.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedPolicies.length === 0
                                ? renderEmptyState()
                                : paginatedPolicies.map((policy, index) => (
                                  <React.Fragment key={index}>
                                    <tr
                                      onClick={() => handleVerApolice(policy.id)}
                                      onMouseEnter={() => setHoveredPolicyId(policy.id)}
                                      onMouseLeave={() => setHoveredPolicyId(null)}
                                      className="border-b h-12 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2435] transition-all cursor-pointer relative hover:z-10 hover:shadow-md"
                                      style={{ borderColor: colors.cardBorder }}
                                    >
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 table-number truncate sticky-col-luc">{policy.id}</td>
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 col-loja truncate" title={policy.lojista}>{policy.lojista}</td>
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 hide-on-mobile col-segmento truncate" title={policy.tipo}>{policy.tipo}</td>
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 hide-on-mobile col-seguradora truncate" title={policy.seguradora}>{policy.seguradora}</td>
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 table-number hide-on-mobile col-vigencia truncate">{policy.vigencia}</td>
                                      <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100 table-number hide-on-mobile hide-on-laptop-sidebar-open truncate">{policy.vencimento}</td>
                                      <td className="px-4 py-3 truncate" style={{ minWidth: '110px' }}>
                                        {renderStatusBadge(policy.status)}
                                      </td>
                                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900 dark:font-normal dark:text-gray-100 table-number hide-on-mobile hide-on-laptop-sidebar-open col-cobertura truncate" title={formatCurrency(policy.cobertura || generateCoverageValue(policy.id))}>
                                        {formatCurrency(policy.cobertura || generateCoverageValue(policy.id))}
                                      </td>
                                      <td className="px-4 py-3 text-[13px] table-number">
                                        <span className={`font-semibold ${(policy.dias_restantes ?? 0) < 0 ? 'text-red-600 dark:text-red-400' :
                                            (policy.dias_restantes ?? 0) <= 30 ? 'text-orange-600 dark:text-orange-400' :
                                              'text-green-600 dark:text-green-400'
                                          }`}>
                                          {policy.dias_restantes !== undefined ? `${policy.dias_restantes}d` : '-'}
                                        </span>
                                      </td>
                                    </tr>
                                    {/* Removed mobile expanded row */}
                                  </React.Fragment>
                                ))
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px]" style={{ backgroundColor: colors.pageBg, color: colors.brandMaroon }}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">Linhas por página:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1); // Resetar para a primeira página ao mudar
                            }}
                            className="border rounded px-2 py-1 bg-white dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                            style={{ borderColor: colors.cardBorder }}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-center items-center">
                          <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                          >
                            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                          </button>

                          {getPageNumbers().map((page, index) => (
                            <button
                              key={index}
                              onClick={() => typeof page === 'number' && handlePageClick(page)}
                              disabled={typeof page !== 'number'}
                              className={`w-7 h-7 rounded flex items-center justify-center text-[12px] font-medium transition-all outline-none ${page === currentPage
                                ? 'bg-[#c4151f]/10 text-[#c4151f] border border-[#c4151f] dark:bg-[#c4151f]/20 dark:text-[#E23B44] dark:border-[#E23B44]'
                                : typeof page === 'number'
                                  ? 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#151515] border border-transparent'
                                  : 'bg-transparent text-gray-400 cursor-default border border-transparent'
                                }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalFilteredPages}
                            className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                          >
                            <ChevronRight className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Atividade Recente aligned with Table */}
            <div className={`w-full flex-col min-h-[250px] transition-all duration-500 overflow-hidden ${isFocusMode ? 'hidden' : 'flex'} order-5 md:order-none`}>
              {/* 3. Atividade Recente */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key="atividade-recente"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.1, delay: 0 } }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30, delay: 0.2 }}
                  className="bg-white dark:bg-[#151515] rounded-xl border flex-1 flex flex-col relative w-full min-h-[250px]"
                  style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: colors.cardBorder }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#8B1A1A]/10 dark:bg-[#E04444]/10 flex items-center justify-center">
                        <Activity className="w-3.5 h-3.5 text-[#8B1A1A] dark:text-[#E04444]" />
                      </div>
                      <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">Atividade Recente</h3>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-[#64748B] font-medium uppercase tracking-wide">
                      {selectedMapLuc ? 'Desta apólice' : 'Últimas ações'}
                    </span>
                  </div>

                  <div className="divide-y overflow-y-auto flex-1" style={{ borderColor: colors.cardBorder }}>
                    {(selectedMapLuc ? loadingLocal : loadingAtividades) ? (
                      <div className="flex flex-col gap-3 p-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-start gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-[#0a0a0a] shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-gray-200 dark:bg-[#0a0a0a] rounded w-3/4" />
                              <div className="h-2.5 bg-gray-100 dark:bg-[#1E2435] rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (selectedMapLuc ? localActivities : atividadesRecentes).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#0a0a0a] flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-[12px] text-gray-400 dark:text-[#64748B] text-center">Nenhuma atividade registrada ainda.<br />Crie ou edite uma apólice para começar.</p>
                      </div>
                    ) : (
                      (selectedMapLuc ? localActivities : atividadesRecentes).map((atividade, i) => {
                        const iconConfig: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
                          criada: { icon: <FilePlus className="w-3.5 h-3.5" />, bg: 'bg-[#1c3d32]/10 dark:bg-[#1c3d32]/30', text: 'text-[#1c3d32] dark:text-[#2E7A5A]' },
                          editada: { icon: <FilePenLine className="w-3.5 h-3.5" />, bg: 'bg-[#bc9b7c]/15 dark:bg-[#bc9b7c]/20', text: 'text-[#8a6845] dark:text-[#D1B7A1]' },
                          renovada: { icon: <RefreshCw className="w-3.5 h-3.5" />, bg: 'bg-[#788033]/15 dark:bg-[#788033]/30', text: 'text-[#5a6121] dark:text-[#A3AD44]' },
                          excluida: { icon: <Trash2 className="w-3.5 h-3.5" />, bg: 'bg-[#c4151f]/10 dark:bg-[#c4151f]/30', text: 'text-[#c4151f] dark:text-[#E23B44]' },
                          observacoes: { icon: <FileText className="w-3.5 h-3.5" />, bg: 'bg-[#6e150e]/10 dark:bg-[#6e150e]/30', text: 'text-[#6e150e] dark:text-[#D45044]' },
                        };
                        const cfg = iconConfig[atividade.acao] ?? iconConfig['editada'];
                        const acaoLabel: Record<string, string> = {
                          criada: 'criou', editada: 'editou',
                          renovada: 'renovou', excluida: 'excluiu',
                          observacoes: 'atualizou as observações d'
                        };

                        const timeAgo = atividade.timestamp
                          ? formatDistanceToNow(parseISO(String(atividade.timestamp)), { locale: ptBR, addSuffix: true })
                          : 'data não disponível';

                        const actionWord = acaoLabel[atividade.acao] ?? 'editou';
                        const isObs = atividade.acao === 'observacoes';

                        return (
                          <div
                            key={atividade.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors cursor-pointer opacity-0"
                            onClick={() => handleVerApolice(atividade.luc)}
                            style={{ animation: 'slideInTop 0.3s ease forwards', animationDelay: `${i * 60}ms` }}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text} mt-0.5`}>
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[12px] text-gray-600 dark:text-[#CBD5E1] leading-relaxed">
                                <span className="font-semibold text-gray-900 dark:text-white">{atividade.responsavel || 'Usuário'}</span> {actionWord} {isObs ? 'a' : 'a apólice da'} <span className="font-medium text-gray-900 dark:text-white">{atividade.nome_loja || atividade.luc}</span>
                                <span className="text-gray-400 dark:text-[#64748B] whitespace-nowrap inline-block ml-1">
                                  · {timeAgo}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Modal Ver Apólice */}
          {showViewApoliceModal && selectedPolicy && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
              <div className="bg-white dark:bg-[#151515] rounded-xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto modal-content" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
                <div className="sticky top-0 bg-white dark:bg-[#151515] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-[length:var(--font-page-title)] font-bold" style={{ color: colors.brandMaroon }}>Apólice {selectedPolicy.id}</h2>
                      <span
                        className="px-3 py-1 rounded-full text-[12px] font-medium"
                        style={getStatusBadgeStyle(selectedPolicy.status)}
                      >
                        {selectedPolicy.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">{selectedPolicy.tipo}</p>

                    {/* Metadados de Auditoria */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                        <User className="w-3 h-3" strokeWidth={1.5} />
                        <span>Criado por: <span className="font-medium">Maria</span> em 10/03/2025 14:32</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                        <User className="w-3 h-3" strokeWidth={1.5} />
                        <span>Atualizado por: <span className="font-medium">João</span> em 12/03/2025 09:10</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={handleCloseModals}
                    className="text-gray-400 dark:text-[#64748B]"
                    whileHover={{
                      scale: 1.1,
                      color: isDarkMode ? '#94A3B8' : '#4B5563'
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                <div className="p-4 md:p-6 space-y-6">
                  {/* Informações Principais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.pageBg }}>
                      <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-1">Seguradora</div>
                      <div className="text-[16px] font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.seguradora}</div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.pageBg }}>
                      <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-1">Número da Apólice</div>
                      <div className="text-[16px] font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.id}</div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.pageBg }}>
                      <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-1">Data de Vigência</div>
                      <div className="text-[16px] font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.vigencia}</div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.pageBg }}>
                      <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-1">Data de Vencimento</div>
                      <div className="text-[16px] font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.vencimento}</div>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="border rounded-lg p-4 md:p-6" style={{ borderColor: colors.cardBorder }}>
                    <h3 className="text-[14px] font-bold mb-4" style={{ color: colors.brandMaroon }}>Valores da Apólice</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-2">Cobertura Total</div>
                        <div className="text-[length:var(--font-page-title)] font-bold" style={{ color: colors.forest }}>{selectedPolicy.cobertura}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-2">Prêmio Anual</div>
                        <div className="text-[length:var(--font-page-title)] font-bold" style={{ color: colors.brandRed }}>{selectedPolicy.premio}</div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                    <button
                      onClick={() => {
                        const element = document.createElement('a');
                        element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Apólice: ${selectedPolicy?.id}\nTipo: ${selectedPolicy?.tipo}\nSeguradora: ${selectedPolicy?.seguradora}\nVigência: ${selectedPolicy?.vigencia}\nVencimento: ${selectedPolicy?.vencimento}\nStatus: ${selectedPolicy?.status}\nCobertura: ${selectedPolicy?.cobertura}\nPrêmio: ${selectedPolicy?.premio}`);
                        element.download = `apolice-${selectedPolicy?.id}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className={`${canEdit ? 'flex-1' : 'w-full'} px-4 py-3 border dark:border-[#222222] rounded-lg text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#0a0a0a]`}
                      style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                    >
                      Download
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleEditarApolice(selectedPolicy.id)}
                        className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                        style={{ backgroundColor: colors.brandRed }}
                      >
                        <Edit className="w-4 h-4" strokeWidth={1.5} />
                        Editar Apólice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <PolicyRenewalWizard
            open={isRenewalWizardOpen}
            onOpenChange={setIsRenewalWizardOpen}
            apoliceId={renewalApoliceId}
            onSuccess={() => {
              setIsRenewalWizardOpen(false);
              fetchPolicies();
              fetchAtividadesGlobais();
            }}
          />

          {/* Modal Conformidade das Lojas */}
          <AnimatePresence>
            {showConformidadeModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}
                onClick={handleCloseModals}
              >
                <motion.div
                  className="bg-white dark:bg-[#151515] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                  style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="bg-white dark:bg-[#151515] border-b p-6 flex items-center justify-between rounded-t-xl" style={{ borderColor: colors.cardBorder }}>
                    <div>
                      <h2 className="text-[length:var(--font-page-title)] font-bold" style={{ color: colors.brandMaroon }}>Conformidade das Lojas</h2>
                      <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Lojas com apólices vencidas que precisam de regularização</p>
                    </div>
                    <motion.button
                      onClick={handleCloseModals}
                      className="text-gray-400 dark:text-[#64748B]"
                      whileHover={{
                        scale: 1.1,
                        color: isDarkMode ? '#94A3B8' : '#4B5563'
                      }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Alerta de Não Conformidade */}
                    <div className="flex items-start gap-3 p-4 rounded-lg border" style={{ backgroundColor: `${colors.brandRed}08`, borderColor: `${colors.brandRed}30` }}>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.brandRed }} strokeWidth={1.5} />
                      <div>
                        <div className="text-[13px] font-semibold mb-1" style={{ color: colors.brandMaroon }}>Atenção: 9 lojas em situação de não conformidade</div>
                        <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">
                          As lojas abaixo possuem apólices vencidas e precisam ser notificadas para regularização imediata.
                        </div>
                      </div>
                    </div>

                    {/* Lista de Lojas Não Conformes */}
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.cardBorder }}>
                      <div className="bg-gray-50 dark:bg-[#0a0a0a] px-4 py-3 border-b" style={{ borderColor: colors.cardBorder }}>
                        <div className="grid grid-cols-12 gap-4 text-[11px] font-bold text-gray-600 dark:text-[#94A3B8] uppercase">
                          <div className="col-span-3">Loja</div>
                          <div className="col-span-6">Motivo da Não Conformidade</div>
                          <div className="col-span-3 text-right">Ação</div>
                        </div>
                      </div>

                      <div className="divide-y" style={{ borderColor: colors.cardBorder }}>
                        {nonConformingStores.map((store, index) => (
                          <motion.div
                            key={index}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
                          >
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3">
                                <div className="text-[13px] font-semibold" style={{ color: colors.brandMaroon }}>{store.nome}</div>
                              </div>
                              <div className="col-span-6">
                                <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">{store.motivo}</div>
                                <div className="text-[11px] mt-1 px-2 py-0.5 rounded-full inline-block" style={{
                                  backgroundColor: `${colors.brandRed}15`,
                                  color: colors.brandRed
                                }}>
                                  {store.tipo}
                                </div>
                              </div>
                              <div className="col-span-3 text-right">
                                <motion.button
                                  onClick={() => {
                                    alert(`Notificação enviada para ${store.nome}!\n\nA loja receberá um comunicado sobre a necessidade de regularização da apólice.`);
                                  }}
                                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg text-white"
                                  style={{ backgroundColor: colors.brandRed }}
                                  whileHover={{
                                    scale: 1.05,
                                    filter: "brightness(1.1)",
                                    boxShadow: `0 4px 12px ${colors.brandRed}40`
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                >
                                  Notificar Lojista
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                      <motion.button
                        onClick={handleCloseModals}
                        className="flex-1 px-4 py-3 border dark:border-[#222222] rounded-lg text-[13px] font-semibold"
                        style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                        whileHover={{
                          scale: 1.05,
                          backgroundColor: isDarkMode ? '#0a0a0a' : '#F9FAFB',
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        Fechar
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          alert("Notificação em lote enviada para todas as 9 lojas!\n\nTodas as lojas receberão um comunicado sobre a necessidade de regularização das apólices.");
                        }}
                        className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white"
                        style={{ backgroundColor: colors.brandRed }}
                        whileHover={{
                          scale: 1.05,
                          filter: "brightness(1.1)",
                          boxShadow: `0 8px 20px ${colors.brandRed}40`
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        Notificar Todas as Lojas
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal Upload de Apólice */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
              <div className="bg-white dark:bg-[#151515] rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
                <div className="sticky top-0 bg-white dark:bg-[#151515] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
                  <div>
                    <h2 className="text-[length:var(--font-page-title)] font-bold" style={{ color: colors.brandMaroon }}>Upload de Apólice</h2>
                    <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Envie o arquivo PDF da apólice</p>
                  </div>
                  <motion.button
                    onClick={handleCloseModals}
                    className="text-gray-400 dark:text-[#64748B]"
                    whileHover={{
                      scale: 1.1,
                      color: isDarkMode ? '#94A3B8' : '#4B5563'
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                <div className="p-4 md:p-6 space-y-6">
                  {/* Dropzone Area */}
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-[#1c3d32] bg-[#1c3d32]/5' : 'border-gray-300 hover:border-[#1c3d32] hover:bg-gray-50 dark:hover:bg-[#0a0a0a]'
                      }`}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center gap-4">
                      <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-[#1c3d32]' : 'bg-gray-100'
                        }`}>
                        <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-gray-400 dark:text-[#64748B]'
                          }`} strokeWidth={1.5} />
                      </div>

                      {uploadedFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <FileText className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                            <div className="flex-1 text-left">
                              <div className="text-[13px] font-semibold text-green-900">{uploadedFile.name}</div>
                              <div className="text-[11px] text-green-700">
                                {(uploadedFile.size / 1024).toFixed(2)} KB
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedFile(null);
                              }}
                              className="p-1 hover:bg-green-200 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-green-700" strokeWidth={1.5} />
                            </button>
                          </div>
                          <p className="text-[12px] text-gray-600 dark:text-[#94A3B8]">
                            Clique em "Confirmar Upload" para processar o arquivo
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[14px] font-semibold" style={{ color: colors.brandMaroon }}>
                            {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo PDF aqui'}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-[#94A3B8]">
                            ou clique para selecionar do seu computador
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-[#64748B]">
                            Apenas arquivos PDF • Tamanho máximo: 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações Importantes */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: `${colors.olive}10` }}>
                    <h4 className="text-[12px] font-bold mb-2" style={{ color: colors.brandMaroon }}>Informações sobre o Upload</h4>
                    <ul className="space-y-1 text-[11px] text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>O arquivo PDF será processado automaticamente</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>Dados principais como número, seguradora e vigência serão extraídos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>Você poderá revisar e editar as informações antes de salvar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">•</span>
                        <span>O documento original ficará anexado à apólice</span>
                      </li>
                    </ul>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                    <button
                      onClick={handleCloseModals}
                      className="flex-1 px-4 py-3 border dark:border-[#222222] rounded-lg text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#0a0a0a]"
                      style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmUpload}
                      disabled={!uploadedFile}
                      className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: colors.brandRed }}
                    >
                      <Upload className="w-4 h-4" strokeWidth={1.5} />
                      Confirmar Upload
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Editar Apólice */}
          <AnimatePresence>
            {showEditApoliceModal && selectedPolicy && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCloseModals}
                  className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
                  className="relative bg-white dark:bg-[#151515] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-[#222222] flex flex-col max-h-[90vh]"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#0a0a0a]/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#151515] flex items-center justify-center shadow-sm border border-gray-100 dark:border-[#222222]">
                        <Shield className="w-6 h-6 text-[#168821] dark:text-[#22c55e]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Apólice</h2>
                        <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-0.5">LUC: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedPolicy.id}</span> • {selectedPolicy.lojista}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseModals}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#151515] dark:hover:text-gray-300 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Content */}
                  <form onSubmit={handleSubmitEditApolice} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">LUC *</label>
                          <input
                            type="text"
                            required
                            disabled
                            value={formData.luc}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-gray-100 dark:bg-[#0a0a0a] text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Loja *</label>
                          <input
                            type="text"
                            required
                            value={formData.lojista}
                            onChange={(e) => setFormData({ ...formData, lojista: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Segmento *</label>
                          <select
                            required
                            value={formData.tipo}
                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          >
                            <option value="Seguro Incêndio">Incêndio e Explosão</option>
                            <option value="Responsabilidade Civil">Responsabilidade Civil</option>
                            <option value="Roubo e Furto">Roubo e Furto</option>
                            <option value="Danos Elétricos">Danos Elétricos</option>
                            <option value="Alagamento e Infiltração">Alagamento e Infiltração</option>
                            <option value="Vidros e Fachadas">Vidros e Fachadas</option>
                            <option value="Equipamentos">Equipamentos</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Seguradora *</label>
                          <input
                            type="text"
                            required
                            value={formData.seguradora}
                            onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Data de Vigência *</label>
                          <input
                            type="text"
                            required
                            value={formData.vigencia}
                            onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
                            placeholder="DD/MM/AAAA"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Data de Vencimento *</label>
                          <input
                            type="text"
                            required
                            value={formData.vencimento}
                            onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                            placeholder="DD/MM/AAAA"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Cobertura *</label>
                          <input
                            type="text"
                            required
                            value={formData.cobertura}
                            onChange={(e) => setFormData({ ...formData, cobertura: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 dark:border-[#222222] bg-gray-50/50 dark:bg-[#0a0a0a]/50 flex items-center justify-end gap-3 mt-auto">
                      <button
                        type="button"
                        onClick={handleCloseModals}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-[#222222] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#168821] hover:bg-[#126b1a] shadow-sm shadow-[#168821]/20 transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {activeTab === 'audit-log' && (
        <div className="flex-1 overflow-auto">
          <div className="p-6 pt-0 space-y-6 max-w-[1600px] mx-auto w-full">
            <AuditLog isTab />
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="flex-1 overflow-auto">
          <div className="p-6 pt-0 space-y-6 max-w-[1600px] mx-auto w-full">
            <Usuarios />
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!isFocusMode && !showViewApoliceModal && !showEditApoliceModal && !isRenewalWizardOpen && !showUploadModal && !showConformidadeModal && (
        <RequireRole roles={['admin', 'gestor']}>
          <button
            onClick={handleNovaApolice}
            className="md:hidden fixed z-[50] flex items-center justify-center gap-2 transition-transform active:scale-95 btn-shimmer-brand"
            style={{
              bottom: '20px',
              right: '16px',
              borderRadius: '50px',
              padding: '12px 20px',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 4px 16px rgba(196,21,31,0.4)'
            }}
          >
            <Plus className="w-5 h-5" /> Nova Apólice
          </button>
        </RequireRole>
      )}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[120] bg-white dark:bg-[#151515] rounded-t-2xl shadow-xl flex flex-col lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="p-4 border-b border-gray-100 dark:border-[#222] flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5" /> Filtros
                </h3>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-gray-100 dark:bg-[#222] rounded-full text-gray-600 dark:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Seguradora</label>
                  <Select value={seguradoraFilter} onValueChange={setSeguradoraFilter}>
                    <SelectTrigger className="h-12 w-full text-[14px]">
                      <SelectValue placeholder="Todas Seguradoras" />
                    </SelectTrigger>
                    <SelectContent className="z-[130] bg-white dark:bg-[#151515]">
                      <SelectItem value="todas">Todas Seguradoras</SelectItem>
                      {uniqueSeguradoras.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Segmento</label>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="h-12 w-full text-[14px]">
                      <SelectValue placeholder="Todos Segmentos" />
                    </SelectTrigger>
                    <SelectContent className="z-[130] bg-white dark:bg-[#151515]">
                      <SelectItem value="todos">Todos Segmentos</SelectItem>
                      {uniqueTipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 w-full text-[14px]">
                      <SelectValue placeholder="Todos Status" />
                    </SelectTrigger>
                    <SelectContent className="z-[130] bg-white dark:bg-[#151515]">
                      <SelectItem value="todas">Todos Status</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="a vencer">A Vencer</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="mt-2 w-full py-3 bg-[#9F1239] text-white rounded-xl font-bold text-[14px]"
                >
                  Aplicar Filtros
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <PolicyCreationWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          fetchPolicies(); // Refresh the list
        }}
      />

      {/* ── Modal Relatório Executivo com IA ── */}
      <AnimatePresence>
        {showRelatorioModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="relatorio-backdrop"
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loadingRelatorio && setShowRelatorioModal(false)}
            />

            {/* Modal Panel */}
            <motion.div
              key="relatorio-panel"
              className="fixed z-[201] inset-0 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div
                className="pointer-events-auto relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #3e0000 0%, #6e150e 40%, #3e0000 100%)',
                  border: '1px solid rgba(196,21,31,0.35)',
                  boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(196,21,31,0.15)',
                }}
              >
                {/* Decorative gradient top bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, #c4151f, #f9e4a0, #bc9b7c, #c4151f)' }}
                />

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6e150e, #c4151f)' }}
                    >
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold text-white leading-tight">Relatório Executivo</h2>
                      <p className="text-[11px] text-[#bc9b7c] font-medium">Gerado por Gemini Flash</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRelatorioModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#bc9b7c] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-6 h-px" style={{ background: 'rgba(196,21,31,0.2)' }} />

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
                  {loadingRelatorio ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="relative w-14 h-14">
                        <div
                          className="absolute inset-0 rounded-full animate-spin"
                          style={{ background: 'conic-gradient(from 0deg, #c4151f, #f9e4a0, transparent)', padding: '2px' }}
                        >
                          <div className="w-full h-full rounded-full" style={{ background: '#3e0000' }} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#f9e4a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[#f9e4a0] font-semibold text-[14px]">Analisando dados do dashboard...</p>
                        <p className="text-[#bc9b7c] text-[12px] mt-1">A IA está processando as métricas de conformidade</p>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#f9e4a0]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div
                        className="report-content text-[13px] leading-[1.75] font-sans break-words [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>h1]:text-[16px] [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:mt-4 [&>h2]:text-[15px] [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-4 [&>h3]:text-[14px] [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-3"
                        style={{ color: '#bc9b7c' }}
                      >
                        <ReactMarkdown>{relatorioTexto}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                {!loadingRelatorio && relatorioTexto && (
                  <div className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 py-4 gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(196,21,31,0.2)' }}>
                    <p className="text-[11px] text-[#bc9b7c] w-full text-center md:text-left md:w-auto hidden sm:block">
                      {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(relatorioTexto);
                          toast.success('Relatório copiado para a área de transferência');
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 md:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium text-[#bc9b7c] hover:text-white bg-white/5 md:bg-transparent hover:bg-white/10 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">Copiar texto</span>
                        <span className="sm:hidden">Copiar</span>
                      </button>
                      <button
                        onClick={() => {
                          exportRelatorioToPDF(relatorioTexto, "relatorio_executivo_flamboyant.pdf");
                          toast.success('Download do PDF iniciado');
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 md:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium text-[#bc9b7c] hover:text-white bg-white/5 md:bg-transparent hover:bg-white/10 transition-colors"
                      >
                        <IconDownload className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Baixar PDF</span>
                        <span className="sm:hidden">Baixar</span>
                      </button>
                      <button
                        onClick={handleGerarRelatorio}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 md:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-colors btn-shimmer-brand text-[#f9e4a0]"
                      >
                        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                        Regenerar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const MemoSingleSparkline = memo(({
  values, area, line, gradientId, color, ariaLabel
}: any) => {
  return (
    <svg width="100%" height="44" viewBox="0 0 280 44" preserveAspectRatio="none" className="block overflow-hidden" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="75%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} d={area} fill={`url(#${gradientId})`} />}
      {line && (
        <>
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="280" cy={(() => {
            const minY = 36;
            const maxY = 8;
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            const range = Math.max(maxValue - minValue, 1);
            const normalized = (values[values.length - 1] - minValue) / range;
            return minY - normalized * (minY - maxY);
          })()} r="2.5" fill={color} />
        </>
      )}
    </svg>
  );
}, (prev, next) => JSON.stringify(prev.values) === JSON.stringify(next.values));

const MemoDoubleSparkline = memo(({
  values1, values2, area1, area2, line1, line2, gradientId1, gradientId2, color1, color2, globalMax, ariaLabel
}: any) => {
  return (
    <svg width="100%" height="44" viewBox="0 0 280 44" preserveAspectRatio="none" className="block overflow-hidden" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gradientId1} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} stopOpacity="0.40" />
          <stop offset="75%" stopColor={color1} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color1} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color2} stopOpacity="0.35" />
          <stop offset="75%" stopColor={color2} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color2} stopOpacity="0" />
        </linearGradient>
      </defs>

      {area1 && <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} d={area1} fill={`url(#${gradientId1})`} />}
      {area2 && <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} d={area2} fill={`url(#${gradientId2})`} />}

      {line1 && (
        <>
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} d={line1} fill="none" stroke={color1} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="280" cy={(() => {
            const minY = 36;
            const maxY = 8;
            const normalized = values1[values1.length - 1] / globalMax;
            return minY - normalized * (minY - maxY);
          })()} r="2.5" fill={color1} />
        </>
      )}
      {line2 && (
        <>
          <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} d={line2} fill="none" stroke={color2} strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="280" cy={(() => {
            const minY = 36;
            const maxY = 8;
            const normalized = values2[values2.length - 1] / globalMax;
            return minY - normalized * (minY - maxY);
          })()} r="2.5" fill={color2} />
        </>
      )}
    </svg>
  );
}, (prev, next) => JSON.stringify(prev.values1) === JSON.stringify(next.values1) && JSON.stringify(prev.values2) === JSON.stringify(next.values2));

