export const assessorProfileTabs = [
  { id: 'posts', label: 'Bài viết', icon: { ios: 'doc.text', android: 'article', web: 'article' } },
  { id: 'bio', label: 'Giới thiệu', icon: { ios: 'person.text.rectangle', android: 'contact_page', web: 'contact_page' } },
  { id: 'work', label: 'Công việc & chuyên môn', icon: { ios: 'briefcase', android: 'work_outline', web: 'work_outline' } },
  { id: 'education', label: 'Học vấn', icon: { ios: 'graduationcap', android: 'school', web: 'school' } },
  { id: 'links', label: 'Liên kết', icon: { ios: 'link', android: 'link', web: 'link' } },
] as const;
export type AssessorProfileTab = typeof assessorProfileTabs[number]['id'];
