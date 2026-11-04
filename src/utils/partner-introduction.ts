import type { CompanyProfile, CompanyProfileInput } from '@/services/company.service';
import { emptyPartnerIntroduction } from '@/types/partner-introduction';

export type PartnerIntroductionSection = 'about' | 'business' | 'gallery';
export type PartnerIntroductionDraft = { description: string; imageUrl: string; address: string; industry: string; foundedOn: string; employeeRange: string; branches: string; galleryUrls: string[] };

export function introductionDraft(profile: CompanyProfile): PartnerIntroductionDraft {
  const intro = profile.introduction ?? emptyPartnerIntroduction();
  return { description: profile.description ?? '', imageUrl: intro.imageUrl ?? '', address: profile.address ?? '', industry: profile.industry ?? '', foundedOn: intro.foundedOn ?? '', employeeRange: intro.employeeRange ?? '', branches: intro.branches.join('\n'), galleryUrls: [...intro.galleryUrls] };
}

export function introductionInput(latest: CompanyProfile, section: PartnerIntroductionSection, draft: PartnerIntroductionDraft): CompanyProfileInput {
  const introduction = { ...(latest.introduction ?? emptyPartnerIntroduction()) };
  const result: CompanyProfileInput = { ...latest, introduction };
  const imageUrl = (value: string) => {
    const text = value.trim();
    if (!text) return null;
    try {
      const url = new URL(text);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password || text.length > 2048) throw new Error();
    } catch { throw new Error('Ảnh phải là URL http/https hợp lệ, tối đa 2.048 ký tự.'); }
    return text;
  };
  if (section === 'about') {
    if (draft.description.length > 10000) throw new Error('Giới thiệu tối đa 10.000 ký tự.');
    result.description = draft.description.trim() || null;
    introduction.imageUrl = imageUrl(draft.imageUrl);
  } else if (section === 'business') {
    const date = draft.foundedOn.trim();
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10))) throw new Error('Nhập ngày thành lập hợp lệ theo dạng YYYY-MM-DD, không ở tương lai.');
    const branches = [...new Set(draft.branches.split('\n').map(value => value.trim()).filter(Boolean))];
    if (draft.address.length > 2000 || draft.industry.length > 150 || draft.employeeRange.length > 100 || branches.length > 20 || branches.some(value => value.length > 255)) throw new Error('Thông tin quá dài. Tối đa 20 chi nhánh, mỗi chi nhánh 255 ký tự.');
    result.address = draft.address.trim() || null; result.industry = draft.industry.trim() || null;
    introduction.foundedOn = date || null; introduction.employeeRange = draft.employeeRange.trim() || null; introduction.branches = branches;
  } else {
    if (draft.galleryUrls.length > 20) throw new Error('Tối đa 20 ảnh công ty.');
    introduction.galleryUrls = [...new Set(draft.galleryUrls.map(value => imageUrl(value)).filter((value): value is string => !!value))];
  }
  return result;
}
