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
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  X as XIcon,
  Archive,
  Activity,
  Menu,
  Check
} from "lucide-react";
import logo from "../../imports/image-4.png";
import joaoCarlosImg from "../../assets/joao-carlos.jpg";
import { useEffect, useState, useRef } from "react";
import { UserProfileProvider, type UserProfile } from "../contexts/UserProfileContext";
import { useAuth } from "../contexts/AuthContext";
import { request } from "../../api/client";
import { getNotificacoes, marcarTodasLidas, arquivarLidas, arquivarUnica, type Notificacao } from "../../api/notificacao";
import { motion, AnimatePresence } from "motion/react";
import { CommandPalette } from "./CommandPalette";
import { setSidebarCollapsed } from '../store';
import { FullscreenTable } from "./FullscreenTable";
import { GraphView } from "./GraphView";
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "@tabler/icons-react";

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
  const { role, logout, login, usuario, can } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // User profile management mapped from real AuthContext role
  const mappedProfileKey = role === 'admin' ? 'relacionamento' : role === 'gestor' ? 'marketing' : 'arquitetura';
  const userProfile = mappedProfileKey as UserProfile;

  // Can edit based on real auth role
  const canEdit = can ? can('editar') : false;

  // Profile configurations mapped to db mock users
  const profileConfig: Record<string, any> = {
    relacionamento: {
      name: 'Admin',
      userName: 'João Carlos',
      email: 'joao@flamboyant.com',
      senha: 'admin123',
      initials: 'JC',
      color: '#bc9b7c',
      textColor: '#6e150e',
      avatarUrl: joaoCarlosImg
    },
    marketing: {
      name: 'Gestor',
      userName: 'Maria Silva',
      email: 'maria@flamboyant.com',
      senha: 'gestor123',
      initials: 'MS',
      color: '#E17141',
      textColor: '#ffffff'
    },
    arquitetura: {
      name: 'Visualizador',
      userName: 'Pedro Lima',
      email: 'pedro@flamboyant.com',
      senha: 'viewer123',
      initials: 'PL',
      color: '#788033',
      textColor: '#ffffff'
    }
  };

  const currentProfile = profileConfig[userProfile] || profileConfig['relacionamento'];

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
    const handleAbrirNotificacoes = () => setIsNotificationOpen(prev => !prev);
    const handleToggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
    const handleMarcarLidas = () => handleMarkAllRead();

    window.addEventListener('toggle-theme', handleToggleTheme);
    window.addEventListener('abrir-notificacoes', handleAbrirNotificacoes);
    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    window.addEventListener('marcar-notificacoes-lidas', handleMarcarLidas);

    return () => {
      window.removeEventListener('toggle-theme', handleToggleTheme);
      window.removeEventListener('abrir-notificacoes', handleAbrirNotificacoes);
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
      window.removeEventListener('marcar-notificacoes-lidas', handleMarcarLidas);
    };
  }, [darkMode]); // Needs darkMode so toggleDarkMode closure has the latest value

  useEffect(() => {
    setSidebarCollapsed(isSidebarCollapsed);
  }, [isSidebarCollapsed]);

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
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  useEffect(() => {
    const handleToggleDarkMode = () => toggleDarkMode();
    window.addEventListener('toggle-dark-mode', handleToggleDarkMode);
    return () => {
      window.removeEventListener('toggle-dark-mode', handleToggleDarkMode);
    };
  }, [darkMode]);

  const handleProfileChange = async (profileKey: string) => {
    setIsProfileMenuOpen(false);
    if (logout) {
      logout();
    }
    navigate('/login');
  };

  const handleHeaderSearch = (query: string) => {
    setHeaderSearchQuery(query);
    if (query.trim()) {
      navigate(`/seguros?search=${encodeURIComponent(query)}`);
    }
  };

  // Notificações reais vindas do backend
  const [notifications, setNotifications] = useState<Notificacao[]>([]);

  const fetchNotificacoes = () => {
    getNotificacoes().then(data => {
      setNotifications(data || []);
    }).catch(e => {
      console.error("Erro ao carregar notificações", e);
      setNotifications([]);
    });
  };

  useEffect(() => {
    // Busca inicial e depois a cada 1 minuto para mantê-las atualizadas
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.lida).length;
  const vencidas = notifications.filter(n => n.type === 'vencida').sort((a, b) => b.dias - a.dias);
  const aVencer = notifications.filter(n => n.type === 'a_vencer').sort((a, b) => a.dias - b.dias);
  const equipe = notifications.filter(n => n.type === 'equipe');

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
      await marcarTodasLidas();
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (e) { console.error(e); }
  };

  const handleArchiveRead = async () => {
    try {
      await arquivarLidas();
      setNotifications(prev => prev.filter(n => !n.lida));
    } catch (e) { console.error(e); }
  };

  const handleArchiveSingle = async (e: React.MouseEvent, id: number | string) => {
    e.stopPropagation();
    try {
      await arquivarUnica(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };
  
  return (
    <div className={`flex flex-col md:flex-row w-full bg-[#F7F4EF] dark:bg-[#0F1117] relative app-root ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-open'}`}>

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
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="relative rounded-full outline-none focus:outline-none focus:ring-0 [-webkit-tap-highlight-color:transparent]"
            >
              <UserAvatar profile={currentProfile} sizeClass="w-8 h-8 text-xs" />
            </button>
          </div>
        </div>

        {/* Navegação Horizontal Dinâmica */}
        <style>{`
          @media (max-width: 640px) {
            .nav-items { overflow-x: auto; scrollbar-width: none; }
            .nav-items::-webkit-scrollbar { display: none; }
            .nav-item { font-size: 11px; padding: 8px 10px; white-space: nowrap; }
          }
        `}</style>
        <nav className="nav-items relative" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
          <div className="flex px-3 py-2.5 min-w-max" style={{ gap: '4px' }}>
            {(() => {
              const navLinks = [
                { id: 'dashboard', icon: Home, label: 'Dashboard', to: '#', disabled: true },
                { id: 'sinistro', icon: ShieldAlert, label: 'Novo Sinistro', to: '#', disabled: true },
                { id: 'historico', icon: FileText, label: 'Histórico', to: '#', disabled: true },
                { id: 'seguros', icon: Shield, label: 'Seguros', to: '/seguros', disabled: false },
                { id: 'lojistas', icon: Users, label: 'Lojistas', to: '#', disabled: true },
                { id: 'relatorios', icon: BarChart3, label: 'Relatórios', to: '#', disabled: true },
              ];
              const isMany = navLinks.length > 4;
              const visible = isMany ? navLinks.slice(0, 4) : navLinks;
              const overflow = isMany ? navLinks.slice(4) : [];
              return (
                <>
                  {visible.map((item) => (
                    item.disabled ? (
                      <div key={item.id} className="nav-item flex items-center rounded-lg font-medium flex-shrink-0 text-white/50 opacity-50 cursor-not-allowed">
                        <item.icon className="w-4 h-4 mr-2 opacity-90" /> {item.label}
                      </div>
                    ) : (
                      <NavLink key={item.id} to={item.to} className={({isActive}) => `nav-item flex items-center rounded-lg font-medium transition-colors flex-shrink-0 outline-none focus:outline-none focus:ring-0 [-webkit-tap-highlight-color:transparent] ${isActive ? 'text-white bg-white/10' : 'text-white/80 hover:text-white'}`}>
                        <item.icon className="w-4 h-4 mr-2 opacity-90" /> {item.label}
                      </NavLink>
                    )
                  ))}
                  {isMany && (
                    <button onClick={() => setIsMobileDrawerOpen(true)} className="nav-item flex items-center rounded-lg font-medium transition-colors flex-shrink-0 text-white/80 hover:text-white bg-[#a0191e50] outline-none focus:outline-none focus:ring-0 [-webkit-tap-highlight-color:transparent]">
                        <Menu className="w-4 h-4 mr-2" /> Mais
                    </button>
                  )}
                </>
              );
            })()}
            <div className="w-4 flex-shrink-0" />
          </div>
        </nav>

        {/* Drawer for overflow nav items */}
        <AnimatePresence>
          {isMobileDrawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileDrawerOpen(false)} className="fixed inset-0 bg-black/50 z-[60]" />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#151515] rounded-t-2xl z-[70] shadow-2xl pb-6">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#222222]">
                  <h3 className="font-bold text-gray-900 dark:text-white">Mais Opções</h3>
                  <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-col p-2">
                  {(() => {
                    const overflow = [
                      { id: 'lojistas', icon: Users, label: 'Lojistas', to: '#', disabled: true },
                      { id: 'relatorios', icon: BarChart3, label: 'Relatórios', to: '#', disabled: true },
                    ];
                    return overflow.map((item) => (
                      item.disabled ? (
                        <div key={item.id} className="flex items-center p-3 text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50">
                          <item.icon className="w-5 h-5 mr-3" /> {item.label}
                        </div>
                      ) : (
                        <NavLink key={item.id} to={item.to} onClick={() => setIsMobileDrawerOpen(false)} className="flex items-center p-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#222222] rounded-lg">
                          <item.icon className="w-5 h-5 mr-3" /> {item.label}
                        </NavLink>
                      )
                    ));
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Drawer for Profile Menu */}
        <AnimatePresence>
          {isProfileMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-[60] md:hidden" />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#151515] rounded-t-2xl z-[70] shadow-2xl pb-6 md:hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#222222]">
                  <h3 className="font-bold text-gray-900 dark:text-white">Trocar Perfil</h3>
                  <button onClick={() => setIsProfileMenuOpen(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-col p-2">
                  {(Object.keys(profileConfig) as UserProfile[])?.map((profileKey) => {
                    const profile = profileConfig[profileKey];
                    const isActive = profileKey === userProfile;
                    return (
                      <button
                        key={profileKey}
                        onClick={() => handleProfileChange(profileKey)}
                        className={`flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${isActive ? 'bg-gray-50 dark:bg-[#222222]' : 'hover:bg-gray-50 dark:hover:bg-[#0a0a0a]'}`}
                      >
                        <UserAvatar profile={profile} sizeClass="w-10 h-10 text-base" sizeStyle={{ width: '40px', height: '40px' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9] truncate">
                            {profile.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#94A3B8] truncate">
                            {profile.name}
                          </p>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-green-600 dark:text-green-500" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Notification Panel */}
        {isNotificationOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsNotificationOpen(false)}
            />

            {/* Notification Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-[#151515] shadow-2xl z-50 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-[#151515] border-b border-gray-200 dark:border-[#222222] p-4">
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
              {vencidas.length > 0 && (
                <div className="border-b border-gray-200 dark:border-[#222222]">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices Vencidas ({vencidas.length})</h4>
                  </div>
                  {vencidas.map(n => (
                    <div
                      key={`mob-${n.id}`}
                      className="p-4 active:bg-gray-50 dark:active:bg-[#0a0a0a] transition-colors"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(`/seguros?search=${n.luc}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg flex-shrink-0 bg-red-100 dark:bg-red-900/20">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">{n.loja}</p>
                          <p className="text-sm text-gray-600 dark:text-[#94A3B8] mt-1">{n.luc}</p>
                          <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1.5">Vencida há {n.dias} dias</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Apólices a Vencer */}
              {aVencer.length > 0 && (
                <div className="border-b border-gray-200 dark:border-[#222222]">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Apólices a Vencer ({aVencer.length})</h4>
                  </div>
                  {aVencer.map(n => (
                    <div
                      key={`mob-${n.id}`}
                      className="p-4 active:bg-gray-50 dark:active:bg-[#0a0a0a] transition-colors"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(`/seguros?search=${n.luc}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-900/20">
                          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">{n.loja}</p>
                          <p className="text-sm text-gray-600 dark:text-[#94A3B8] mt-1">{n.luc}</p>
                          <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1.5">Vence em {n.dias} dias</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Atividade da Equipe */}
              {equipe.length > 0 && (
                <div className="border-b border-gray-200 dark:border-[#222222]">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">Atividade da Equipe</h4>
                  </div>
                  {equipe.map(n => (
                    <div
                      key={`mob-${n.id}`}
                      className="p-4 active:bg-gray-50 dark:active:bg-[#0a0a0a] transition-colors"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(`/seguros?search=${n.luc}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg flex-shrink-0 bg-blue-100 dark:bg-blue-900/20">
                          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">{n.mensagem}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-[#0a0a0a] text-center">
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
        className={`text-white flex-col hidden md:flex transition-[width,padding,opacity,margin] duration-300 sticky top-0 sidebar`}
        style={{
          backgroundColor: '#6e150e',
          width: isSidebarCollapsed ? '80px' : '256px'
        }}
      >
        <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'} pt-5 px-4 pb-4 mb-2 border-b relative`} style={{ borderColor: '#a0191e50' }}>
          {!isSidebarCollapsed && (
            <div className="flex items-center cursor-pointer flex-1" onClick={() => navigate('/seguros')}>
              <img src={logo} alt="Logo" className="w-11 h-11 aspect-square mr-3 sidebar-logo drop-shadow-md" />
              <div className="flex flex-col justify-center">
                <span className="font-extrabold text-[15px] text-white leading-tight tracking-wide drop-shadow-sm">FLAMBOYANT</span>
                <span className="font-semibold text-[13px] text-white/70 leading-tight tracking-widest uppercase">Shopping</span>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <img src={logo} alt="Logo" className="w-10 h-10 aspect-square cursor-pointer sidebar-logo mt-3 drop-shadow-md" onClick={() => navigate('/seguros')} />
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="transition-colors z-10 p-1.5 hover:bg-white/10 rounded-md flex-shrink-0 opacity-60 hover:opacity-100"
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? <IconLayoutSidebarLeftExpand size={22} /> : <IconLayoutSidebarLeftCollapse size={24} />}
          </button>
        </div>
        <nav className="flex-1 pb-6 px-4 space-y-1 overflow-hidden min-h-0 flex flex-col justify-start mt-4">
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
            onClick={() => {
              logout();
              navigate("/login");
            }}
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
      <div className="flex flex-col min-w-0 main-content">
        {/* Top Header - Hidden on mobile */}
        <header className="hidden md:flex h-16 bg-white dark:bg-[#151515] border-b border-gray-200 dark:border-[#222222] items-center justify-between px-6 z-50 transition-[height,padding,margin,border] duration-300">
          <div className="flex-1 max-w-xl">
            {/* O trigger do Command Palette foi removido conforme solicitado */}
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
                  className="absolute top-full right-0 mt-2 w-[min(320px,_90vw)] bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded-lg shadow-xl overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-gray-200 dark:border-[#222222] flex justify-between items-center bg-white dark:bg-[#151515]">
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
                      <div className="border-b border-gray-100 dark:border-[#222222]">
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-[#0a0a0a]/50">
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
                              className={`group flex items-start gap-2 p-2.5 border-b border-gray-50 dark:border-[#222222]/50 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] cursor-pointer transition-colors ${bgClass}`}
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
                      <div className="border-b border-gray-100 dark:border-[#222222]">
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-[#0a0a0a]/50">
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
                              className={`group flex items-start gap-2 p-2.5 border-b border-gray-50 dark:border-[#222222]/50 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] cursor-pointer transition-colors ${bgClass}`}
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

                    {/* Atividade da Equipe */}
                    {equipe.length > 0 && (
                      <div className="border-b border-gray-100 dark:border-[#222222]">
                        <div className="px-3 py-1.5 bg-gray-50/50 dark:bg-[#0a0a0a]/50">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Atividade da Equipe</h4>
                        </div>
                        <AnimatePresence>
                        {equipe.map(n => {
                          const isUnread = !n.lida;
                          const dotClass = n.lida ? 'border border-gray-300 dark:border-gray-600 bg-transparent' : 'bg-blue-500';
                          const bgClass = isUnread ? 'bg-[rgba(59,130,246,0.03)] dark:bg-[rgba(59,130,246,0.05)]' : 'opacity-80';
                          
                          return (
                            <motion.div 
                              key={`eq-${n.id}`} 
                              layout
                              initial={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigate(`/seguros?search=${n.luc}`);
                              }}
                              className={`group flex items-start gap-2 p-2.5 border-b border-gray-50 dark:border-[#222222]/50 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] cursor-pointer transition-colors ${bgClass}`}
                            >
                              <div className={`w-[6px] h-[6px] rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                                    {n.mensagem}
                                  </p>
                                  <button onClick={(e) => handleArchiveSingle(e, n.id)} className="text-[10px] text-gray-400 hover:text-blue-500 hidden group-hover:block" title="Arquivar">
                                    <Archive className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-[#222222]">
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
            <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-[#222222] pl-4" ref={profileMenuRef}>
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-[#F1F5F9]">{usuario?.nome || currentProfile.userName}</span>
                <span className="text-xs text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider">{role || currentProfile.name}</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="transition-transform hover:scale-105 block"
                >
                  <UserAvatar profile={{...currentProfile, avatarUrl: (usuario && usuario.email === currentProfile.email) ? (usuario.avatar_url || currentProfile.avatarUrl) : currentProfile.avatarUrl}} sizeClass="w-9 h-9 text-sm" sizeStyle={{ width: '36px', height: '36px' }} />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[min(256px,_80vw)] bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded-lg shadow-lg overflow-hidden z-50">
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
                              ? 'bg-gray-100 dark:bg-[#0a0a0a]'
                              : 'hover:bg-gray-50 dark:hover:bg-[#0a0a0a]'
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
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 scroll-smooth bg-[#F7F4EF] dark:bg-[#0F1117] transition-[padding,height] duration-300 p-4 md:p-6">
          <div className="w-full">
            <UserProfileProvider value={{ userProfile, canEdit }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {outlet}
                </motion.div>
              </AnimatePresence>
            </UserProfileProvider>
          </div>
        </main>
      </div>
    </div>
  );
}