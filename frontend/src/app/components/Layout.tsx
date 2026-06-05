import { NavLink, useOutlet, useNavigate, useLocation } from "react-router";
import {
  Home,
  FileText,
  Users,
  BarChart3,
  LogOut,
  ShieldAlert,
  Shield,
  Bell,
  Search,
  Moon,
  Sun,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import logo from "../../imports/image-4.png";
import joaoCarlosImg from "../../assets/joao-carlos.jpg";
import { useEffect, useState, useRef } from "react";
import { UserProfileProvider, type UserProfile } from "../contexts/UserProfileContext";
import { request } from "../../api/client";
import { listApolices } from "../../api/apolice";
import { motion, AnimatePresence } from "motion/react";
import { CommandPalette } from "./CommandPalette";

const UserAvatar = ({ profile, sizeClass = "w-8 h-8", sizeStyle = { width: '32px', height: '32px' } }: any) => {
  const [error, setError] = useState(false);

  if (profile.avatarUrl && !error) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.userName}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        style={{ ...sizeStyle }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full font-bold flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: profile.color, color: profile.textColor, ...sizeStyle }}
    >
      {profile.initials}
    </div>
  );
};

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [darkMode, setDarkMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // User profile management - Simula autenticação
  const [userProfile, setUserProfile] = useState<UserProfile>('relacionamento');

  // Only 'relacionamento' profile (João Carlos) has edit permission
  const canEdit = userProfile === 'relacionamento';

  // Profile configurations
  const profileConfig = {
    relacionamento: {
      name: 'Relacionamentos',
      userName: 'João Carlos',
      initials: 'JC',
      color: '#bc9b7c',
      textColor: '#6e150e',
      avatarUrl: joaoCarlosImg
    },
    marketing: {
      name: 'Marketing',
      userName: 'Ana Silva',
      initials: 'AS',
      color: '#E17141',
      textColor: '#ffffff'
    },
    arquitetura: {
      name: 'Arquitetura',
      userName: 'Carlos Mendes',
      initials: 'CM',
      color: '#788033',
      textColor: '#ffffff'
    },
    engenharia: {
      name: 'Engenharia',
      userName: 'Maria Santos',
      initials: 'MS',
      color: '#1c3d32',
      textColor: '#ffffff'
    }
  };

  const currentProfile = profileConfig[userProfile];

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
    }
  }, []);

  useEffect(() => {
    const handleToggleTheme = () => toggleDarkMode();
    const handleAbrirNotificacoes = () => setIsNotificationOpen(true);
    const handleMarcarLidas = () => handleMarkAllRead();

    window.addEventListener('toggle-theme', handleToggleTheme);
    window.addEventListener('abrir-notificacoes', handleAbrirNotificacoes);
    window.addEventListener('marcar-notificacoes-lidas', handleMarcarLidas);

    return () => {
      window.removeEventListener('toggle-theme', handleToggleTheme);
      window.removeEventListener('abrir-notificacoes', handleAbrirNotificacoes);
      window.removeEventListener('marcar-notificacoes-lidas', handleMarcarLidas);
    };
  }, [darkMode]); // Needs darkMode so toggleDarkMode closure has the latest value


  useEffect(() => {
    // Sync header search with URL params when on seguros page
    if (location.pathname === '/seguros') {
      const searchParams = new URLSearchParams(location.search);
      const searchQuery = searchParams.get('search');
      if (searchQuery) {
        setHeaderSearchQuery(searchQuery);
      } else {
        setHeaderSearchQuery('');
      }
    } else {
      setHeaderSearchQuery('');
    }
  }, [location]);

  useEffect(() => {
    // Close profile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    // Close notification panel when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleProfileChange = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsProfileMenuOpen(false);
  };

  const handleHeaderSearch = (query: string) => {
    setHeaderSearchQuery(query);
    if (query.trim()) {
      navigate(`/seguros?search=${encodeURIComponent(query)}`);
    }
  };

  // Notificações reais baseadas nas apólices
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    listApolices().then(data => {
      const vencidas = data
        .filter(d => (d.dias_restantes ?? 0) < 0)
        .map(d => ({
          id: `notif-v-${d.luc}`,
          type: 'vencida',
          loja: d.fantasia || d.lojista || 'Loja',
          luc: d.luc,
          cobertura: d.segmento || d.tipo || 'Geral',
          dias: Math.abs(d.dias_restantes!),
          lida: false
        }));
      const aVencer = data
        .filter(d => (d.dias_restantes ?? 0) >= 0 && (d.dias_restantes ?? 0) <= 30)
        .map(d => ({
          id: `notif-a-${d.luc}`,
          type: 'a_vencer',
          loja: d.fantasia || d.lojista || 'Loja',
          luc: d.luc,
          cobertura: d.segmento || d.tipo || 'Geral',
          dias: d.dias_restantes!,
          lida: false
        }));
      setNotifications([...vencidas, ...aVencer]);
    }).catch(e => console.error("Erro ao carregar notificações", e));
  }, []);

  const unreadCount = notifications.filter(n => !n.lida).length;
  const vencidas = notifications.filter(n => n.type === 'vencida').sort((a, b) => b.dias - a.dias);
  const aVencer = notifications.filter(n => n.type === 'a_vencer').sort((a, b) => a.dias - b.dias);

  const [bellAnimate, setBellAnimate] = useState(false);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellAnimate(true);
      setTimeout(() => setBellAnimate(false), 300);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAllRead = async () => {
    try {
      await request('/notificacoes/marcar-lidas', { method: 'PATCH' });
    } catch (e) { console.error(e); }
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const handleArchiveRead = async () => {
    try {
      await request('/notificacoes/arquivadas', { method: 'DELETE' });
    } catch (e) { console.error(e); }
    setNotifications(prev => prev.filter(n => !n.lida));
  };

  const handleArchiveSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await request(`/notificacoes/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F7F4EF] dark:bg-[#0F1117]">
      {/* Mobile Header com Logo e Navegação Horizontal */}
      <div className="md:hidden flex flex-col sticky top-0 z-30" style={{ backgroundColor: '#6e150e' }}>
        {/* Logo e Avatar */}
        <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: '#a0191e50' }}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/seguros')}>
            <img src={logo} alt="Logo" className="w-6 h-6 sidebar-logo" />
            <span className="font-bold text-base tracking-wide text-white hover:text-gray-200 transition-colors">Shopping Flamboyant</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-1.5 text-white/80 hover:text-white rounded-full transition-colors"
              title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-1.5 text-white/80 hover:text-white rounded-full transition-colors"
              title="Notificações"
            >
              <motion.div animate={bellAnimate ? { rotate: [0, 3, -3, 3, 0] } : { rotate: 0 }} transition={{ duration: 0.3 }}>
                <Bell className="w-4 h-4" />
              </motion.div>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#D93030] rounded-full"></span>}
            </button>
            <UserAvatar profile={currentProfile} sizeClass="w-8 h-8 text-xs" />
          </div>
        </div>

        {/* Navegação Horizontal com Scroll */}
        <nav className="overflow-x-auto scrollbar-hide relative" style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}>
          {/* Gradient fade no final para indicar mais conteúdo */}
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10" style={{
            background: 'linear-gradient(to left, #6e150e 0%, transparent 100%)'
          }} />

          <div className="flex gap-1 px-3 py-2.5 min-w-max">
            <div className="flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
              <Home className="w-4 h-4 mr-2 opacity-90" /> Dashboard
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
              <ShieldAlert className="w-4 h-4 mr-2 opacity-90" /> Novo Sinistro
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
              <FileText className="w-4 h-4 mr-2 opacity-90" /> Histórico
            </div>
            <NavLink
              to="/seguros"
              className={({isActive}) => `flex items-center px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${isActive ? 'text-white' : 'text-white/80 hover:text-white'}`}
            >
              <Shield className="w-4 h-4 mr-2 opacity-90" /> Seguros
            </NavLink>
            <div className="flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
              <Users className="w-4 h-4 mr-2 opacity-90" /> Lojistas
            </div>
            <div className="flex items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
              <BarChart3 className="w-4 h-4 mr-2 opacity-90" /> Relatórios
            </div>
            {/* Padding extra no final para melhor visualização */}
            <div className="w-4 flex-shrink-0" />
          </div>
        </nav>

        {/* Mobile Notification Panel */}
        {isNotificationOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsNotificationOpen(false)}
            />

            {/* Notification Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-[#242938] shadow-2xl z-50 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-[#242938] border-b border-gray-200 dark:border-[#2E3447] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-[#F1F5F9]">Notificações</h3>
                    <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-0.5">{notifications.length} alertas pendentes</p>
                  </div>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Apólices Vencidas */}
              <div className="border-b border-gray-200 dark:border-[#2E3447]">
                <div className="px-4 py-3 bg-gray-50 dark:bg-[#1A1F2E]">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices Vencidas (1)</h4>
                </div>
                <div
                  className="p-4 active:bg-gray-50 dark:active:bg-[#1A1F2E] transition-colors"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate('/seguros');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg flex-shrink-0 bg-red-100 dark:bg-red-900/20">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">Apólice Vencida</p>
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8] mt-1">SU-2024-4521 - Alagamento e Infiltração</p>
                      <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1.5">Vencida há 49 dias</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Apólices a Vencer */}
              <div className="border-b border-gray-200 dark:border-[#2E3447]">
                <div className="px-4 py-3 bg-gray-50 dark:bg-[#1A1F2E]">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices a Vencer (1)</h4>
                </div>
                <div
                  className="p-4 active:bg-gray-50 dark:active:bg-[#1A1F2E] transition-colors"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate('/seguros');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-900/20">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">Atenção: Vence em Breve</p>
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8] mt-1">TM-2024-9012 - Seguro Incêndio</p>
                      <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1.5">Vence em 18 dias</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-[#1A1F2E] text-center">
                <button
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate('/seguros');
                  }}
                  className="text-sm font-medium text-[#D93030] dark:text-[#E04444] hover:underline"
                >
                  Ver todas as notificações
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sidebar Desktop */}
      <aside
        className="text-white flex-col hidden md:flex transition-all duration-300 overflow-hidden h-screen sticky top-0"
        style={{
          backgroundColor: '#6e150e',
          width: isSidebarCollapsed ? '80px' : '256px'
        }}
      >
        <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'} pt-5 px-4 pb-4 mb-2 border-b`} style={{ borderColor: '#a0191e50' }}>
          {!isSidebarCollapsed && (
            <div className="flex items-center cursor-pointer flex-1" onClick={() => navigate('/seguros')}>
              <img src={logo} alt="Logo" className="w-9 h-9 aspect-square mr-3 sidebar-logo" />
              <div className="flex flex-col justify-center">
                <span className="font-semibold text-[14px] text-white leading-tight">Flamboyant</span>
                <span className="font-normal text-[12px] text-white opacity-70 leading-tight">Shopping</span>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <img src={logo} alt="Logo" className="w-9 h-9 aspect-square cursor-pointer sidebar-logo" onClick={() => navigate('/seguros')} />
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-white/80 hover:text-white hover:bg-[#a0191e50] rounded-lg transition-colors flex-shrink-0"
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="flex-1 pb-6 px-4 space-y-1 overflow-hidden min-h-0 flex flex-col justify-start">
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group transition-all duration-300 hover:bg-white/5 hover:translate-x-1`}
            title={isSidebarCollapsed ? "Dashboard" : ""}
          >
            <Home className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Dashboard"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Dashboard
              </span>
            )}
          </div>
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group transition-all duration-300 hover:bg-white/5 hover:translate-x-1`}
            title={isSidebarCollapsed ? "Novo Sinistro" : ""}
          >
            <ShieldAlert className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Novo Sinistro"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Novo Sinistro
              </span>
            )}
          </div>
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group transition-all duration-300 hover:bg-white/5 hover:translate-x-1`}
            title={isSidebarCollapsed ? "Histórico" : ""}
          >
            <FileText className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Histórico"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Histórico
              </span>
            )}
          </div>
          <NavLink
            to="/seguros"
            className={({isActive}) => `flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 relative group ${isActive ? 'text-white translate-x-1 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1'}`}
            style={({isActive}) => isActive ? { backgroundColor: '#a0191e' } : {}}
            title={isSidebarCollapsed ? "Seguros" : ""}
          >
            <Shield className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Seguros"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Seguros
              </span>
            )}
          </NavLink>
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group transition-all duration-300 hover:bg-white/5 hover:translate-x-1`}
            title={isSidebarCollapsed ? "Lojistas" : ""}
          >
            <Users className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Lojistas"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Lojistas
              </span>
            )}
          </div>
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group transition-all duration-300 hover:bg-white/5 hover:translate-x-1`}
            title={isSidebarCollapsed ? "Relatórios" : ""}
          >
            <BarChart3 className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'} opacity-90`} />
            {!isSidebarCollapsed && " Relatórios"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Relatórios
              </span>
            )}
          </div>
        </nav>

        <div className="p-4 border-t" style={{ borderColor: '#a0191e50' }}>
          <button
            onClick={() => navigate("/")}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} w-full px-4 py-3 text-sm font-medium text-white/80 hover:text-white rounded-lg transition-all duration-300 hover:bg-white/10 hover:translate-x-1 relative group`}
          >
            <LogOut className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && " Sair"}
            {isSidebarCollapsed && (
              <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Sair
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Hidden on mobile */}
        <header className="hidden md:flex h-16 bg-white dark:bg-[#242938] border-b border-gray-200 dark:border-[#2E3447] items-center justify-between px-6 z-10">
          <div className="flex-1 max-w-xl">
            {/* Search Placeholder */}
            <div className="relative flex items-center">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Pressione <kbd className="px-1.5 py-0.5 rounded border bg-gray-100 dark:bg-[#1A1F2E] border-gray-200 dark:border-[#2E3447] ml-1">⌘K</kbd> ou <kbd className="px-1.5 py-0.5 rounded border bg-gray-100 dark:bg-[#1A1F2E] border-gray-200 dark:border-[#2E3447]">Ctrl+K</kbd> para buscar
              </span>
            </div>
          </div>

          <div className="flex items-center ml-6 space-x-4">

            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <motion.div animate={bellAnimate ? { rotate: [0, 3, -3, 3, 0] } : { rotate: 0 }} transition={{ duration: 0.3 }}>
                  <Bell className="w-5 h-5" />
                </motion.div>
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#D93030] rounded-full"></span>}
              </button>

              {/* Notification Dropdown - Desktop */}
              <AnimatePresence>
              {isNotificationOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded-lg shadow-xl overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-gray-200 dark:border-[#2E3447] flex justify-between items-center bg-white dark:bg-[#242938]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-[#F1F5F9]">Notificações</h3>
                      <AnimatePresence mode="popLayout">
                        {unreadCount > 0 && (
                          <motion.span 
                            key={unreadCount}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#3e0000] text-[#c4151f] text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          >
                            {unreadCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] font-medium text-[#c4151f] hover:underline">
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {/* Apólices Vencidas */}
                    {vencidas.length > 0 && (
                      <div className="border-b border-gray-100 dark:border-[#2E3447]">
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-[#1A1F2E]/50">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vencidas ({vencidas.length})</h4>
                        </div>
                        <AnimatePresence>
                        {vencidas.map(n => {
                          const isUnread = !n.lida;
                          const dotClass = n.lida ? 'border border-gray-300 dark:border-gray-600 bg-transparent' : 'bg-[#c4151f]';
                          const bgClass = isUnread ? 'bg-[rgba(196,21,31,0.03)] dark:bg-[rgba(196,21,31,0.05)]' : 'opacity-55';
                          
                          return (
                            <motion.div 
                              key={n.id} 
                              layout
                              initial={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigate(`/seguros?search=${n.luc}`);
                              }}
                              className={`group flex items-start gap-2 p-2.5 border-b border-gray-50 dark:border-[#2E3447]/50 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] cursor-pointer transition-colors ${bgClass}`}
                            >
                              <div className={`w-[6px] h-[6px] rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                                    {n.loja} <span className="text-gray-400 font-normal ml-1">{n.luc}</span>
                                  </p>
                                  <span className="text-[10px] flex-shrink-0 text-[#c4151f] font-medium group-hover:hidden">-{n.dias}d</span>
                                  <button onClick={(e) => handleArchiveSingle(e, n.id)} className="text-[10px] text-gray-400 hover:text-red-500 hidden group-hover:block" title="Arquivar">
                                    ✕
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {n.cobertura} • Vencida há {n.dias} dias
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Apólices a Vencer */}
                    {aVencer.length > 0 && (
                      <div className="border-b border-gray-100 dark:border-[#2E3447]">
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-[#1A1F2E]/50">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">A Vencer em 30 dias ({aVencer.length})</h4>
                        </div>
                        <AnimatePresence>
                        {aVencer.map(n => {
                          const isUnread = !n.lida;
                          const dotClass = n.lida ? 'border border-gray-300 dark:border-gray-600 bg-transparent' : 'bg-amber-500';
                          const bgClass = isUnread ? 'bg-[rgba(196,21,31,0.03)] dark:bg-[rgba(196,21,31,0.05)]' : 'opacity-55';
                          
                          return (
                            <motion.div 
                              key={n.id} 
                              layout
                              initial={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigate(`/seguros?search=${n.luc}`);
                              }}
                              className={`group flex items-start gap-2 p-2.5 border-b border-gray-50 dark:border-[#2E3447]/50 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] cursor-pointer transition-colors ${bgClass}`}
                            >
                              <div className={`w-[6px] h-[6px] rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                                    {n.loja} <span className="text-gray-400 font-normal ml-1">{n.luc}</span>
                                  </p>
                                  <span className="text-[10px] flex-shrink-0 text-amber-600 dark:text-amber-500 font-medium group-hover:hidden">{n.dias}d</span>
                                  <button onClick={(e) => handleArchiveSingle(e, n.id)} className="text-[10px] text-gray-400 hover:text-red-500 hidden group-hover:block" title="Arquivar">
                                    ✕
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {n.cobertura} • Vence em {n.dias} dias
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-[#1A1F2E] border-t border-gray-200 dark:border-[#2E3447]">
                    <button onClick={handleArchiveRead} className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors">
                      Arquivar lidas
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            <button
              onClick={toggleDarkMode}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative flex items-center space-x-3 border-l border-gray-200 dark:border-[#2E3447] pl-4" ref={profileMenuRef}>
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{currentProfile.userName}</span>
                <span className="text-xs text-gray-500 dark:text-[#94A3B8]">{currentProfile.name}</span>
              </div>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="transition-transform hover:scale-105"
              >
                <UserAvatar profile={currentProfile} sizeClass="w-9 h-9 text-sm" sizeStyle={{ width: '36px', height: '36px' }} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="py-2">
                    {(Object.keys(profileConfig) as UserProfile[])?.map((profileKey) => {
                      const profile = profileConfig[profileKey];
                      const isActive = profileKey === userProfile;

                      return (
                        <button
                          key={profileKey}
                          onClick={() => handleProfileChange(profileKey)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                            isActive
                              ? 'bg-gray-100 dark:bg-[#1A1F2E]'
                              : 'hover:bg-gray-50 dark:hover:bg-[#1A1F2E]'
                          }`}
                        >
                          <UserAvatar profile={profile} sizeClass="w-10 h-10 text-base" sizeStyle={{ width: '40px', height: '40px' }} />
                          <div className="flex flex-col items-start flex-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">
                              {profile.userName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-[#94A3B8]">
                              {profile.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6 bg-[#F7F4EF] dark:bg-[#0F1117]">
          <div className="w-full">
            <UserProfileProvider value={{ userProfile, canEdit }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {outlet}
                </motion.div>
              </AnimatePresence>
            </UserProfileProvider>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}