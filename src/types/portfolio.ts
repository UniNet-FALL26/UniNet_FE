// Mirrors UniNet.Application/DTOs/Auth/PortfolioContracts.cs (web JSON names).
export type PortfolioIdentity = {
  id: string; fullName: string; nickname?: string | null; displayName?: string;
  avatarUrl: string | null; coverUrl: string | null; bio: string | null;
  universityName: string | null; major: string | null; organizationName: string | null; isVerified: boolean;
};
export type PortfolioSkill = { skillId?: string | null; level?: number | null; yearsOfExperience?: number | null; name: string; category: string; iconUrl?: string | null };
export type PortfolioProject = { title: string; description?: string | null; type?: string | null; coverUrl?: string | null; technologies: string[]; url?: string | null; githubUrl?: string | null; featured: boolean };
export type PortfolioMilestone = { title: string; organization?: string | null; period?: string | null; description?: string | null; startDate?: string | null; endDate?: string | null; gpa?: string | null };
export type PortfolioCertificate = { title: string; issuer: string; year?: string | null; logoUrl?: string | null; url?: string | null };
export type PortfolioArticle = { title: string; date?: string | null; coverUrl?: string | null; url: string };
export type PortfolioContent = {
  yearsOfExperience?: number | null; gpa?: string | null;
  headline: string | null; careerObjective: string | null; location: string | null; availability: string | null;
  contactEmail: string | null; cvUrl: string | null; isPublic: boolean;
  appearance: { profile: { template: string; theme: string; font: string; sectionOrder: string[]; hiddenSections: string[] } };
  skills: PortfolioSkill[]; projects: PortfolioProject[]; experience: PortfolioMilestone[]; education: PortfolioMilestone[];
  certificates: PortfolioCertificate[]; articles: PortfolioArticle[]; socialLinks: { label: string; url: string }[];
  activities?: { title: string; organization?: string | null; description?: string | null; date?: string | null }[] | null;
  languages?: { name: string; level: string }[] | null;
};
export type PortfolioResponse = { profile: PortfolioIdentity; portfolio: PortfolioContent; isOwner: boolean; skillCatalog?: { id: string; name: string; iconUrl?: string | null; category: string }[] | null };
export type ProfileTheme = {
  id: string; name: string; swatch: string; accent: string; accentStrong: string; accentSoft: string;
  heroBackground: string; heroText: string; heroMuted: string; heroPanel: string; heroBorder: string;
  page: string; surface: string; text: string; muted: string; border: string; onAccent: string;
};
