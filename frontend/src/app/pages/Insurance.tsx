import { Shield, Bell, AlertTriangle, AlertCircle, Plus, Search, MoreVertical, Activity, FolderOpen, Clock, BarChart3, Calendar, FileText, Edit, Trash2, ChevronRight, Upload, X, ChevronUp, ChevronDown, User, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useUserProfile } from "../contexts/UserProfileContext";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import InsuranceList from "../components/InsuranceList";
import InsuranceTableHeader from "../components/InsuranceTableHeader";
import { useApolices } from "../../hooks/useApolices";
import type { ApoliceRecord, ApoliceFormData } from "../../types/apolice";
import { getStatusBadgeStyle, normalizeStatus } from "../utils/status";
import { normalizeDateForInput, parseDate } from "../utils/date";

const EMPTY_FORM_DATA: ApoliceFormData = {
  luc: "",
  fantasia: "",
  segmento: "",
  seguradora: "",
  vigencia: "",
  vencimento: "",
};

export function Insurance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNovaApoliceModal, setShowNovaApoliceModal] = useState(false);
  const [showViewApoliceModal, setShowViewApoliceModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [seguradoraFilter, setSeguradoraFilter] = useState("todas");
  const [vigenciaFilter, setVigenciaFilter] = useState("");
  const [vencimentoFilter, setVencimentoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditApoliceModal, setShowEditApoliceModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConformidadeModal, setShowConformidadeModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<ApoliceRecord | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingApolice, setIsSubmittingApolice] = useState(false);
  const [isUpdatingApolice, setIsUpdatingApolice] = useState(false);
  const [isDeletingApolice, setIsDeletingApolice] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Table sorting states
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // User profile and permissions from context
  const { canEdit } = useUserProfile();
  const [hoveredEditButton, setHoveredEditButton] = useState<string | null>(null);

  // Ref for filter panel and table section
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);

  // Form state para nova apólice
  const [formData, setFormData] = useState<ApoliceFormData>(EMPTY_FORM_DATA);

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

  const {
    apolices: allPolicies,
    loading,
    error,
    refresh: fetchApolices,
    create: createApolice,
    update: updateApolice,
    remove: deleteApolice,
  } = useApolices();

  useEffect(() => {
    void fetchApolices();
  }, [fetchApolices]);

  const itemsPerPage = 10;

  // Extract unique values for filter options
  const uniqueTipos = Array.from(new Set(allPolicies?.map(p => p.segmento))).sort();
  const uniqueSeguradoras = Array.from(new Set(allPolicies?.map(p => p.seguradora))).sort();

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

  // date helpers moved to src/app/utils/date.ts

  const filteredPolicies = allPolicies.filter(policy => {
    const matchesSearch = policy.luc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.fantasia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.segmento.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.seguradora.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "todas" ||
      policy.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesTipo = tipoFilter === "todos" || policy.segmento === tipoFilter;
    const matchesSeguradora = seguradoraFilter === "todas" || policy.seguradora === seguradoraFilter;

    // Date filtering logic
    const matchesVigencia = !vigenciaFilter || parseDate(policy.vigencia).toDateString() === new Date(vigenciaFilter).toDateString();
    const matchesVencimento = !vencimentoFilter || parseDate(policy.vencimento).toDateString() === new Date(vencimentoFilter).toDateString();

    return matchesSearch && matchesStatus && matchesTipo && matchesSeguradora && matchesVigencia && matchesVencimento;
  });

  // Ordenação
  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number = a[sortColumn as keyof typeof a] ?? '';
    let bValue: string | number = b[sortColumn as keyof typeof b] ?? '';

    // Convert dates to comparable format
    if (sortColumn === 'vigencia' || sortColumn === 'vencimento') {
      const toTime = (dateStr: string) => parseDate(dateStr).getTime();
      aValue = toTime(aValue as string);
      bValue = toTime(bValue as string);
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

  const expiredPoliciesCount = allPolicies.filter((policy) => policy.status === "Vencida").length;
  const expiringPoliciesCount = allPolicies.filter((policy) => policy.status === "A Vencer").length;
  const activePoliciesCount = allPolicies.filter((policy) => policy.status === "Ativa").length;
  const totalPoliciesCount = allPolicies.length;
  const compliancePercent = totalPoliciesCount > 0 ? Math.round((activePoliciesCount / totalPoliciesCount) * 100) : 0;

  const performanceData = [
    { name: "Conformes", value: activePoliciesCount, color: colors.forest, label: `${activePoliciesCount} apólices` },
    { name: "A regularizar", value: expiringPoliciesCount, color: colors.tan, label: `${expiringPoliciesCount} apólices` },
    { name: "Crítico", value: expiredPoliciesCount, color: colors.brandRed, label: `${expiredPoliciesCount} apólices` }
  ];

  // Handlers
  const handleNovaApolice = () => {
    setFormData(EMPTY_FORM_DATA);
    setFormError(null);
    setShowNovaApoliceModal(true);
  };

  const handleVerApolice = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    if (!policy) return; // Check if policy exists
    setSelectedPolicy(policy);
    setShowViewApoliceModal(true);
  };

  const handleEditarApolice = (policyId: string) => {
    const policy = allPolicies.find(p => p.id === policyId);
    if (!policy) return;
    setFormData({
      luc: policy.luc,
      fantasia: policy.fantasia,
      segmento: policy.segmento,
      seguradora: policy.seguradora,
      vigencia: normalizeDateForInput(policy.vigencia),
      vencimento: normalizeDateForInput(policy.vencimento),
    });
    setSelectedPolicy(policy);
    setShowViewApoliceModal(false);
    setShowEditApoliceModal(true);
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

  const handleSubmitNovaApolice = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!formData.luc.trim()) validationErrors.push('Informe o LUC.');
    if (!formData.fantasia.trim()) validationErrors.push('Informe a fantasia.');
    if (!formData.segmento.trim()) validationErrors.push('Selecione o segmento.');
    if (!formData.seguradora.trim()) validationErrors.push('Informe a seguradora.');
    if (!formData.vigencia) validationErrors.push('Informe a vigência.');
    if (!formData.vencimento) validationErrors.push('Informe o vencimento.');

    if (formData.vigencia && formData.vencimento && formData.vencimento < formData.vigencia) {
      validationErrors.push('O vencimento não pode ser anterior à vigência.');
    }

    if (validationErrors.length > 0) {
      setFormError(validationErrors[0]);
      toast.error(validationErrors[0]);
      return;
    }

    setFormError(null);
    setIsSubmittingApolice(true);

    try {
      const created = await createApolice({
        luc: formData.luc.trim(),
        fantasia: formData.fantasia.trim(),
        segmento: formData.segmento.trim(),
        seguradora: formData.seguradora.trim(),
        vigencia: formData.vigencia,
        vencimento: formData.vencimento,
      });

      setCurrentPage(1);
      setShowNovaApoliceModal(false);
      setShowDropdown(false);
      setFormData(EMPTY_FORM_DATA);
      toast.success(`Apólice ${created.luc || formData.luc} criada com sucesso`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar apólice';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmittingApolice(false);
    }
  };

  const handleSubmitEditApolice = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: string[] = [];

    if (!selectedPolicy) validationErrors.push('Apólice não selecionada.');
    if (!formData.luc.trim()) validationErrors.push('Informe o LUC.');
    if (!formData.fantasia.trim()) validationErrors.push('Informe a fantasia.');
    if (!formData.segmento.trim()) validationErrors.push('Selecione o segmento.');
    if (!formData.seguradora.trim()) validationErrors.push('Informe a seguradora.');
    if (!formData.vigencia) validationErrors.push('Informe a vigência.');
    if (!formData.vencimento) validationErrors.push('Informe o vencimento.');

    if (formData.vigencia && formData.vencimento && formData.vencimento < formData.vigencia) {
      validationErrors.push('O vencimento não pode ser anterior à vigência.');
    }

    if (validationErrors.length > 0) {
      setFormError(validationErrors[0]);
      toast.error(validationErrors[0]);
      return;
    }

    setFormError(null);
    setIsUpdatingApolice(true);

    try {
      const updated = await updateApolice(selectedPolicy!.id, {
        luc: formData.luc.trim(),
        fantasia: formData.fantasia.trim(),
        segmento: formData.segmento.trim(),
        seguradora: formData.seguradora.trim(),
        vigencia: formData.vigencia,
        vencimento: formData.vencimento,
      });

      setCurrentPage(1);
      setShowEditApoliceModal(false);
      setSelectedPolicy(null);
      toast.success(`Apólice ${updated.luc || formData.luc} atualizada com sucesso`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar apólice';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsUpdatingApolice(false);
    }
  };

  const handleOpenDeleteConfirm = (policyId?: string) => {
    if (policyId) {
      const policy = allPolicies.find((item) => item.id === policyId);
      if (policy) {
        setSelectedPolicy(policy);
      }
    }

    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteApolice = async () => {
    if (!selectedPolicy) return;

    setIsDeletingApolice(true);

    try {
      await deleteApolice(selectedPolicy.id);
      setCurrentPage(1);
      toast.success(`Apólice ${selectedPolicy.id} excluída com sucesso`);
      setShowDeleteConfirmModal(false);
      handleCloseModals();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir apólice';
      toast.error(message);
    } finally {
      setIsDeletingApolice(false);
    }
  };

  const handleCloseModals = () => {
    setShowNovaApoliceModal(false);
    setShowViewApoliceModal(false);
    setShowEditApoliceModal(false);
    setShowRenovarModal(false);
    setShowUploadModal(false);
    setShowDropdown(false);
    setShowConformidadeModal(false);
    setShowDeleteConfirmModal(false);
    setSelectedPolicy(null);
    setUploadedFile(null);
    setIsDragging(false);
    setFormError(null);
    setIsSubmittingApolice(false);
    setIsUpdatingApolice(false);
    setIsDeletingApolice(false);
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
      if (file.type === 'text/csv' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      } else {
        alert('Por favor, envie apenas arquivos CSV');
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
    if (!policy) return; // Check if policy exists
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
    if (!policy) return; // Check if policy exists
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
      floor: "3º Piso",
      sectors: [
        { sector: "Moda", icon: "👔", status: "compliant", stores: ["Zara", "Renner"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Zara: AP-2024-112 vencida há 54 dias\nRenner: SU-2024-4521 vencida há 54 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Eletrônicos", icon: "📱", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Serviços", icon: "🔧", status: "warning", stores: ["Magazine Luiza"], expired: 0, warning: 1, daysToExpire: 8, storeDetails: "Magazine Luiza: AP-2025-249 vence em 6 dias" },
        { sector: "Âncoras", icon: "🏬", status: "critical", stores: ["C&A"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "C&A: AP-2024-198 vencida há 168 dias" }
      ]
    },
    {
      floor: "2º Piso",
      sectors: [
        { sector: "Moda", icon: "👔", status: "critical", stores: ["Riachuelo", "Lojas Americanas"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Riachuelo: AP-2024-234 vencida há 110 dias\nLojas Americanas: AP-2024-267 vencida há 71 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Eletrônicos", icon: "📱", status: "critical", stores: ["Casas Bahia"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "Casas Bahia: AP-2024-312 vencida há 12 dias" },
        { sector: "Serviços", icon: "🔧", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Âncoras", icon: "🏬", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" }
      ]
    },
    {
      floor: "1º Piso",
      sectors: [
        { sector: "Moda", icon: "👔", status: "critical", stores: ["Pernambucanas", "Marisa"], expired: 2, warning: 0, daysToExpire: null, storeDetails: "Pernambucanas: AP-2024-289 vencida há 152 dias\nMarisa: AP-2024-301 vencida há 17 dias" },
        { sector: "Alimentação", icon: "🍽️", status: "warning", stores: ["Outback"], expired: 0, warning: 1, daysToExpire: 18, storeDetails: "Outback: TM-2024-9012 vence em 18 dias" },
        { sector: "Eletrônicos", icon: "📱", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Serviços", icon: "🔧", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Âncoras", icon: "🏬", status: "critical", stores: ["Extra Hipermercado"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "Extra: AP-2024-345 vencida há 326 dias" }
      ]
    },
    {
      floor: "Térreo",
      sectors: [
        { sector: "Moda", icon: "👔", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Alimentação", icon: "🍽️", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Eletrônicos", icon: "📱", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" },
        { sector: "Serviços", icon: "🔧", status: "critical", stores: ["Ótica Moderna"], expired: 1, warning: 0, daysToExpire: null, storeDetails: "Ótica Moderna: AP-2024-378 vencida há 288 dias" },
        { sector: "Âncoras", icon: "🏬", status: "compliant", stores: [], expired: 0, warning: 0, daysToExpire: null, storeDetails: "" }
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

  // getStatusBadgeStyle and normalizeStatus are provided by src/app/utils/status.ts

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full gap-3 md:gap-4 lg:gap-6" style={{ backgroundColor: colors.pageBg }}>
        {/* Main Content Area */}
        <div className="flex-1 space-y-3 md:space-y-4 lg:space-y-6 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3" />
              <div>
                <h3 className="font-semibold text-sm">Erro ao carregar dados</h3>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}
          {loading && allPolicies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Activity className="w-8 h-8 mb-4 animate-spin" />
              <p className="text-sm">Carregando apólices...</p>
            </div>
          )}
          {/* Breadcrumb - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#94A3B8]">
            <span className="cursor-pointer hover:opacity-70" style={{ color: colors.brandMaroon }} onClick={() => navigate('/dashboard')}>Shopping Flamboyant</span>
            <ChevronRight className="w-3 h-3" />
            <span className="cursor-pointer hover:opacity-70" style={{ color: colors.brandMaroon }}>Seguros</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium" style={{ color: colors.brandRed }}>Dashboard</span>
          </div>

          {/* Top KPI Row - 4 cards com altura fixa 140px */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Card 1 - Apólices Vencidas - PRIORIDADE 1 */}
            <motion.div
              onClick={() => handleKPICardClick("vencida")}
              className="bg-white dark:bg-[#242938] rounded-xl border h-[140px] flex flex-col p-4 md:p-5 cursor-pointer"
              style={{
                borderColor: colors.cardBorder,
                borderLeftColor: colors.brandRed,
                borderLeftWidth: '3px',
                backgroundColor: isDarkMode ? undefined : '#FFF5F5',
                boxShadow: `0 1px 4px ${colors.brandMaroon}0F`
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: `0 8px 24px ${colors.brandRed}20`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.brandRed}15` }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: colors.brandRed }} strokeWidth={1.5} />
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Apólices Vencidas</div>
                </div>
                <div className="w-20 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineExpired}>
                      <defs>
                        <linearGradient id="colorExpired" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.brandRed} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colors.brandRed} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={colors.brandRed} strokeWidth={2} fill="url(#colorExpired)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[32px] font-bold leading-none mb-1" style={{ color: colors.brandMaroon }}>{expiredPoliciesCount}</div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px]" style={{ color: colors.brandRed }}>▲ 12%</span>
                <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">vs mês anterior</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">requerem ação imediata</div>
            </motion.div>

            {/* Card 2 - Apólices a Vencer - PRIORIDADE 2 */}
            <motion.div
              onClick={() => handleKPICardClick("a vencer")}
              className="bg-white dark:bg-[#242938] rounded-xl border h-[140px] flex flex-col p-4 md:p-5 cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.02,
                boxShadow: `0 8px 24px ${colors.olive}20`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.olive}15` }}>
                    <Bell className="w-5 h-5" style={{ color: colors.olive }} strokeWidth={1.5} />
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Apólices a Vencer</div>
                </div>
                <div className="w-20 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineExpiring}>
                      <defs>
                        <linearGradient id="colorExpiring" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.olive} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colors.olive} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={colors.olive} strokeWidth={2} fill="url(#colorExpiring)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[32px] font-bold leading-none mb-1" style={{ color: colors.olive }}>{expiringPoliciesCount}</div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px]" style={{ color: colors.brandRed }}>▲ 100%</span>
                <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">vs mês anterior</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">próximas 30 dias</div>
            </motion.div>

            {/* Card 3 - Apólices Ativas - PRIORIDADE 3 */}
            <motion.div
              onClick={() => handleKPICardClick("ativa")}
              className="bg-white dark:bg-[#242938] rounded-xl border h-[140px] flex flex-col p-4 md:p-5 cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.02,
                boxShadow: `0 8px 24px ${colors.forest}20`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.forest}15` }}>
                    <Shield className="w-5 h-5" style={{ color: colors.forest }} strokeWidth={1.5} />
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Apólices Ativas</div>
                </div>
                <div className="w-20 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineActive}>
                      <defs>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.cream} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={colors.cream} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={colors.forest} strokeWidth={2} fill="url(#colorActive)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[32px] font-bold leading-none mb-1" style={{ color: colors.brandMaroon }}>{activePoliciesCount}</div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px]" style={{ color: colors.forest }}>▲ 15%</span>
                <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">vs mês anterior</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">em conformidade</div>
            </motion.div>

            {/* Card 4 - Conformidade das Lojas - PRIORIDADE 4 */}
            <motion.div
              onClick={() => setShowConformidadeModal(true)}
              className="bg-white dark:bg-[#242938] rounded-xl border h-[140px] flex flex-col p-4 md:p-5 cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.02,
                boxShadow: `0 8px 24px ${colors.forest}20`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.forest}15` }}>
                    <Shield className="w-5 h-5" style={{ color: colors.forest }} strokeWidth={1.5} />
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Conformidade das Lojas</div>
                </div>
              </div>
              <div className="text-[32px] font-bold leading-none mb-1" style={{ color: colors.forest }}>{compliancePercent}%</div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px]" style={{ color: colors.brandRed }}>▼ 8%</span>
                <span className="text-[11px] text-gray-500 dark:text-[#94A3B8]">vs mês anterior</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-auto">{expiredPoliciesCount} apólices vencidas</div>
              <div className="w-full h-1 rounded-sm overflow-hidden mt-auto" style={{ backgroundColor: colors.cardBorder }}>
                <div className="h-full rounded-sm transition-all" style={{ width: `${compliancePercent}%`, backgroundColor: colors.forest }} />
              </div>
            </motion.div>
          </div>

          {/* Gráfico Principal - Barras Horizontais */}
          <div
            className="bg-white dark:bg-[#242938] rounded-xl p-4 lg:p-6 border"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
          >
            <div className="mb-4 lg:mb-6">
              <h3 className="text-[14px] md:text-[18px] lg:text-[20px] font-bold mb-1" style={{ color: colors.brandMaroon }}>Cobertura por Tipo de Seguro</h3>
              <p className="text-[11px] md:text-[12px] text-gray-500 dark:text-[#94A3B8]">Distribuição atual de apólices ativas</p>
            </div>

            {/* Mobile: Scroll Horizontal, Desktop: Normal */}
            <div className="md:hidden overflow-x-auto scrollbar-hide">
              <div className="min-w-[500px] space-y-3 max-h-[200px] overflow-y-auto">
                {insuranceCoverageData?.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleChartBarClick(item.categoria)}
                    whileHover={{
                      scale: 1.02,
                      filter: 'brightness(1.1)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {/* Label */}
                    <div className="min-w-[120px] text-[11px]" style={{ color: colors.brandMaroon }}>
                      {item.categoria}
                    </div>

                    {/* Barra com Segmentos */}
                    <div className="flex-1 relative h-6 rounded-sm overflow-hidden flex" style={{ backgroundColor: '#f5f3ef' }}>
                      {/* Segmento 1: Sinistros Pagos (opacidade 100%) */}
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${item.sinistrosPagos}%`,
                          backgroundColor: item.color,
                          opacity: 1
                        }}
                      />
                      {/* Segmento 2: Saldo Disponível (opacidade 25%) */}
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${100 - item.sinistrosPagos}%`,
                          backgroundColor: item.color,
                          opacity: 0.25
                        }}
                      />
                    </div>

                    {/* Valores */}
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <span className="text-[11px] font-semibold" style={{ color: colors.brandMaroon }}>
                        {item.apolices}
                      </span>
                      <span className="text-[10px]" style={{ color: '#6b6b6b' }}>
                        R$ {item.valor.toFixed(1)}M
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop: Layout Normal */}
            <div className="hidden md:block space-y-3 lg:space-y-4">
              {insuranceCoverageData?.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 lg:gap-4 cursor-pointer"
                  onClick={() => handleChartBarClick(item.categoria)}
                  whileHover={{
                    scale: 1.02,
                    filter: 'brightness(1.1)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {/* Label */}
                  <div className="min-w-[120px] lg:min-w-[180px] text-[11px] lg:text-[13px]" style={{ color: colors.brandMaroon }}>
                    {item.categoria}
                  </div>

                  {/* Barra com Segmentos */}
                  <div className="flex-1 relative h-7 rounded-sm overflow-hidden flex" style={{ backgroundColor: '#f5f3ef' }}>
                    {/* Segmento 1: Sinistros Pagos (opacidade 100%) */}
                    <motion.div
                      className="h-full"
                      style={{
                        backgroundColor: item.color,
                        opacity: 1
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.sinistrosPagos}%` }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.1,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    />
                    {/* Segmento 2: Saldo Disponível (opacidade 25%) */}
                    <motion.div
                      className="h-full"
                      style={{
                        backgroundColor: item.color,
                        opacity: 0.25
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - item.sinistrosPagos}%` }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.1,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    />
                  </div>

                  {/* Valores */}
                  <motion.div
                    className="flex items-center gap-2 lg:gap-3 min-w-[100px] lg:min-w-[140px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.1 + 0.6
                    }}
                  >
                    <motion.span
                      className="text-[11px] lg:text-[13px] font-semibold"
                      style={{ color: colors.brandMaroon }}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1 + 0.8,
                        ease: "easeOut"
                      }}
                    >
                      {item.apolices}
                    </motion.span>
                    <motion.span
                      className="text-[10px] lg:text-[12px]"
                      style={{ color: '#6b6b6b' }}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1 + 0.8,
                        ease: "easeOut"
                      }}
                    >
                      R$ {item.valor.toFixed(1)}M
                    </motion.span>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Legenda do Gráfico */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: colors.forest, opacity: 1 }} />
                <span className="text-[11px] text-gray-600 dark:text-[#94A3B8]">Sinistros pagos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: colors.forest, opacity: 0.25 }} />
                <span className="text-[11px] text-gray-600 dark:text-[#94A3B8]">Saldo disponível</span>
              </div>
            </div>
          </div>

          {/* Cards de Renovação - Separador Visual */}
          <div className="space-y-3 lg:space-y-4">
            {/* Card Urgente - Largura Completa com Layout Horizontal */}
            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl p-4 md:p-5 border cursor-pointer"
              style={{
                borderColor: colors.brandRed,
                borderLeftWidth: '3px',
                backgroundColor: isDarkMode ? '#1A1F2E' : '#FFF5F5',
                boxShadow: `0 2px 8px ${colors.brandRed}20`
              }}
              whileHover={{
                scale: 1.01,
                boxShadow: `0 12px 32px ${colors.brandRed}30`,
                y: -4
              }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Countdown e Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: colors.brandRed }}>
                      ⚠ Urgente
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <div className="text-[36px] md:text-[48px] font-bold leading-none" style={{ color: colors.brandRed }}>
                      19<span className="text-[18px] md:text-[24px] ml-1">dias</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">até vencimento</div>
                  </div>
                  <div className="text-[16px] md:text-[18px] font-bold mb-1" style={{ color: colors.brandMaroon }}>Incêndio</div>
                  <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">Vence em 20/05/2026 · TM-2024-9012</div>
                </div>

                {/* Botões de Ação */}
                <div className="flex md:flex-col gap-2 md:w-[180px]">
                  <motion.button
                    onClick={() => handleRenovarApolice("TM-2024-9012")}
                    className="flex-1 md:w-full text-white px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-[#a0191e] dark:bg-[#E04444]"
                    whileHover={{
                      scale: 1.05,
                      filter: "brightness(1.1)",
                      boxShadow: "0 8px 20px rgba(160, 25, 30, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    Renovar agora
                  </motion.button>
                  <motion.button
                    onClick={() => handleVerApoliceCard("TM-2024-9012")}
                    className="flex-1 md:w-full px-4 py-2.5 rounded-lg text-[12px] font-semibold border flex items-center justify-center gap-1"
                    style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    Ver apólice completa →
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Cards Secundários - Grid 3 Colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
              {/* Card B - Renovação Programada */}
              <motion.div
                className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
                style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                  y: -4
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: colors.tan, color: 'white' }}>Atenção</span>
                </div>
                <div className="text-[28px] font-bold leading-none mb-1" style={{ color: colors.olive }}>
                  52<span className="text-[14px] ml-1">d</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-3">até vencimento</div>
                <div className="text-[14px] font-bold mb-1" style={{ color: colors.brandMaroon }}>Resp. Civil</div>
                <div className="text-[11px] text-gray-600 dark:text-[#94A3B8] mb-3">22/06/2026 · AL-2025-0034</div>
                <button
                  onClick={() => handleVerApoliceCard("AL-2025-0034")}
                  className="w-full px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E] flex items-center justify-center gap-1"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                >
                  Ver apólice →
                </button>
              </motion.div>

              {/* Card C - Renovação Programada */}
              <motion.div
                className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
                style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                  y: -4
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: colors.forest }}>Em dia</span>
                </div>
                <div className="text-[28px] font-bold leading-none mb-1" style={{ color: colors.forest }}>
                  90<span className="text-[14px] ml-1">d</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-3">até vencimento</div>
                <div className="text-[14px] font-bold mb-1" style={{ color: colors.brandMaroon }}>Roubo e Furto</div>
                <div className="text-[11px] text-gray-600 dark:text-[#94A3B8] mb-3">30/07/2026 · TM-2024-0078</div>
                <button
                  onClick={() => handleVerApoliceCard("TM-2024-0078")}
                  className="w-full px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E] flex items-center justify-center gap-1"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                >
                  Ver apólice →
                </button>
              </motion.div>

              {/* Card D - Renovação Programada */}
              <motion.div
                className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
                style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                  y: -4
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: colors.forest }}>Em dia</span>
                </div>
                <div className="text-[28px] font-bold leading-none mb-1" style={{ color: colors.forest }}>
                  106<span className="text-[14px] ml-1">d</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-[#94A3B8] mb-3">até vencimento</div>
                <div className="text-[14px] font-bold mb-1" style={{ color: colors.brandMaroon }}>Incêndio</div>
                <div className="text-[11px] text-gray-600 dark:text-[#94A3B8] mb-3">15/08/2026 · AP-2025-001</div>
                <button
                  onClick={() => handleVerApoliceCard("AP-2025-001")}
                  className="w-full px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E] flex items-center justify-center gap-1"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                >
                  Ver apólice →
                </button>
              </motion.div>
            </div>
          </div>

          {/* Cards Operacionais - Linha 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#E0444415' : `${colors.brandDarkRed}15` }}>
                  <FolderOpen className="w-4 h-4" style={{ color: isDarkMode ? '#E04444' : colors.brandDarkRed }} strokeWidth={1.5} />
                </div>
                <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">Sinistros Abertos</div>
              </div>
              <div className="text-[28px] font-bold" style={{ color: colors.brandMaroon }}>5</div>
              <div className="text-[10px] text-gray-500 dark:text-[#94A3B8]">aguardando resolução</div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#E0444415' : `${colors.brandDarkRed}15` }}>
                  <Clock className="w-4 h-4" style={{ color: isDarkMode ? '#E04444' : colors.brandDarkRed }} strokeWidth={1.5} />
                </div>
                <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">Tempo Médio de Resolução</div>
              </div>
              <div className="text-[28px] font-bold" style={{ color: colors.brandMaroon }}>12 dias</div>
              <div className="text-[10px] text-gray-500 dark:text-[#94A3B8]">últimos 90 dias</div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#E0444415' : `${colors.brandDarkRed}15` }}>
                  <BarChart3 className="w-4 h-4" style={{ color: isDarkMode ? '#E04444' : colors.brandDarkRed }} strokeWidth={1.5} />
                </div>
                <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">Taxa de Aprovação</div>
              </div>
              <div className="text-[28px] font-bold" style={{ color: colors.brandMaroon }}>87%</div>
              <div className="text-[10px] text-gray-500 dark:text-[#94A3B8]">sinistros aprovados</div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
              style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
                y: -4
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#E0444415' : `${colors.brandDarkRed}15` }}>
                  <Calendar className="w-4 h-4" style={{ color: isDarkMode ? '#E04444' : colors.brandDarkRed }} strokeWidth={1.5} />
                </div>
                <div className="text-[12px] text-gray-600 dark:text-[#94A3B8]">Próxima Vistoria</div>
              </div>
              <div className="text-[28px] font-bold" style={{ color: colors.brandMaroon }}>08/05/2026</div>
              <div className="text-[10px] text-gray-500 dark:text-[#94A3B8]">Setor Alimentação L1</div>
            </motion.div>
          </div>

          {/* Data Table */}
          <motion.div
            ref={tableSectionRef}
            className="bg-white dark:bg-[#242938] rounded-xl border overflow-hidden"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            whileHover={{
              scale: 1.005,
              boxShadow: `0 8px 24px ${colors.brandMaroon}12`,
              y: -2
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="px-4 md:px-6 py-4 border-b" style={{ borderColor: colors.cardBorder }}>
              <h3 className="text-[16px] md:text-[18px] font-bold mb-4" style={{ color: colors.brandMaroon }}>Todas as Apólices Ativas</h3>

              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748B]" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Buscar apólice..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-[12px] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>
                <div className="relative" ref={filterPanelRef}>
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-[12px] font-medium hover:bg-gray-100 dark:hover:bg-[#242938] transition-colors relative"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                  >
                    <Filter className="w-4 h-4" strokeWidth={1.5} />
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D93030] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Filter Panel */}
                  {showFilterPanel && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowFilterPanel(false)}
                      />

                      {/* Sidebar Panel */}
                      <div className="fixed top-0 right-0 bottom-0 w-96 bg-white dark:bg-[#242938] border-l dark:border-[#2E3447] shadow-2xl z-50 overflow-y-auto" style={{ borderColor: colors.cardBorder }}>
                        {/* Header */}
                        <div className="px-4 py-4 border-b dark:border-[#2E3447] flex items-center justify-between sticky top-0 bg-white dark:bg-[#242938] z-10" style={{ borderColor: colors.cardBorder }}>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold" style={{ color: colors.brandMaroon }}>Filtros Avançados</h3>
                            {activeFiltersCount > 0 && (
                              <span className="px-2 py-0.5 bg-[#D93030] text-white text-[10px] font-bold rounded-full">
                                {activeFiltersCount}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setShowFilterPanel(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="p-6 space-y-5">
                          {/* Status Filter */}
                          <div>
                            <label className="text-sm font-bold mb-2.5 block" style={{ color: colors.brandMaroon }}>Status</label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D93030]"
                              style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                            >
                              <option value="todas">Todos os Status</option>
                              <option value="ativa">Ativa</option>
                              <option value="a vencer">A Vencer</option>
                              <option value="vencida">Vencida</option>
                            </select>
                          </div>

                          {/* Tipo Filter */}
                          <div>
                            <label className="text-sm font-bold mb-2.5 block" style={{ color: colors.brandMaroon }}>Tipo de Seguro</label>
                            <select
                              value={tipoFilter}
                              onChange={(e) => setTipoFilter(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D93030]"
                              style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                            >
                              <option value="todos">Todos os Tipos</option>
                              {uniqueTipos?.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                              ))}
                            </select>
                          </div>

                          {/* Seguradora Filter */}
                          <div>
                            <label className="text-sm font-bold mb-2.5 block" style={{ color: colors.brandMaroon }}>Seguradora</label>
                            <select
                              value={seguradoraFilter}
                              onChange={(e) => setSeguradoraFilter(e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D93030]"
                              style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                            >
                              <option value="todas">Todas as Seguradoras</option>
                              {uniqueSeguradoras?.map(seguradora => (
                                <option key={seguradora} value={seguradora}>{seguradora}</option>
                              ))}
                            </select>
                          </div>

                          {/* Vigência Filter */}
                          <div>
                            <label className="text-sm font-bold mb-2.5 block" style={{ color: colors.brandMaroon }}>Vigência</label>
                            <div className="relative">
                              <input
                                type="date"
                                value={vigenciaFilter}
                                onChange={(e) => setVigenciaFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D93030]"
                                style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                              />
                              {vigenciaFilter && (
                                <button
                                  onClick={() => setVigenciaFilter("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  aria-label="Limpar filtro de vigência"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Vencimento Filter */}
                          <div>
                            <label className="text-sm font-bold mb-2.5 block" style={{ color: colors.brandMaroon }}>Vencimento</label>
                            <div className="relative">
                              <input
                                type="date"
                                value={vencimentoFilter}
                                onChange={(e) => setVencimentoFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1E2435] border dark:border-[#2E3447] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D93030]"
                                style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                              />
                              {vencimentoFilter && (
                                <button
                                  onClick={() => setVencimentoFilter("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  aria-label="Limpar filtro de vencimento"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 px-6 py-4 border-t dark:border-[#2E3447] bg-white dark:bg-[#242938]" style={{ borderColor: colors.cardBorder }}>
                          <div className="space-y-3">
                            <div className="text-sm" style={{ color: colors.brandMaroon }}>
                              {filteredPolicies.length} {filteredPolicies.length === 1 ? 'apólice encontrada' : 'apólices encontradas'}
                            </div>
                            <div className="flex gap-3">
                              {activeFiltersCount > 0 && (
                                <motion.button
                                  onClick={handleClearFilters}
                                  className="flex-1 px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-sm font-medium"
                                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                                  whileHover={{
                                    scale: 1.05,
                                    backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
                                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                                  }}
                                  whileTap={{ scale: 0.98 }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                >
                                  Limpar filtros
                                </motion.button>
                              )}
                              <motion.button
                                onClick={() => setShowFilterPanel(false)}
                                className={`${activeFiltersCount > 0 ? 'flex-1' : 'w-full'} px-4 py-2.5 rounded-lg text-sm font-medium text-white`}
                                style={{ backgroundColor: colors.brandRed }}
                                whileHover={{
                                  scale: 1.05,
                                  filter: "brightness(1.1)",
                                  boxShadow: "0 8px 20px rgba(217, 48, 48, 0.3)"
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                              >
                                Aplicar filtros
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <InsuranceTableHeader colors={colors} sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <tbody>
                  {paginatedPolicies?.map((policy, index) => (
                    <tr key={index} className="border-b h-12 hover:bg-gray-50 dark:hover:bg-[#1A1F2E]" style={{ borderColor: colors.cardBorder }}>
                      <td className="px-4 py-3 text-[12px] font-medium" style={{ color: colors.brandMaroon }}>{policy.luc}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: colors.brandMaroon }}>{policy.fantasia}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: colors.brandMaroon }}>{policy.segmento}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: colors.brandMaroon }}>{policy.seguradora}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: colors.brandMaroon }}>{policy.vigencia}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: colors.brandMaroon }}>{policy.vencimento}</td>
                      <td className="px-4 py-3" style={{ minWidth: '110px' }}>
                        <span
                          className="inline-block px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap"
                          style={getStatusBadgeStyle(policy.status, colors)}
                        >
                          {policy.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleVerApolice(policy.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded"
                            style={{ color: colors.brandRed, borderColor: colors.brandRed }}
                            whileHover={{
                              scale: 1.05,
                              boxShadow: "0 4px 12px rgba(217, 48, 48, 0.2)"
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                          >
                            <motion.button
                              onClick={() => handleOpenDeleteConfirm(policy.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded"
                              style={{ color: colors.brandRed, borderColor: `${colors.brandRed}66` }}
                              whileHover={{
                                scale: 1.05,
                                backgroundColor: isDarkMode ? '#2A1414' : '#FFF5F5',
                                boxShadow: "0 4px 12px rgba(217, 48, 48, 0.15)"
                              }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                              Excluir
                            </motion.button>
                            <FileText className="w-3 h-3" strokeWidth={1.5} />
                            Ver Apólice
                          </motion.button>
                          <div className="relative">
                            <motion.button
                              onClick={() => canEdit && handleEditarApolice(policy.id)}
                              disabled={!canEdit}
                              onMouseEnter={() => !canEdit && setHoveredEditButton(policy.id)}
                              onMouseLeave={() => setHoveredEditButton(null)}
                              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded ${canEdit
                                  ? 'cursor-pointer'
                                  : 'cursor-not-allowed'
                                }`}
                              style={{
                                color: canEdit ? colors.brandMaroon : '#D5D7DC',
                                borderColor: canEdit ? colors.cardBorder : '#D5D7DC'
                              }}
                              whileHover={canEdit ? {
                                scale: 1.05,
                                backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB',
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                              } : {}}
                              whileTap={canEdit ? { scale: 0.98 } : {}}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                              <Edit className="w-3 h-3" strokeWidth={1.5} />
                              Editar
                            </motion.button>
                            {/* Tooltip para botão desabilitado */}
                            {!canEdit && hoveredEditButton === policy.id && (
                              <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg whitespace-nowrap z-50 shadow-lg"
                                style={{ pointerEvents: 'none' }}
                              >
                                Você não tem permissão para editar esta apólice
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px]" style={{ backgroundColor: colors.pageBg, color: colors.brandMaroon }}>
              <div className="text-center md:text-left">
                Mostrando {startIndex + 1}-{Math.min(endIndex, sortedPolicies.length)} de {sortedPolicies.length} apólices
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-white dark:bg-[#242938] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: colors.cardBorder }}
                >
                  Anterior
                </button>

                {Array.from({ length: totalFilteredPages }, (_, i) => i + 1)?.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className="px-3 py-1 rounded transition-all"
                    style={{
                      backgroundColor: currentPage === page ? colors.brandRed : 'transparent',
                      color: currentPage === page ? 'white' : colors.brandMaroon,
                      border: currentPage === page ? 'none' : `1px solid ${colors.cardBorder}`
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalFilteredPages}
                  className="px-3 py-1 border rounded hover:bg-white dark:bg-[#242938] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: colors.cardBorder }}
                >
                  Próximo
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel (280px fixed) - SEM PERFIL */}
        <div className="w-full lg:w-[280px] space-y-3 md:space-y-4 flex-shrink-0 overflow-y-auto rounded-[0px]">
          {/* 1. Nova Apólice Button com Dropdown - Apenas para Relacionamento */}
          {canEdit && (
            <div className="relative">
              <motion.button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-[12px] font-semibold bg-[#D93030] dark:bg-[#E04444] shadow-md"
                whileHover={{
                  scale: 1.05,
                  filter: "brightness(1.1)",
                  boxShadow: "0 8px 20px rgba(217, 48, 48, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Nova Apólice
              </motion.button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  {/* Backdrop para fechar o dropdown */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />

                  <div
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#242938] rounded-xl border overflow-hidden z-50"
                    style={{
                      borderColor: colors.cardBorder,
                      boxShadow: `0 8px 24px ${colors.brandMaroon}20`
                    }}
                  >
                    <motion.button
                      onClick={() => {
                        setShowDropdown(false);
                        handleNovaApolice();
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-[13px] font-medium"
                      style={{ color: colors.brandMaroon }}
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB'
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.brandRed}15` }}>
                        <Plus className="w-4 h-4" style={{ color: colors.brandRed }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="font-semibold">Criar Manualmente</div>
                        <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Preencher formulário de nova apólice</div>
                      </div>
                    </motion.button>

                    <div className="border-t" style={{ borderColor: colors.cardBorder }} />

                    <motion.button
                      onClick={handleUploadApolice}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-[13px] font-medium"
                      style={{ color: colors.brandMaroon }}
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: isDarkMode ? '#1A1F2E' : '#F9FAFB'
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.forest}15` }}>
                        <Upload className="w-4 h-4" style={{ color: colors.forest }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="font-semibold">Upload de Apólice</div>
                        <div className="text-[11px] text-gray-500 dark:text-[#94A3B8]">Importar arquivo CSV da apólice</div>
                      </div>
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 2. Índice de Conformidade Geral - Donut Segmentado */}
          <motion.div
            className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
              y: -4
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h4 className="text-[12px] font-bold mb-3" style={{ color: colors.brandMaroon }}>Índice de Conformidade Geral</h4>
            <div className="relative w-32 h-32 mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    {performanceData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-[28px] font-bold" style={{ color: colors.forest }}>{compliancePercent}%</div>
                <div className="text-[10px] text-gray-600 dark:text-[#94A3B8]">Geral</div>
              </div>
            </div>

            {/* Legenda Detalhada */}
            <div className="mt-4 space-y-2">
              {performanceData?.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span style={{ color: colors.brandMaroon }}>{item.name}</span>
                  </div>
                  <span className="font-semibold" style={{ color: colors.brandMaroon }}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 3. Resumo de Cobertura */}
          <motion.div
            className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 8px 24px ${colors.brandMaroon}15`,
              y: -4
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h4 className="text-[12px] font-bold mb-3" style={{ color: colors.brandMaroon }}>Resumo de Cobertura</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-600 dark:text-[#94A3B8]">Cobertura Total Contratada</span>
                <span className="text-[12px] font-bold" style={{ color: colors.brandMaroon }}>R$ 164M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-600 dark:text-[#94A3B8]">Sinistros Pagos no Ano</span>
                <span className="text-[12px] font-bold" style={{ color: colors.brandRed }}>R$ 52,8M</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: colors.cardBorder }}>
                <span className="text-[11px] text-gray-600 dark:text-[#94A3B8]">Saldo de Cobertura Disponível</span>
                <span className="text-[12px] font-bold" style={{ color: colors.forest }}>R$ 111,2M</span>
              </div>
            </div>
          </motion.div>

          {/* 4. Alertas Críticos */}
          <motion.div
            className="bg-white dark:bg-[#242938] rounded-xl p-4 border cursor-pointer"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 8px 24px ${colors.brandRed}15`,
              y: -4
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h4 className="text-[12px] font-bold mb-3" style={{ color: colors.brandMaroon }}>Alertas Críticos</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-2 rounded-lg border" style={{ backgroundColor: `${colors.brandRed}08`, borderColor: `${colors.brandRed}30` }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.brandRed }} strokeWidth={1.5} />
                <div>
                  <div className="text-[11px] font-semibold" style={{ color: colors.brandMaroon }}>Apólice Vencida</div>
                  <div className="text-[10px] text-gray-600 dark:text-[#94A3B8] mt-0.5">SU-2024-4521 - Alagamento e Infiltração</div>
                  <button
                    onClick={() => handleKPICardClick("vencida")}
                    className="text-[10px] font-medium mt-1 hover:underline"
                    style={{ color: colors.brandRed }}
                  >
                    Ver apólice completa
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg border" style={{ backgroundColor: `${colors.tan}15`, borderColor: `${colors.tan}40` }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.tan }} strokeWidth={1.5} />
                <div>
                  <div className="text-[11px] font-semibold" style={{ color: colors.brandMaroon }}>Risco Alto Detectado</div>
                  <div className="text-[10px] text-gray-600 dark:text-[#94A3B8] mt-0.5">AL-2025-0034 - Resp. Civil - Elevadores</div>
                  <button
                    onClick={() => {
                      const policy = allPolicies.find(p => p.id === "AL-2025-0034");
                      if (!policy) return;
                      setSelectedPolicy(policy);
                      setShowViewApoliceModal(true);
                    }}
                    className="text-[10px] font-medium mt-1 hover:underline"
                    style={{ color: colors.tan }}
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 5. Mapa de Localização de Conformidade */}
          <motion.div
            className="bg-white dark:bg-[#242938] rounded-xl p-5 border relative"
            style={{ borderColor: colors.cardBorder, boxShadow: `0 1px 4px ${colors.brandMaroon}0F` }}
            whileHover={{
              boxShadow: `0 8px 24px ${colors.brandMaroon}15`
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Title - Centered */}
            <div className="text-center mb-4">
              <h4 className="text-[12px] font-bold" style={{ color: colors.brandMaroon }}>Mapa de Localização de Conformidade</h4>
            </div>

            {/* Grid Map - Pisos × Setores (sem header de categorias) */}
            <div className="space-y-2 mb-4">
              {complianceMapData?.map((floorData, floorIndex) => (
                <div key={floorIndex} className="flex gap-2 items-center">
                  {/* Label do Piso - Centralizado */}
                  <div className="w-20 text-center flex-shrink-0">
                    <div className="text-[11px] font-bold" style={{ color: colors.brandMaroon }}>
                      {floorData.floor}
                    </div>
                  </div>

                  {/* Células de conformidade */}
                  <div className="flex-1 flex gap-1.5">
                    {floorData.sectors?.map((sectorData, sectorIndex) => (
                      <motion.div
                        key={sectorIndex}
                        className="flex-1 h-11 rounded cursor-pointer relative"
                        style={{ backgroundColor: getComplianceColor(sectorData.status) }}
                        whileHover={{
                          scale: 1.02,
                          filter: "brightness(1.15)"
                        }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        onMouseEnter={(e) => {
                          setHoveredCell({ row: floorIndex, col: sectorIndex });
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMousePosition({ x: rect.left, y: rect.bottom + 8 });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => handleComplianceCellClick(floorData.floor, sectorData.sector)}
                      >
                        {/* Badge numérico apenas para células com problemas */}
                        {(sectorData.expired > 0 || sectorData.warning > 0) && (
                          <div
                            className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-[#242938]"
                            style={{ backgroundColor: sectorData.expired > 0 ? colors.brandRed : colors.tan }}
                          >
                            {sectorData.expired + sectorData.warning}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tooltip com NOME DA LOJA como prioridade */}
            {hoveredCell && (
              <div className="fixed z-50 bg-white dark:bg-[#242938] rounded-lg p-3.5 shadow-xl"
                style={{
                  top: mousePosition.y,
                  left: mousePosition.x,
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: `0 8px 20px ${colors.brandMaroon}25`,
                  minWidth: '220px'
                }}>
                {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].stores.length > 0 ? (
                  <>
                    {/* Nome(s) da(s) Loja(s) - PRIORIDADE VISUAL */}
                    <div className="mb-2.5">
                      {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].stores?.map((storeName, idx) => (
                        <div key={idx} className="text-[14px] font-bold mb-1" style={{ color: colors.brandMaroon }}>
                          {storeName}
                        </div>
                      ))}
                    </div>

                    {/* Status do Seguro */}
                    <div className="text-[11px] mb-2">
                      {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].expired > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.brandRed }} />
                          <span style={{ color: colors.brandRed }} className="font-semibold">
                            Vencida
                          </span>
                        </div>
                      )}
                      {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].warning > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.tan }} />
                          <span style={{ color: colors.tan }} className="font-semibold">
                            A Vencer
                          </span>
                        </div>
                      )}
                      {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].status === "compliant" && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.forest }} />
                          <span style={{ color: colors.forest }} className="font-semibold">
                            Conforme
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações adicionais (secundárias) */}
                    {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].storeDetails && (
                      <div className="pt-2 border-t" style={{ borderColor: colors.cardBorder }}>
                        <div className="text-[9px] text-gray-600 dark:text-[#94A3B8]">
                          {complianceMapData[hoveredCell.row].sectors[hoveredCell.col].storeDetails.split('\n')?.map((line, idx) => (
                            <div key={idx} className="mb-0.5">
                              {line.split(':')[1]?.trim() || line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-center" style={{ color: colors.forest }}>
                    <div className="font-semibold mb-1">Todas em conformidade</div>
                    <div className="text-[9px] text-gray-500 dark:text-[#94A3B8]">{complianceMapData[hoveredCell.row].floor}</div>
                  </div>
                )}
              </div>
            )}

            {/* Legend - Simplified */}
            <div className="flex justify-center gap-4 text-[10px] pt-3 border-t" style={{ borderColor: colors.cardBorder }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.forest }} />
                <span className="text-gray-600 dark:text-[#94A3B8]">Conforme</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.tan }} />
                <span className="text-gray-600 dark:text-[#94A3B8]">A Vencer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.brandRed }} />
                <span className="text-gray-600 dark:text-[#94A3B8]">Vencida</span>
              </div>
            </div>
          </motion.div>
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
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>LUC *</label>
                  <input
                    type="text"
                    required
                    value={formData.luc}
                    onChange={(e) => setFormData({ ...formData, luc: e.target.value })}
                    placeholder="T-359A"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    placeholder="CAROL BASSI"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Segmento *</label>
                  <select
                    required
                    value={formData.segmento}
                    onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  >
                    <option value="">Selecione...</option>
                    {SEGMENTO_OPTIONS?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Seguradora *</label>
                  <input
                    type="text"
                    required
                    value={formData.seguradora}
                    onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                    placeholder="Mapfre Seguros"
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Vigência *</label>
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
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Vencimento *</label>
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

              </div>

              {formError && (
                <div className="rounded-lg border px-4 py-3 text-[12px]" style={{ borderColor: `${colors.brandRed}40`, color: colors.brandRed, backgroundColor: `${colors.brandRed}08` }}>
                  {formError}
                </div>
              )}

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
                  disabled={isSubmittingApolice}
                  className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white bg-[#D93030] dark:bg-[#E04444] disabled:opacity-70 disabled:cursor-not-allowed"
                  whileHover={!isSubmittingApolice ? {
                    scale: 1.05,
                    filter: "brightness(1.1)",
                    boxShadow: "0 8px 20px rgba(217, 48, 48, 0.3)"
                  } : undefined}
                  whileTap={!isSubmittingApolice ? { scale: 0.98 } : undefined}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {isSubmittingApolice ? 'Criando...' : 'Criar Apólice'}
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
                <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">{selectedPolicy.segmento}</p>

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
                    element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Apólice: ${selectedPolicy?.id}\nSegmento: ${selectedPolicy?.segmento}\nSeguradora: ${selectedPolicy?.seguradora}\nVigência: ${selectedPolicy?.vigencia}\nVencimento: ${selectedPolicy?.vencimento}\nStatus: ${selectedPolicy?.status}`);
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
                    <div className="font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.segmento}</div>
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
                    {nonConformingStores?.map((store, index) => (
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
                <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Envie o arquivo CSV da apólice</p>
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
                  accept=".csv,text/csv"
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
                        {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo CSV aqui'}
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-[#94A3B8]">
                        ou clique para selecionar do seu computador
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-[#64748B]">
                        Apenas arquivos CSV • Tamanho máximo: 10MB
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
      {showEditApoliceModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-[#242938] rounded-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.cardBorder}`, boxShadow: `0 20px 60px ${colors.brandMaroon}30` }}>
            <div className="sticky top-0 bg-white dark:bg-[#242938] border-b p-6 flex items-center justify-between" style={{ borderColor: colors.cardBorder }}>
              <div>
                <h2 className="text-[24px] font-bold" style={{ color: colors.brandMaroon }}>Editar Apólice {selectedPolicy.id}</h2>
                <p className="text-[12px] text-gray-500 dark:text-[#94A3B8] mt-1">Atualize os dados da apólice</p>
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

            <form onSubmit={handleSubmitEditApolice} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>LUC *</label>
                  <input
                    type="text"
                    required
                    value={formData.luc}
                    onChange={(e) => setFormData({ ...formData, luc: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={formData.fantasia}
                    onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Segmento *</label>
                  <select
                    required
                    value={formData.segmento}
                    onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  >
                    <option value="">Selecione...</option>
                    {SEGMENTO_OPTIONS?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Seguradora *</label>
                  <input
                    type="text"
                    required
                    value={formData.seguradora}
                    onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                    className="w-full px-4 py-2.5 border dark:border-[#2E3447] rounded-lg text-[13px] bg-gray-50 dark:bg-[#1E2435] focus:outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    style={{ borderColor: colors.cardBorder, color: colors.brandMaroon }}
                    onFocus={(e) => e.target.style.borderColor = colors.brandRed}
                    onBlur={(e) => e.target.style.borderColor = colors.cardBorder}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Vigência *</label>
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
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: colors.brandMaroon }}>Vencimento *</label>
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

              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.cardBorder }}>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteConfirm()}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg border text-[13px] font-semibold transition-all hover:bg-red-50 dark:hover:bg-red-950/20"
                  style={{ color: colors.brandRed, borderColor: `${colors.brandRed}40`, backgroundColor: `${colors.brandRed}08` }}
                  aria-label="Excluir apólice"
                  title="Excluir apólice"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="flex-1 px-4 py-3 border dark:border-[#2E3447] rounded-lg text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E]"
                  style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingApolice}
                  className="flex-1 px-4 py-3 rounded-lg text-[13px] font-semibold text-white bg-[#D93030] dark:bg-[#E04444] hover:bg-[#b92828] dark:hover:bg-[#F05555] transition-all"
                >
                  {isUpdatingApolice ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && selectedPolicy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#242938] border shadow-2xl" style={{ borderColor: colors.cardBorder }}>
            <div className="p-6 border-b" style={{ borderColor: colors.cardBorder }}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.brandRed}12`, color: colors.brandRed }}>
                  <Trash2 className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold" style={{ color: colors.brandMaroon }}>Apagar apólice</h3>
                  <p className="text-[12px] text-gray-500 dark:text-[#94A3B8]">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-[13px] text-gray-700 dark:text-[#CBD5E1]">
                Tem certeza que deseja apagar a apólice <span className="font-semibold" style={{ color: colors.brandMaroon }}>{selectedPolicy.id}</span>?
              </p>
              <p className="text-[12px] text-gray-500 dark:text-[#94A3B8]">
                Depois da exclusão, a apólice será removida do PostgreSQL e da listagem.
              </p>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeletingApolice}
                className="flex-1 rounded-lg border px-4 py-3 text-[13px] font-semibold transition-all hover:bg-gray-50 dark:hover:bg-[#1A1F2E] disabled:opacity-70"
                style={{ color: colors.brandMaroon, borderColor: colors.cardBorder }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteApolice}
                disabled={isDeletingApolice}
                className="flex-1 rounded-lg px-4 py-3 text-[13px] font-semibold text-white transition-all disabled:opacity-70"
                style={{ backgroundColor: colors.brandRed }}
              >
                {isDeletingApolice ? 'Apagando...' : 'Apagar apólice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
