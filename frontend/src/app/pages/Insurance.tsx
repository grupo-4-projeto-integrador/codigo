import { Shield, Bell, AlertTriangle, AlertCircle, Plus, Search, MoreVertical, Activity, FolderOpen, Clock, BarChart3, Calendar, FileText, Edit, ChevronRight, ChevronLeft, Upload, X, ChevronUp, ChevronDown, User, Filter, CheckCircle2, SlidersHorizontal, Info, ShoppingBag, ShieldCheck, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { useState, useEffect, useRef, useId } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useUserProfile } from "../contexts/UserProfileContext";
import { ComplianceMapV2, ComplianceSidePanel } from "../components/ComplianceMapV2";
import { SegmentRiskChart } from "../components/SegmentRiskChart";
import { ActionQueuePanel } from "../components/ActionQueuePanel";
import { getSelectedApoliceLuc, subscribeSelectedApoliceLuc, setMapFilters } from "../store";
import { formatLargeCurrency } from "../utils/currency";
import { request } from "../../api/client";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { IconDownload } from '@tabler/icons-react';
import { exportToCSV, exportToXLSX } from '../utils/exportUtils';
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

export function Insurance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [periodFilter, setPeriodFilter] = useState("6meses");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Advanced filter states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [seguradoraFilter, setSeguradoraFilter] = useState("todas");
  const [vigenciaFilter, setVigenciaFilter] = useState("");
  const [vencimentoFilter, setVencimentoFilter] = useState("");

  // Modal states
  const [showNovaApoliceModal, setShowNovaApoliceModal] = useState(false);
  const [showViewApoliceModal, setShowViewApoliceModal] = useState(false);
  const [showEditApoliceModal, setShowEditApoliceModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConformidadeModal, setShowConformidadeModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Table sorting states
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedLuc, setSelectedLuc] = useState(getSelectedApoliceLuc());

  // User profile and permissions from context
  const { canEdit } = useUserProfile();
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

  useEffect(() => {
    // Sync search query with URL params
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

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
    cardBorder: isDarkMode ? "#2E3447" : "#f0ede8"
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
  const sparklineGradientId = useId().replace(/:/g, "-");
  const expiringSparklineId = useId().replace(/:/g, "-");
  const expiredSparklineId = useId().replace(/:/g, "-");
  const coverageSparklineId = useId().replace(/:/g, "-");

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
  const formattedCoverageTotal = formatLargeCurrency(totalCobertura);

  const conformidadeCount = conformesHistory?.current ?? activePolicies;
  const conformidadeTotal = conformesHistory?.total ?? 290;
  const complianceRate = conformidadeTotal > 0 ? (conformidadeCount / conformidadeTotal) * 100 : 0;
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

  useEffect(() => {
    const fetchPolicies = async () => {
      setIsLoading(true);
      try {
        const data = await request<any[]>('/apolices');
        setAllPolicies(data || []);
      } catch (err) {
        console.error("Failed to fetch policies", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicies();
  }, []);

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


  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  // Helper function to convert DD/MM/YYYY to Date object
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredPolicies = allPolicies.filter(policy => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      String(policy.lojista || '').toLowerCase().includes(searchLower) ||
      String(policy.tipo || '').toLowerCase().includes(searchLower) ||
      String(policy.id || '').toLowerCase().includes(searchLower) ||
      String(policy.seguradora || '').toLowerCase().includes(searchLower) ||
      String(policy.status || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === "todas" ||
      String(policy.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesTipo = tipoFilter === "todos" || policy.tipo === tipoFilter;
    const matchesSeguradora = seguradoraFilter === "todas" || policy.seguradora === seguradoraFilter;

    // Date filtering logic
    const matchesVigencia = !vigenciaFilter || parseDate(policy.vigencia).toDateString() === new Date(vigenciaFilter).toDateString();
    const matchesVencimento = !vencimentoFilter || parseDate(policy.vencimento).toDateString() === new Date(vencimentoFilter).toDateString();

    return matchesSearch && matchesStatus && matchesTipo && matchesSeguradora && matchesVigencia && matchesVencimento;
  });

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

  // Paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPolicies = sortedPolicies.slice(startIndex, endIndex);
  const totalFilteredPages = Math.ceil(sortedPolicies.length / itemsPerPage);

  // Handlers
  const handleNovaApolice = () => {
    setFormData({
      tipo: "",
      seguradora: "",
      vigencia: "",
      vencimento: "",
      cobertura: "",
      premio: "",
      observacoes: ""
    });
    setShowNovaApoliceModal(true);
  };

  const handleVerApolice = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    setSelectedPolicy(policy);
    setShowViewApoliceModal(true);
  };

  const handleEditarApolice = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    if (policy) {
      setFormData({
        luc: policy.id || policy.luc || "",
        lojista: policy.lojista || policy.fantasia || "",
        tipo: policy.tipo || "",
        seguradora: policy.seguradora || "",
        vigencia: policy.vigencia || "",
        vencimento: policy.vencimento || "",
        cobertura: policy.cobertura || ""
      });
      setSelectedPolicy(policy);
      setShowViewApoliceModal(false);
      setShowEditApoliceModal(true);
    }
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

  const handleSubmitNovaApolice = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Nova apólice criada com sucesso!\n\nTipo: ${formData.tipo}\nSeguradora: ${formData.seguradora}`);
    setShowNovaApoliceModal(false);
  };

  const handleSubmitEditApolice = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Apólice ${selectedPolicy?.id} atualizada com sucesso!`);
    setShowEditApoliceModal(false);
  };

  const handleCloseModals = () => {
    setShowNovaApoliceModal(false);
    setShowViewApoliceModal(false);
    setShowEditApoliceModal(false);
    setShowRenovarModal(false);
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
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      } else {
        alert('Por favor, envie apenas arquivos PDF');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      } else {
        alert('Por favor, envie apenas arquivos PDF');
      }
    }
  };

  const handleConfirmUpload = () => {
    if (uploadedFile) {
      alert(`Arquivo "${uploadedFile.name}" enviado com sucesso!\n\nA apólice será processada e adicionada ao sistema.`);
      handleCloseModals();
    }
  };

  const handleRenovarApolice = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    setSelectedPolicy(policy);
    setShowRenovarModal(true);
  };

  const handleConfirmarRenovacao = () => {
    alert(`Renovação da apólice ${selectedPolicy?.id} confirmada!\n\nA apólice será renovada por mais 12 meses.`);
    setShowRenovarModal(false);
    setSelectedPolicy(null);
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
    if (dias <= 30) return colors.olive;
    return colors.forest;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Ativa":
      case "Conforme":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conforme
          </span>
        );
      case "A Vencer":
      case "A vencer":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap bg-[#FFF3E0] text-[#E65100] border border-[#E65100]/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            A vencer
          </span>
        );
      case "Vencida":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap bg-[#FFEBEE] text-[#C62828] border border-[#C62828]/20">
            <Clock className="w-3.5 h-3.5" />
            Vencida
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
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
              className="px-4 py-2 bg-gray-100 dark:bg-[#242938] hover:bg-gray-200 dark:hover:bg-[#2E3447] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Limpar busca e filtros
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full gap-3 md:gap-4 lg:gap-6" style={{ backgroundColor: colors.pageBg }}>
        {/* Main Content Area */}
        <div className="flex-1 space-y-3 md:space-y-4 lg:space-y-6 overflow-y-auto">
          {/* Breadcrumb & Sync Status */}
          <div className="hidden md:flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8]">
              <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }} onClick={() => navigate('/dashboard')}>Shopping Flamboyant</span>
              <ChevronRight className="w-3 h-3" />
              <span className="cursor-pointer hover:opacity-70 font-medium" style={{ color: '#9F1239' }}>Seguros</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-medium text-gray-800 dark:text-gray-300">Dashboard</span>
            </div>
            
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-[#94A3B8] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              Sincronizado em {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              <button className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-[#2E3447] rounded-md transition-colors"><Activity className="w-3 h-3"/></button>
            </div>
          </div>

          {/* Title + Search/Filters Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Mapa de Conformidade por LUC</h1>
              <p className="text-[13px] text-gray-500 dark:text-[#94A3B8] mt-1">Visualização consolidada da conformidade das apólices por loja.</p>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-2.5">
              <div className="relative w-[180px] xl:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Buscar por loja, LUC ou segmento..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#9F1239] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  style={{ color: colors.brandMaroon }}
                />
              </div>

              <div className="relative flex items-center">
                <select
                  value={seguradoraFilter}
                  onChange={(e) => setSeguradoraFilter(e.target.value)}
                  className={`max-w-[120px] truncate px-3 py-2 border rounded-lg text-[13px] font-medium focus:outline-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)] appearance-none pr-8 bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px_12px] transition-colors ${seguradoraFilter !== 'todas' ? 'border-[#c4151f] text-white' : 'bg-white dark:bg-[#242938] border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-200'}`}
                  style={{
                    backgroundColor: seguradoraFilter !== 'todas' ? 'var(--color-brand)' : undefined,
                    backgroundImage: seguradoraFilter !== 'todas' ? 'none' : `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`
                  }}
                >
                  <option value="todas" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">Seguradora</option>
                  {uniqueSeguradoras.map(seguradora => (
                    <option key={seguradora} value={seguradora} className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">{seguradora}</option>
                  ))}
                </select>
                {seguradoraFilter !== 'todas' && (
                  <button onClick={() => setSeguradoraFilter('todas')} className="absolute right-2 text-white/80 hover:text-white z-10 pointer-events-auto">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative flex items-center">
                <select
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value)}
                  className={`max-w-[110px] truncate px-3 py-2 border rounded-lg text-[13px] font-medium focus:outline-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)] appearance-none pr-8 bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px_12px] transition-colors ${tipoFilter !== 'todos' ? 'border-[#c4151f] text-white' : 'bg-white dark:bg-[#242938] border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-200'}`}
                  style={{
                    backgroundColor: tipoFilter !== 'todos' ? 'var(--color-brand)' : undefined,
                    backgroundImage: tipoFilter !== 'todos' ? 'none' : `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`
                  }}
                >
                  <option value="todos" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">Segmento</option>
                  {uniqueTipos.map(tipo => (
                    <option key={tipo} value={tipo} className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">{tipo}</option>
                  ))}
                </select>
                {tipoFilter !== 'todos' && (
                  <button onClick={() => setTipoFilter('todos')} className="absolute right-2 text-white/80 hover:text-white z-10 pointer-events-auto">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative flex items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`max-w-[110px] truncate px-3 py-2 border rounded-lg text-[13px] font-medium focus:outline-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)] appearance-none pr-8 bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px_12px] transition-colors ${statusFilter !== 'todas' ? 'border-[#c4151f] text-white' : 'bg-white dark:bg-[#242938] border-gray-200 dark:border-[#2E3447] text-gray-700 dark:text-gray-200'}`}
                  style={{
                    backgroundColor: statusFilter !== 'todas' ? 'var(--color-brand)' : undefined,
                    backgroundImage: statusFilter !== 'todas' ? 'none' : `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`
                  }}
                >
                  <option value="todas" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">Status</option>
                  <option value="ativa" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">Ativa</option>
                  <option value="a vencer" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">A Vencer</option>
                  <option value="vencida" className="text-gray-900 bg-white dark:text-white dark:bg-[#242938]">Vencida</option>
                </select>
                {statusFilter !== 'todas' && (
                  <button onClick={() => setStatusFilter('todas')} className="absolute right-2 text-white/80 hover:text-white z-10 pointer-events-auto">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Export Button */}
              <DropdownMenu>
                <TooltipProvider>
                  <ShadcnTooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#242938] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors shadow-sm ml-1">
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
                    exportToCSV(sortedPolicies, `apolices-${statusName}-${dateStr}.csv`);
                  }}>
                    Baixar CSV
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
                onClick={handleNovaApolice}
                className="px-4 py-2 bg-[#9F1239] hover:bg-[#880d2f] text-white rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ml-1 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Nova Apólice
              </button>
            </div>
          </div>

          {/* Top KPI Row - 4 cards com altura fixa 140px (Dados Reais) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            
            {/* Card 1 - Taxa de Conformidade */}
            <div
              className="bg-white dark:bg-[#242938] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              style={{ border: 'none' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8]" style={{ letterSpacing: '0.12em' }}>
                    TAXA DE CONFORMIDADE
                  </p>

                  <div className="mt-2 flex items-end gap-1 leading-none">
                    <span className="text-[28px] font-light tracking-[-0.02em] text-[#0F172A] dark:text-white">
                      {conformidadeCount}
                    </span>
                    <span className="pb-1 text-[14px] font-normal text-gray-500 dark:text-[#94A3B8]">
                      / {conformidadeTotal}
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

              <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)]">
                <svg
                  width="100%"
                  height="44"
                  viewBox="0 0 280 44"
                  preserveAspectRatio="none"
                  className="block overflow-hidden"
                  aria-label="Evolução de conformidade nas últimas 8 semanas"
                >
                  <defs>
                    <linearGradient id={`kpi-history-gradient-${sparklineGradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#639922" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#639922" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {sparklineArea && <path d={sparklineArea} fill={`url(#kpi-history-gradient-${sparklineGradientId})`} />}

                  {sparklineLine && (
                    <path
                      d={sparklineLine}
                      fill="none"
                      stroke="#639922"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Card 2 - A Vencer */}
            <div
              className="bg-white dark:bg-[#242938] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              style={{ border: 'none' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8]" style={{ letterSpacing: '0.12em' }}>
                    A VENCER
                  </p>

                  <div className="mt-2 flex items-end gap-1 leading-none">
                    <span className="text-[28px] font-light tracking-[-0.02em] text-[#BA7517]">
                      {expiringPolicies}
                    </span>
                    <span className="pb-1 text-[14px] font-normal text-[#BA7517] opacity-60">
                      apólices
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                      nos próximos 30 dias
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

              <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)]">
                <svg
                  width="100%"
                  height="44"
                  viewBox="0 0 280 44"
                  preserveAspectRatio="none"
                  className="block overflow-hidden"
                  aria-label="Vencimentos por semana"
                >
                  <defs>
                    <linearGradient id={`expiring-history-gradient-${expiringSparklineId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#BA7517" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#BA7517" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {expiringArea && <path d={expiringArea} fill={`url(#expiring-history-gradient-${expiringSparklineId})`} />}

                  {expiringLine && (
                    <>
                      <path
                        d={expiringLine}
                        fill="none"
                        stroke="#BA7517"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="280" cy={(() => {
                        const values = expiringSparklineValues;
                        const minY = 36;
                        const maxY = 8;
                        const minValue = Math.min(...values);
                        const maxValue = Math.max(...values);
                        const range = Math.max(maxValue - minValue, 1);
                        const normalized = (values[values.length - 1] - minValue) / range;
                        return minY - normalized * (minY - maxY);
                      })()} r="2.5" fill="#BA7517" />
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Card 3 - Vencidas */}
            <div
              className="bg-white dark:bg-[#242938] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              style={{ border: 'none' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8]" style={{ letterSpacing: '0.12em' }}>
                    VENCIDAS
                  </p>

                  <div className="mt-2 flex items-end gap-1 leading-none">
                    <span className="text-[28px] font-light tracking-[-0.02em] text-[#A32D2D]">
                      {expiredPolicies}
                    </span>
                    <span className="pb-1 text-[14px] font-normal text-[#A32D2D] opacity-60">
                      apólices
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
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

              <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)]">
                <svg
                  width="100%"
                  height="44"
                  viewBox="0 0 280 44"
                  preserveAspectRatio="none"
                  className="block overflow-hidden"
                  aria-label="Acumulado de vencidas nas últimas 8 semanas"
                >
                  <defs>
                    <linearGradient id={`expired-history-gradient-${expiredSparklineId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A32D2D" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#A32D2D" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {vencidasArea && <path d={vencidasArea} fill={`url(#expired-history-gradient-${expiredSparklineId})`} />}

                  {vencidasLine && (
                    <>
                      <path
                        d={vencidasLine}
                        fill="none"
                        stroke="#A32D2D"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="280"
                        cy={(() => {
                          const values = vencidasHistory;
                          const minY = 36;
                          const maxY = 8;
                          const minValue = Math.min(...values);
                          const maxValue = Math.max(...values);
                          const range = Math.max(maxValue - minValue, 1);
                          const normalized = (values[values.length - 1] - minValue) / range;
                          return minY - normalized * (minY - maxY);
                        })()}
                        r="2.5"
                        fill="#A32D2D"
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Card 4 - Cobertura Total */}
            <div
              className="bg-white dark:bg-[#242938] rounded-[14px] p-5 flex h-full min-h-0 flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              style={{ border: 'none' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase text-gray-500 dark:text-[#94A3B8]" style={{ letterSpacing: '0.12em' }}>
                    COBERTURA TOTAL
                  </p>

                  <div className="mt-2 flex items-end gap-1 leading-none">
                    <span className="text-[28px] font-light tracking-[-0.02em] text-[#0F172A] dark:text-white">
                      {formattedCoverageTotal.value}
                    </span>
                    {formattedCoverageTotal.suffix && (
                      <span className="pb-1 text-[14px] font-normal text-gray-500 dark:text-[#94A3B8]">
                        {formattedCoverageTotal.suffix}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">
                      valor total assegurado
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[#639922]">
                      <ChevronUp className="w-3 h-3" /> {Math.abs(Math.round(((coverageDisponivelValues[coverageDisponivelValues.length - 1] ?? totalCobertura) - (coverageDisponivelValues[coverageDisponivelValues.length - 2] ?? totalCobertura)) / Math.max(coverageDisponivelValues[coverageDisponivelValues.length - 2] ?? totalCobertura, 1) * 100))}% vs semana anterior
                    </span>
                  </div>
                </div>

                <div className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center text-[15px] text-[#94A3B8]">
                  <ShieldCheck className="h-[15px] w-[15px]" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[9px] uppercase tracking-[0.06em] text-gray-500 opacity-60 dark:text-[#94A3B8]">
                <span>Cobertura disponível vs. sinistros</span>
                <span className="flex items-center gap-1 normal-case tracking-normal opacity-100">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#639922]" />
                  <span>Disponível</span>
                </span>
                <span className="flex items-center gap-1 normal-case tracking-normal opacity-100">
                  <span className="inline-block h-2 w-2 rounded-full border-2 border-dashed border-[#A32D2D]" />
                  <span>Sinistros pagos</span>
                </span>
              </div>

              <div className="mt-2 -mx-[1.2rem] w-[calc(100%+2.4rem)]">
                <svg
                  width="100%"
                  height="44"
                  viewBox="0 0 280 44"
                  preserveAspectRatio="none"
                  className="block overflow-hidden"
                  aria-label="Cobertura disponível versus sinistros pagos nas últimas 8 semanas"
                >
                  <defs>
                    <linearGradient id={`coverage-available-gradient-${coverageSparklineId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c3d32" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#1c3d32" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`coverage-paid-gradient-${coverageSparklineId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A32D2D" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#A32D2D" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {coverageDisponivelArea && <path d={coverageDisponivelArea} fill={`url(#coverage-available-gradient-${coverageSparklineId})`} />}
                  {coveragePagoArea && <path d={coveragePagoArea} fill={`url(#coverage-paid-gradient-${coverageSparklineId})`} />}

                  {coverageDisponivelLine && (
                    <path
                      d={coverageDisponivelLine}
                      fill="none"
                      stroke="#639922"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {coveragePagoLine && (
                    <path
                      d={coveragePagoLine}
                      fill="none"
                      stroke="#A32D2D"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60fr 40fr",
              gap: "16px",
            }}
          >
            <div style={{ minHeight: 0 }}>
              <ComplianceMapV2
                selectedLuc={selectedMapLuc}
                onSelectLuc={setSelectedMapLuc}
              />
            </div>
            <div style={{ position: 'relative', minHeight: 0 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <SegmentRiskChart />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <motion.div
            ref={tableSectionRef}
            className="bg-white dark:bg-[#242938] rounded-xl border overflow-hidden relative"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Table wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead className="bg-[#F7F8FA] dark:bg-[#1A1F2E]">
                  <tr>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>LUC</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Loja</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Segmento</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Seguradora</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vigência</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vencimento</th>

                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '110px' }}>Status</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cobertura</th>
                    <th className="px-4 py-3 text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Dias rest.</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? renderSkeleton()
                    : paginatedPolicies.length === 0
                      ? renderEmptyState()
                      : paginatedPolicies.map((policy, index) => (
                        <tr
                          key={index}
                          onClick={() => handleEditarApolice(policy.id)}
                          className="border-b h-12 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2435] transition-all cursor-pointer relative hover:z-10 hover:shadow-md"
                          style={{ borderColor: colors.cardBorder }}
                        >
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.id}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.lojista}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.tipo}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.seguradora}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.vigencia}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.vencimento}</td>
                          <td className="px-4 py-3" style={{ minWidth: '110px' }}>
                            {renderStatusBadge(policy.status)}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{formatCurrency(policy.cobertura || generateCoverageValue(policy.id))}</td>
                          <td className="px-4 py-3 text-[13px] font-normal text-gray-900 dark:text-gray-100">{policy.dias_restantes}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
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
                  className="border rounded px-2 py-1 bg-white dark:bg-[#1A1F2E] text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
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
                        ? 'bg-[#EFF6FF] text-[#3B82F6] border border-[#3B82F6]'
                        : typeof page === 'number'
                          ? 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#242938] border border-transparent'
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
        </div>

          {/* Right Panel (350px fixed) - SEM PERFIL */}
        <div className="w-full lg:w-[350px] space-y-3 md:space-y-4 flex-shrink-0 overflow-y-auto rounded-[0px]">

          {/* Fila de Ação */}
          <ActionQueuePanel onSelectLuc={setSelectedMapLuc} />

          {/* 2. Compliance Map Side Panel (Fixed) */}
          <ComplianceSidePanel 
            selectedLuc={selectedMapLuc}
            onClose={() => setSelectedMapLuc(null)}
            onViewApolice={handleVerApolice}
            onEditApolice={handleEditarApolice}
          />


        </div>
      </div>

      {/* Modal Nova Apólice */}
      {showNovaApoliceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
            <div className="sticky top-0 bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
              <div>
                <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Nova Apólice</h2>
                <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Preencha os dados da nova apólice de seguro</p>
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

            <form onSubmit={handleSubmitNovaApolice} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Tipo de Seguro *</label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  >
                    <option value="">Selecione...</option>
                    <option value="Seguro Incêndio">Incêndio e Explosão</option>
                    <option value="Responsabilidade Civil">Responsabilidade Civil</option>
                    <option value="Roubo e Furto">Roubo e Furto</option>
                    <option value="Danos Elétricos">Danos Elétricos</option>
                    <option value="Alagamento e Infiltração">Alagamento e Infiltração</option>
                    <option value="Vidros e Fachadas">Vidros e Fachadas</option>
                    <option value="Equipamentos">Equipamentos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Seguradora *</label>
                  <input
                    type="text"
                    required
                    value={formData.seguradora}
                    onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                    placeholder="Ex: Porto Seguro"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Data de Vigência *</label>
                  <input
                    type="date"
                    required
                    value={formData.vigencia}
                    onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={formData.vencimento}
                    onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Valor da Cobertura *</label>
                  <input
                    type="text"
                    required
                    value={formData.cobertura}
                    onChange={(e) => setFormData({ ...formData, cobertura: e.target.value })}
                    placeholder="R$ 10.000.000,00"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Prêmio Anual *</label>
                  <input
                    type="text"
                    required
                    value={formData.premio}
                    onChange={(e) => setFormData({ ...formData, premio: e.target.value })}
                    placeholder="R$ 45.000,00"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais sobre a apólice..."
                  className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 resize-none placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                  style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                  onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                  onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                <motion.button
                  type="button"
                  onClick={handleCloseModals}
                  className="flex-1 px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white bg-[#D93030] dark:bg-[#E04444]"
                  whileHover={{
                    scale: 1.05,
                    filter: "brightness(1.1)",
                    boxShadow: "0 8px 20px rgba(217, 48, 48, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  Criar Apólice
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Apólice */}
      {showViewApoliceModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
            <div className="sticky top-0 bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Apólice {selectedPolicy.id}</h2>
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
                    <div className="text-[24px] font-bold" style={{ color: colors.forest }}>{selectedPolicy.cobertura}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-2">Prêmio Anual</div>
                    <div className="text-[24px] font-bold" style={{ color: colors.brandRed }}>{selectedPolicy.premio}</div>
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
                  className={`${canEdit ? 'flex-1' : 'w-full'} px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E]`}
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

      {/* Modal Renovar Apólice */}
      {showRenovarModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-auto overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
            <div className="bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between rounded-t-xl" style={{ borderColor: colors.cardBorder }}>
              <div>
                <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Renovar Apólice</h2>
                <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Confirme a renovação da apólice {selectedPolicy.id}</p>
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

            <div className="p-6 space-y-6">
              {/* Alerta de Renovação */}
              <div className="flex items-start gap-3 p-4 rounded-lg border" style={{ backgroundColor: `${colors.brandRed}08`, borderColor: `${colors.brandRed}30` }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.brandRed }} strokeWidth={1.5} />
                <div>
                  <div className="text-[13px] font-semibold mb-1" style={{ color: colors.brandMaroon }}>Atenção: Apólice vence em 18 dias</div>
                  <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">
                    Esta apólice está próxima do vencimento. Renove agora para evitar a perda de cobertura.
                  </div>
                </div>
              </div>

              {/* Informações da Apólice Atual */}
              <div className="border rounded-lg p-5" style={{ borderColor: colors.cardBorder }}>
                <h3 className="text-[14px] font-bold mb-4" style={{ color: colors.brandMaroon }}>Informações da Apólice Atual</h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <div className="text-gray-500 dark:text-[#94A3B8] mb-1">Tipo de Seguro</div>
                    <div className="font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.tipo}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-[#94A3B8] mb-1">Seguradora</div>
                    <div className="font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.seguradora}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-[#94A3B8] mb-1">Vencimento Atual</div>
                    <div className="font-semibold" style={{ color: colors.brandRed }}>{selectedPolicy.vencimento}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-[#94A3B8] mb-1">Novo Vencimento</div>
                    <div className="font-semibold" style={{ color: colors.forest }}>31/12/2026</div>
                  </div>
                </div>
              </div>

              {/* Valores da Renovação */}
              <div className="border rounded-lg p-5" style={{ borderColor: colors.cardBorder, backgroundColor: colors.pageBg }}>
                <h3 className="text-[14px] font-bold mb-4" style={{ color: colors.brandMaroon }}>Valores da Renovação</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-gray-600 dark:text-[#94A3B8]">Cobertura Total</span>
                    <span className="text-[16px] font-bold" style={{ color: colors.brandMaroon }}>{selectedPolicy.cobertura}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-gray-600 dark:text-[#94A3B8]">Prêmio Anual</span>
                    <span className="text-[16px] font-bold" style={{ color: colors.brandMaroon }}>{selectedPolicy.premio}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: colors.cardBorder }}>
                    <span className="text-[13px] font-semibold" style={{ color: colors.brandMaroon }}>Total a Pagar</span>
                    <span className="text-[20px] font-bold" style={{ color: colors.brandRed }}>{selectedPolicy.premio}</span>
                  </div>
                </div>
              </div>

              {/* Informações Importantes */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: `${colors.olive}10` }}>
                <h4 className="text-[12px] font-bold mb-2" style={{ color: colors.brandMaroon }}>Informações Importantes</h4>
                <ul className="space-y-1 text-[11px] text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>A renovação terá validade de 12 meses a partir da data de vencimento atual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>Mesmas condições de cobertura da apólice atual serão mantidas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>O pagamento deve ser efetuado em até 5 dias após a confirmação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>Uma nova apólice será emitida após a confirmação do pagamento</span>
                  </li>
                </ul>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                <motion.button
                  onClick={handleCloseModals}
                  className="flex-1 px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleConfirmarRenovacao}
                  className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white bg-[#D93030] dark:bg-[#E04444]"
                  whileHover={{
                    scale: 1.05,
                    filter: "brightness(1.1)",
                    boxShadow: "0 8px 20px rgba(217, 48, 48, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  Confirmar Renovação
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conformidade das Lojas */}
      <AnimatePresence>
        {showConformidadeModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}
            onClick={handleCloseModals}
          >
            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between rounded-t-xl" style={{ borderColor: colors.cardBorder }}>
                <div>
                  <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Conformidade das Lojas</h2>
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
                  <div className="bg-gray-50 dark:bg-[#1A1F2E] px-4 py-3 border-b" style={{ borderColor: colors.cardBorder }}>
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
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors"
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
                    className="flex-1 px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold"
                    style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
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
          <div className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
            <div className="sticky top-0 bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
              <div>
                <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Upload de Apólice</h2>
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
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-[#1c3d32] bg-[#1c3d32]/5' : 'border-gray-300 hover:border-[#1c3d32] hover:bg-gray-50 dark:hover:bg-[#1A1F2E]'
                  }`}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
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
                  className="flex-1 px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E]"
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
              className="relative bg-white dark:bg-[#242938] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-[#2E3447] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-[#2E3447] bg-gray-50/50 dark:bg-[#1A1F2E]/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#242938] flex items-center justify-center shadow-sm border border-gray-100 dark:border-[#2E3447]">
                    <Shield className="w-6 h-6 text-[#168821] dark:text-[#22c55e]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Apólice</h2>
                    <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-0.5">LUC: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedPolicy.id}</span> • {selectedPolicy.lojista}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModals}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#242938] dark:hover:text-gray-300 rounded-lg transition-colors"
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-gray-100 dark:bg-[#1A1F2E] text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Loja *</label>
                      <input
                        type="text"
                        required
                        value={formData.lojista}
                        onChange={(e) => setFormData({ ...formData, lojista: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Segmento *</label>
                      <select
                        required
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wide">Cobertura *</label>
                      <input
                        type="text"
                        required
                        value={formData.cobertura}
                        onChange={(e) => setFormData({ ...formData, cobertura: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E3447] bg-white dark:bg-[#1E2435] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#168821]/20 focus:border-[#168821] transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-[#2E3447] bg-gray-50/50 dark:bg-[#1A1F2E]/50 flex items-center justify-end gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-[#2E3447] transition-colors"
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
  );
}
