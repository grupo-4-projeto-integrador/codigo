import type { ApoliceFormData, ApoliceRecord, ApoliceDTO } from '../types/apolice';
import { request } from './client';

export type ApoliceListResponse = ApoliceRecord[];

export type ApolicePayload = ApoliceFormData;

function mapToRecord(dto: any): ApoliceRecord {
  return {
    id: dto.id || dto.luc || "",
    luc: dto.id || dto.luc || "",
    fantasia: dto.lojista || dto.fantasia || "",
    segmento: dto.tipo || dto.segmento || "",
    seguradora: dto.seguradora || "",
    vigencia: dto.vigencia || "",
    vencimento: dto.vencimento || "",
    dias_restantes: dto.dias_restantes,
    status: dto.status_da_apolice || dto.status || "",
    lojista: dto.lojista || dto.fantasia || "",
    tipo: dto.tipo || dto.segmento || "",
  };
}

export async function listApolices(): Promise<ApoliceListResponse> {
  const data = await request<ApoliceDTO[]>('/apolices');
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
