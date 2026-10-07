import sample from '@/data/profile-sample.json';
import type { PortfolioResponse } from '@/types/portfolio';

const sampleData: PortfolioResponse = sample;
export function resolveProfilePreview() {
  const example: PortfolioResponse = JSON.parse(JSON.stringify(sampleData));
  return { data: example, sampleSections: ['identity', 'introduction', 'projects', 'skills', 'experience', 'education', 'certificates', 'articles', 'activities', 'languages', 'socialLinks'] };
}
