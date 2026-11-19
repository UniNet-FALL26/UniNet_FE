export const assessorTabs = [
  { key: 'community', label: 'Cộng đồng', href: '/(assessor)/assessor-community', path: '/assessor-community', ios: 'person.2', android: 'groups', web: 'groups' },
  { key: 'messages', label: 'Nhắn tin', href: '/(assessor)/assessor-messages', path: '/assessor-messages', ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' },
  { key: 'assessments', label: 'Danh sách thẩm định', shortLabel: 'Thẩm định', href: '/(assessor)/assessor-assessments', path: '/assessor-assessments', ios: 'checkmark.seal', android: 'fact_check', web: 'fact_check' },
  { key: 'notifications', label: 'Thông báo', href: '/(assessor)/assessor-notifications', path: '/assessor-notifications', ios: 'bell', android: 'notifications_none', web: 'notifications_none' },
  { key: 'profile', label: 'Hồ sơ', href: '/(assessor)/assessor-profile', path: '/assessor-profile', ios: 'person.crop.circle', android: 'person_outline', web: 'person_outline' },
] as const;
export function assessorTabActive(key: string, pathname: string) {
  const tab = assessorTabs.find(t => t.key === key);
  return !!tab && (pathname === tab.path || pathname.startsWith(tab.path + '/') || key === 'assessments' && pathname === '/assessor-availability');
}
