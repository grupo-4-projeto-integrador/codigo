export const WEEKS_PAST = 47;
export const WEEKS_FUTURE = 4;
export const TOTAL_WEEKS = WEEKS_PAST + 1 + WEEKS_FUTURE;

export const TIME_OFFSETS = Array.from({ length: TOTAL_WEEKS }).map((_, idx) => {
  // idx = 0 -> oldest (WEEKS_PAST weeks ago)
  // idx = WEEKS_PAST -> Hoje
  // idx = TOTAL_WEEKS - 1 -> newest (WEEKS_FUTURE weeks from now)
  const weeksAgo = WEEKS_PAST - idx;
  const days = weeksAgo * 7;
  
  if (days === 0) return { label: 'Hoje', days: 0 };
  
  const d = new Date();
  d.setDate(d.getDate() - days);
  const day = d.getDate().toString().padStart(2, '0');
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return { label: `${day} ${monthNames[d.getMonth()]}`, days: days };
});

export function parseTooltipDate(value?: string) {
  if (!value) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (isoMatch) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const brMatch = /^\d{2}\/\d{2}\/\d{4}$/.test(value);
  if (brMatch) {
    const [day, month, year] = value.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getStatusAtDate(vencimento: string | undefined, daysBack: number) {
  if (!vencimento) return undefined;
  const venc = parseTooltipDate(vencimento);
  if (!venc) return undefined;
  
  const refDate = new Date();
  refDate.setDate(refDate.getDate() - daysBack);
  const ref = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const due = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
  
  const diff = Math.floor((due.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Vencida';
  if (diff <= 15) return 'A Vencer';
  return 'Ativa';
}
