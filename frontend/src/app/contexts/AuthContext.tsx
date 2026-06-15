import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { request } from '../../api/client';
import { toast } from 'sonner';

export type Role = 'admin' | 'gestor' | 'visualizador';
export type Acao = 'criar' | 'editar' | 'excluir' | 'renovar' | 'ver_audit';

export interface UsuarioDTO {
  id: number;
  nome: string;
  email: string;
  role: Role;
  ativo?: boolean;
  avatar_url?: string;
}

export interface AuthContextType {
  usuario: UsuarioDTO | null;
  role: Role | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  loginAsDev: () => void;
  logout: () => void;
  isAdmin: boolean;
  isGestor: boolean;
  can: (acao: Acao) => boolean;
  loading: boolean;
}

const permissoes: Record<Role, Acao[]> = {
  admin:        ['criar', 'editar', 'excluir', 'renovar', 'ver_audit'],
  gestor:       ['criar', 'editar', 'renovar'],
  visualizador: []
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<UsuarioDTO | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('flamboyant_token'));
  const [loading, setLoading] = useState(true);

  const role = usuario?.role || null;
  const isAdmin = role === 'admin';
  const isGestor = role === 'gestor';

  const can = (acao: Acao) => {
    if (!role) return false;
    return permissoes[role].includes(acao);
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('flamboyant_token', token);
      if (token === "dev_bypass_token") {
        setUsuario({
          id: 1,
          nome: "Desenvolvedor (Bypass)",
          email: "dev@flamboyant.com",
          role: "admin",
          ativo: true
        });
        setLoading(false);
        return;
      }
      request<UsuarioDTO>('/auth/me')
        .then(user => {
          setUsuario(user);
        })
        .catch(err => {
          console.error("Token validation failed", err);
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('flamboyant_token');
      setUsuario(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, senha: string) => {
    try {
      const res = await request<{ token: string, usuario: UsuarioDTO }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha })
      });
      setToken(res.token);
      setUsuario(res.usuario);
      toast.success(`Bem-vindo, ${res.usuario.nome}!`);
    } catch (err: any) {
      throw new Error(err.message || 'Falha no login');
    }
  };

  const loginAsDev = () => {
    const devUser: UsuarioDTO = {
      id: 1,
      nome: "Desenvolvedor (Bypass)",
      email: "dev@flamboyant.com",
      role: "admin",
      ativo: true
    };
    setToken("dev_bypass_token");
    setUsuario(devUser);
    toast.success("Login de Desenvolvedor ativado!");
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('flamboyant_token');
  };

  const value: AuthContextType = {
    usuario,
    role,
    token,
    login,
    loginAsDev,
    logout,
    isAdmin,
    isGestor,
    can,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
