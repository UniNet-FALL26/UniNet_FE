import type { ReactNode } from 'react';
import { useSegments } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import AppTabs from '@/components/app-tabs.shared';
import { AssessorShell } from '@/components/assessor/AssessorShell';
import { CompanyShell } from './CompanyShell';
import { NavigationDismissContext } from './NavigationDismissContext';

export function AccountShell({ children, force = false, onNavigate, routeName }: { children: ReactNode; force?: boolean; onNavigate?: () => void; routeName?: string }) {
  const { account, isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const group = routeName?.split('/')[0] || segments[0];
  if (!isAuthenticated || !account || group === '(auth)' || (!force && ['(tabs)', '(company)', '(assessor)'].includes(group))) return children;
  const content = account.role === 1 ? <CompanyShell>{children}</CompanyShell> : account.role === 2 ? <AssessorShell>{children}</AssessorShell> : account.role === 0 ? <AppTabs>{children}</AppTabs> : children;
  return <NavigationDismissContext.Provider value={onNavigate}>{content}</NavigationDismissContext.Provider>;
}
