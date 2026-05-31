import type { ApoliceFormData, ApoliceRecord, ApoliceDTO } from '../types/apolice';
import { request } from './client';
import { normalizeSegmentName } from '../app/utils/segment';

export type ApoliceListResponse = ApoliceRecord[];

export type ApolicePayload = ApoliceFormData;

function mapToRecord(dto: any): ApoliceRecord {
  const segmento = normalizeSegmentName(dto.tipo || dto.segmento || "");
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
  };
}

export async function listApolices(): Promise<ApoliceListResponse> {
  const data = await request<ApoliceDTO[]>('/apolices');
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
