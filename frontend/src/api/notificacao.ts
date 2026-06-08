import { request } from './client';

export interface Notificacao {
  id: number;
  luc: string; // from apolice_luc
  type: string; // from tipo
  lida: boolean;
  loja?: string;
  cobertura?: string;
  dias: number;
}

export async function getNotificacoes(): Promise<Notificacao[]> {
  return request<Notificacao[]>('/notificacoes');
}

export async function marcarTodasLidas(): Promise<{ message: string }> {
  return request<{ message: string }>('/notificacoes/marcar-lidas', { method: 'PATCH' });
}

export async function arquivarLidas(): Promise<{ message: string }> {
  return request<{ message: string }>('/notificacoes/arquivadas', { method: 'DELETE' });
}

export async function arquivarUnica(id: number | string): Promise<{ message: string }> {
  return request<{ message: string }>(`/notificacoes/${id}`, { method: 'DELETE' });
}
