export type ApoliceFormData = {
  luc: string;
  fantasia: string;
  segmento: string;
  seguradora: string;
  vigencia: string;
  vencimento: string;
}

export type ApoliceRecord = ApoliceFormData & {
  id: string;
  lojista: string;
  tipo: string;
  status: string;
  cobertura?: string;
  premio?: string;
  observacoes?: string;
}
