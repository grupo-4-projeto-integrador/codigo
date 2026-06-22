import { request } from "./client";

export interface ExtractedPolicyData {
  luc: string;
  lojista: string;
  segmento: string;
  seguradora: string;
  vigencia: string;
  vencimento: string;
  cobertura: number;
}

export async function extractDataFromDocument(file: File): Promise<ExtractedPolicyData> {
  const formData = new FormData();
  formData.append("documento", file);

  // Note: when passing FormData, we usually don't set Content-Type so the browser can set the correct boundary.
  // Our `request` utility might need to handle FormData properly. Let's assume it does, or we use standard fetch here.
  const token = localStorage.getItem("flamboyant_token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  
  const res = await fetch(`${API_BASE_URL}/apolices/extract-ai`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || "Erro ao extrair dados do documento");
  }

  return data.data as ExtractedPolicyData;
}
