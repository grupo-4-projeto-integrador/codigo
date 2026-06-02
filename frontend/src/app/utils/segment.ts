const SEGMENT_NORMALIZATION_MAP: Record<string, string> = {
  'alimentacao': 'Alimentação',
  'vestuario': 'Vestuário',
  'servicos': 'Serviços',
  'eletronicos': 'Eletrônicos',
  'calcados': 'Calçados',
  'acessorios': 'Acessórios',
};

export function normalizarSegmento(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }

  const normalizedKey = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return SEGMENT_NORMALIZATION_MAP[normalizedKey] ?? trimmed;
}