import type { PortfolioContent, PortfolioMilestone } from '@/types/portfolio';
import { portfolioMetrics, type ProfileEditField } from '@/utils/profile-fields';

export function landscapeMetrics(portfolio: PortfolioContent, editing = false) {
  const metrics: { value: string; label: string; icon: 'project' | 'journey' | 'skill' | 'certificate'; field?: ProfileEditField }[] = [];
  const values = portfolioMetrics(portfolio);
  if (values.projects || editing) metrics.push({ value: String(values.projects), label: 'Dự án đã xây dựng', icon: 'project' });
  if (values.years > 0 || editing) metrics.push({ value: `${values.years}+`, label: 'Năm kinh nghiệm', icon: 'journey', field: 'yearsOfExperience' });
  if (values.technologies || editing) metrics.push({ value: String(values.technologies), label: 'Công nghệ sử dụng', icon: 'skill' });
  if (values.gpa || editing) metrics.push({ value: values.gpa || 'Nhập GPA', label: 'GPA tại trường', icon: 'certificate', field: 'gpa' });
  return metrics;
}
export function landscapeJourney(portfolio: PortfolioContent): (PortfolioMilestone & { kind: 'education' | 'experience' })[] {
  return [...portfolio.education.map(item => ({ ...item, kind: 'education' as const })), ...portfolio.experience.map(item => ({ ...item, kind: 'experience' as const }))]
    .sort((a, b) => (a.startDate ?? a.period ?? '').localeCompare(b.startDate ?? b.period ?? ''));
}
