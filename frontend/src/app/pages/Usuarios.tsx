import { useState, useEffect } from "react";
import { useAuth, Role, UsuarioDTO } from "../contexts/AuthContext";
import { request } from "../../api/client";
import { Shield, Plus, Edit2, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export function Usuarios() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UsuarioDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Dialog
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("visualizador");

  // Edit Role Dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioDTO | null>(null);
  const [editRole, setEditRole] = useState<Role>("visualizador");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await request<UsuarioDTO[]>('/usuarios');
      setUsers(data);
    } catch (err) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nome: inviteName, email: inviteEmail, role: inviteRole })
      });
      toast.success("Usuário convidado com sucesso!");
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("visualizador");
      loadUsers();
    } catch (err) {
      toast.error("Falha ao criar usuário.");
    }
  };

  const openEdit = (u: UsuarioDTO) => {
    setEditingUser(u);
    setEditRole(u.role);
    setIsEditOpen(true);
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await request(`/usuarios/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole })
      });
      toast.success("Role atualizado com sucesso!");
      setIsEditOpen(false);
      loadUsers();
    } catch (err) {
      toast.error("Erro ao atualizar role.");
    }
  };

  const toggleAtivo = async (u: UsuarioDTO) => {
    try {
      await request(`/usuarios/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !u.ativo })
      });
      toast.success(`Usuário ${u.ativo ? 'desativado' : 'ativado'}.`);
      loadUsers();
    } catch (err) {
      toast.error("Erro ao alterar status do usuário.");
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (role !== "admin") {
    return (
      <div className="flex justify-center items-center h-full text-red-500 font-bold">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-[18px] md:text-2xl font-semibold md:font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="hidden md:block w-6 h-6 text-[#c4151f]" />
            Gestão de Usuários
          </h1>
          <p className="text-[12px] md:text-sm text-gray-500 dark:text-[#94A3B8] md:mt-1 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Administre quem tem acesso ao sistema e os níveis de permissão.
          </p>
        </div>
        
        <button 
          onClick={() => setIsInviteOpen(true)}
          className="w-full md:w-auto bg-[#c4151f] hover:bg-[#a01119] text-white px-4 py-2.5 md:py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Convidar Usuário
        </button>
      </div>

      {/* Mobile List View */}
      <div className="block md:hidden flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : users.map(u => (
            <div key={u.id} className="user-card-mobile flex items-center justify-between p-4 bg-white dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-xl shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="avatar flex-shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center font-bold text-[#c4151f] dark:text-[#e04444] bg-gray-200 dark:bg-[#2a2a2a] border-2 border-white dark:border-[#151515]">
                  {getInitials(u.nome)}
                </div>
                <div className="user-info min-w-0 pr-2">
                  <div className="user-name text-[14px] font-medium text-gray-900 dark:text-white truncate">{u.nome}</div>
                  <div className="user-email text-[12px] text-gray-500 dark:text-[#94A3B8] truncate">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`role-badge px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider ${
                  u.role === 'admin' ? 'bg-[#3e0000] text-[#c4151f]' :
                  u.role === 'gestor' ? 'bg-[#2a1f00] text-[#f9e4a0]' :
                  'bg-white/5 text-white/40'
                }`} style={u.role === 'visualizador' ? { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' } : {}}>
                  {u.role.toUpperCase()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="user-actions-btn p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEdit(u)} className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> Editar role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toggleAtivo(u)} className="flex items-center gap-2">
                      {u.ativo ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {u.ativo ? "Desativar" : "Reativar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:flex bg-white dark:bg-[#151515] border border-gray-200 dark:border-[#222222] rounded-xl overflow-hidden flex-1 flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#0a0a0a] text-xs uppercase font-semibold text-gray-500 dark:text-[#64748B] border-b border-gray-200 dark:border-[#222222] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222222]">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Carregando...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center font-bold text-[#c4151f] dark:text-[#e04444] border-2 border-white dark:border-[#151515]">
                        {getInitials(u.nome)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{u.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      u.role === 'gestor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {u.ativo ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ativo</>
                      ) : (
                        <><Ban className="w-4 h-4 text-gray-400" /> Inativo</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEdit(u)}
                        className="text-gray-500 hover:text-[#c4151f] p-1.5 bg-gray-100 dark:bg-[#222] rounded transition-colors"
                        title="Editar role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleAtivo(u)}
                        className={`${u.ativo ? 'text-gray-500 hover:text-red-600' : 'text-gray-500 hover:text-emerald-500'} p-1.5 bg-gray-100 dark:bg-[#222] rounded transition-colors`}
                        title={u.ativo ? "Desativar" : "Reativar"}
                      >
                        {u.ativo ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Convidar */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="flex flex-col gap-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role Inicial</label>
              <select 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as Role)}
                className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="visualizador">Visualizador</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#c4151f] hover:bg-[#a01119] text-white">Criar e Convidar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Role */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Role: {editingUser?.nome}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRole} className="flex flex-col gap-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Novo Role</label>
              <select 
                value={editRole} 
                onChange={e => setEditRole(e.target.value as Role)}
                className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="visualizador">Visualizador</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#c4151f] hover:bg-[#a01119] text-white">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
