import { request } from './client';

export interface AuditLog {
  id: number;
  user_id: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  payload_anterior: string | null;
  payload_novo: string | null;
  ip: string;
  user_agent: string;
  timestamp: string;
}

export interface AuditListResponse {
  data: AuditLog[];
  total: number;
  limit: number;
  page: number;
}

export interface AuditFilter {
  acao?: string;
  entidade?: string;
  entidade_id?: string;
  user_id?: string;
  de?: string;
  ate?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(filter: AuditFilter = {}): Promise<AuditListResponse> {
  const params = new URLSearchParams();
  if (filter.acao) params.set('acao', filter.acao);
  if (filter.entidade) params.set('entidade', filter.entidade);
  if (filter.entidade_id) params.set('entidade_id', filter.entidade_id);
  if (filter.user_id) params.set('user_id', filter.user_id);
  if (filter.de) params.set('de', filter.de);
  if (filter.ate) params.set('ate', filter.ate);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.limit) params.set('limit', String(filter.limit));

  const qs = params.toString();
  return request<AuditListResponse>(`/admin/audit${qs ? '?' + qs : ''}`);
}

export async function logAuditAction(payload: {
  acao: string;
  entidade: string;
  entidade_id?: string;
  detalhe?: string;
}): Promise<void> {
  await request('/admin/audit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
