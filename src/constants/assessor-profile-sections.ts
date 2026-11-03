export const assessorProfileSections = {
  bio: { title: 'Giới thiệu', color: '#147D92', background: '#EAF7FA', fields: [['bio', 'Giới thiệu bản thân', 4000]] },
  contact: { title: 'Liên hệ', color: '#1769E0', background: '#EAF3FF', fields: [['contactEmail', 'Email liên hệ', 255], ['phone', 'Điện thoại', 30], ['address', 'Địa chỉ', 2000]] },
  work: { title: 'Công việc & chuyên môn', color: '#B66B16', background: '#FFF5E7', fields: [['jobTitle', 'Chức danh nghề nghiệp', 150], ['companyName', 'Công ty đang làm việc', 255], ['yearsOfExperience', 'Số năm kinh nghiệm', 2], ['expertise', 'Các lĩnh vực chuyên môn', 3030]] },
  education: { title: 'Học vấn', color: '#7853B6', background: '#F3EEFC', fields: [['education', 'Trình độ học vấn cao nhất', 255], ['university', 'Trường đại học đã theo học', 255]] },
  links: { title: 'Liên kết', color: '#23845D', background: '#EBF8F1', fields: [['linkedInUrl', 'LinkedIn', 2048], ['gitHubUrl', 'GitHub', 2048], ['portfolioUrl', 'Website / Portfolio', 2048]] },
} as const;
export type AssessorProfileSection = keyof typeof assessorProfileSections;
export type AssessorProfileSectionValues = Record<string, string>;
export function assessorCardSection(section: AssessorProfileSection, summary = false) {
  const config = assessorProfileSections[section];
  if (!summary) return config;
  if (section === 'bio') return { ...config, fields: [
    ...assessorProfileSections.bio.fields,
    ...assessorProfileSections.work.fields.filter(([key]) => key === 'jobTitle' || key === 'companyName'),
    assessorProfileSections.education.fields[1],
    assessorProfileSections.contact.fields[2],
  ] };
  if (section === 'work') return { ...config, title: 'Kỹ năng chuyên môn', fields: [assessorProfileSections.work.fields[3]] };
  if (section === 'contact') return { ...config, fields: config.fields.filter(([key]) => key !== 'address') };
  return config;
}
