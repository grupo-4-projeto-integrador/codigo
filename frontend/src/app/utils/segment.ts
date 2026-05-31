const SEGMENT_NORMALIZATION_MAP: Record<string, string> = {
  'alimentacao': 'Alimentação',
  'eletronicos': 'Eletrônicos',
  'acessorios': 'Acessórios',
};

export function normalizeSegmentName(value: string) {
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