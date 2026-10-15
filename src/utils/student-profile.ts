import type { PortfolioResponse } from '@/types/portfolio';

export function hasStudentPortfolioContent(data: PortfolioResponse): boolean {
  const content = data.portfolio;
  if ([data.profile.bio, content.headline, content.careerObjective, content.location, content.availability, content.contactEmail, content.cvUrl, content.gpa].some(value => value?.trim())) return true;
  if (content.yearsOfExperience != null) return true;
  return [content.skills, content.projects, content.education, content.experience, content.certificates, content.articles, content.socialLinks, content.activities, content.languages].some(items => !!items?.length);
}

export function shouldShowPortfolio(data: PortfolioResponse): boolean {
  return data.portfolio.appearance.profile.showPortfolio !== false && hasStudentPortfolioContent(data);
}
