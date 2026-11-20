import type { PortfolioMilestone } from '@/types/portfolio';

const displayDate = (value?: string | null) => {
  const date = value?.trim() ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date;
};

export function formatProfileMilestonePeriod(item: PortfolioMilestone): string {
  const start = displayDate(item.startDate), end = displayDate(item.endDate);
  if (start) return `${start} – ${end || 'Hiện tại'}`;
  return end || item.period?.trim() || '';
}
