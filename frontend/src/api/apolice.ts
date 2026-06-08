import type { ApoliceFormData, ApoliceRecord, ApoliceDTO } from '../types/apolice';
import { request } from './client';
import { normalizarSegmento } from '../app/utils/segment';

export type ApoliceListResponse = ApoliceRecord[];

export type ApolicePayload = ApoliceFormData;

function mapToRecord(dto: any): ApoliceRecord {
  const segmento = normalizarSegmento(dto.tipo || dto.segmento || "");
  return {
    id: dto.id || dto.luc || "",
    luc: dto.id || dto.luc || "",
    fantasia: dto.lojista || dto.fantasia || "",
    segmento,
    seguradora: dto.seguradora || "",
    vigencia: dto.vigencia || "",
    vencimento: dto.vencimento || "",
    dias_restantes: dto.dias_restantes,
    status: dto.status_da_apolice || dto.status || "",
    lojista: dto.lojista || dto.fantasia || "",
    tipo: segmento,
    cobertura: dto.cobertura,
    responsavel: dto.responsavel || "",
    observacoes: dto.observacoes || "",
    cnpj: dto.cnpj || "",
    numero_apolice: dto.numero_apolice || "",
    documentos: dto.documentos || [],
  };
}

export async function listApolices(): Promise<ApoliceListResponse> {
  const data = await request<ApoliceDTO[]>('/apolices');
  return data.map(mapToRecord);
}

export async function searchApolices(query: string): Promise<ApoliceListResponse> {
  const data = await request<ApoliceDTO[]>(`/apolices/search?q=${encodeURIComponent(query)}`);
  return data.map(mapToRecord);
}

export async function getFilaDeAcao(): Promise<ApoliceListResponse> {
  const data = await request<ApoliceDTO[]>('/fila-de-acao');
  return data.map(mapToRecord);
}

export async function createApolice(payload: ApolicePayload): Promise<ApoliceRecord> {
  const data = await request<ApoliceDTO>('/apolices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapToRecord(data);
}

export async function updateApolice(luc: string, payload: ApolicePayload): Promise<ApoliceRecord> {
  const data = await request<ApoliceDTO>(`/apolices/${encodeURIComponent(luc)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapToRecord(data);
}

export async function deleteApolice(luc: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/apolices/${encodeURIComponent(luc)}`, {
    method: 'DELETE',
  });
}

export async function getApolice(luc: string): Promise<ApoliceRecord> {
  const data = await request<ApoliceDTO>(`/apolices/${encodeURIComponent(luc)}`);
  return mapToRecord(data);
}

export async function getCoberturas(luc: string): Promise<any[]> {
  return request<any[]>(`/apolices/${encodeURIComponent(luc)}/coberturas`);
}

export async function getHistorico(luc: string): Promise<any[]> {
  return request<any[]>(`/apolices/${encodeURIComponent(luc)}/historico`);
}

export async function updateObservacoes(luc: string, observacoes: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/apolices/${encodeURIComponent(luc)}/observacoes`, {
    method: 'PATCH',
    body: JSON.stringify({ observacoes }),
  });
}

export async function getLojas(): Promise<any[]> {
  return request<any[]>('/lojas');
}

export async function renovarApolice(luc: string, payload: { nova_vigencia: string, novo_valor: number }): Promise<{ message: string }> {
  return request<{ message: string }>(`/apolices/${encodeURIComponent(luc)}/renovar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAtividadesRecentes(limit: number = 10): Promise<any[]> {
  return request<any[]>(`/atividades?limit=${limit}`);
}


export async function getDocumentos(luc: string): Promise<any[]> {
  return request<any[]>(`/apolices/${encodeURIComponent(luc)}/documentos`);
}

export async function getHealthScore(): Promise<{ score: number, delta: number }> {
  return request<{ score: number, delta: number }>('/kpis/health-score');
}
