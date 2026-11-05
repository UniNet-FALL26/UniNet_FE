export type PartnerIntroduction = {
  imageUrl: string | null;
  foundedOn: string | null;
  employeeRange: string | null;
  branches: string[];
  galleryUrls: string[];
};

export const emptyPartnerIntroduction = (): PartnerIntroduction => ({ imageUrl: null, foundedOn: null, employeeRange: null, branches: [], galleryUrls: [] });
