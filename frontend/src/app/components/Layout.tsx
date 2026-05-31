import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
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
  AlertTriangle
} from "lucide-react";
import logo from "../../imports/image-4.png";
import { useEffect, useState, useRef } from "react";
import { UserProfileProvider, type UserProfile } from "../contexts/UserProfileContext";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
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
      textColor: '#6e150e'
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

  // Notificações - Apólices vencidas e a vencer
  const notifications = [
    {
      id: 1,
      type: 'vencida',
      title: 'Apólice Vencida',
      policy: 'SU-2024-4521',
      description: 'Alagamento e Infiltração',
      date: 'Vencida há 49 dias',
      priority: 'high'
    },
    {
      id: 2,
      type: 'atencao',
      title: 'Atenção: Vence em Breve',
      policy: 'TM-2024-9012',
      description: 'Seguro Incêndio',
      date: 'Vence em 18 dias',
      priority: 'medium'
    }
  ];
  
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F7F4EF] dark:bg-[#0F1117]">
      {/* Mobile Header com Logo e Navegação Horizontal */}
      <div className="md:hidden flex flex-col sticky top-0 z-30" style={{ backgroundColor: '#6e150e' }}>
        {/* Logo e Avatar */}
        <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: '#a0191e50' }}>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-6 h-6" />
            <span className="font-bold text-base tracking-wide text-white">Shopping Flamboyant</span>
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
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#D93030] rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs" style={{ backgroundColor: currentProfile.color, color: currentProfile.textColor }}>
              {currentProfile.initials}
            </div>
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
        className="text-white flex-col hidden md:flex transition-all duration-300"
        style={{
          backgroundColor: '#6e150e',
          width: isSidebarCollapsed ? '80px' : '256px'
        }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: '#a0191e50' }}>
          {!isSidebarCollapsed && (
            <>
              <img src={logo} alt="Logo" className="w-7 h-7 mr-3" />
              <span className="font-bold text-lg tracking-wide flex-1">Flamboyant Shopping</span>
            </>
          )}
          {isSidebarCollapsed && (
            <img src={logo} alt="Logo" className="w-7 h-7 mx-auto" />
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-white/80 hover:text-white hover:bg-[#a0191e50] rounded-lg transition-colors"
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          <div
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group`}
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
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group`}
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
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group`}
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
            className={({isActive}) => `flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium transition-colors relative group ${isActive ? 'text-white' : 'text-white/80 hover:text-white'}`}
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
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group`}
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
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg text-sm font-medium text-white/50 opacity-50 cursor-not-allowed relative group`}
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
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} w-full px-4 py-3 text-sm font-medium text-white/80 hover:text-white rounded-lg transition-colors relative group`}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a0191e50'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isSidebarCollapsed ? "Sair" : ""}
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
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              </span>
            </div>
          </div>

          <div className="flex items-center ml-6 space-x-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#D93030] rounded-full"></span>
              </button>

              {/* Notification Dropdown - Desktop */}
              {isNotificationOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#242938] border border-gray-200 dark:border-[#2E3447] rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-[#2E3447]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-[#F1F5F9]">Notificações</h3>
                    <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-0.5">{notifications.length} alertas pendentes</p>
                  </div>

                  {/* Apólices Vencidas */}
                  <div className="border-b border-gray-200 dark:border-[#2E3447]">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#1A1F2E]">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices Vencidas (1)</h4>
                    </div>
                    <div
                      className="p-4 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors cursor-pointer"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate('/seguros');
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg flex-shrink-0 bg-red-100 dark:bg-red-900/20">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">Apólice Vencida</p>
                          <p className="text-xs text-gray-600 dark:text-[#94A3B8] mt-1">SU-2024-4521 - Alagamento e Infiltração</p>
                          <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1">Vencida há 49 dias</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Apólices a Vencer */}
                  <div>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#1A1F2E]">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices a Vencer (1)</h4>
                    </div>
                    <div
                      className="p-4 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-colors cursor-pointer"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate('/seguros');
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-900/20">
                          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">Atenção: Vence em Breve</p>
                          <p className="text-xs text-gray-600 dark:text-[#94A3B8] mt-1">TM-2024-9012 - Seguro Incêndio</p>
                          <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1">Vence em 18 dias</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-[#1A1F2E] text-center border-t border-gray-200 dark:border-[#2E3447]">
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate('/seguros');
                      }}
                      className="text-xs font-medium text-[#D93030] dark:text-[#E04444] hover:underline"
                    >
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              )}
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
                className="w-9 h-9 rounded-full font-bold flex items-center justify-center transition-transform hover:scale-105"
                style={{ backgroundColor: currentProfile.color, color: currentProfile.textColor }}
              >
                {currentProfile.initials}
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
                          <div
                            className="w-10 h-10 rounded-full font-bold flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: profile.color, color: profile.textColor }}
                          >
                            {profile.initials}
                          </div>
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
              <Outlet />
            </UserProfileProvider>
          </div>
        </main>
      </div>
    </div>
  );
}