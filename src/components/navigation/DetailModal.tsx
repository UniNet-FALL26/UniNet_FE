import type { ReactNode } from 'react';
import { Modal, View, type ModalProps } from 'react-native';
import { AccountShell } from './AccountShell';
import { DetailNavigation } from './DetailNavigation';
import type { NavigationCrumb } from '@/utils/detail-navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function DetailModal({ children, crumbs, onRequestClose, onNavigate, backLabel, ...props }: Omit<ModalProps, 'onRequestClose'> & { children: ReactNode; crumbs: NavigationCrumb[]; onRequestClose: () => void; onNavigate?: () => void; backLabel?: string }) {
  return <Modal {...props} onRequestClose={onRequestClose}><View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={crumbs[crumbs.length - 1]?.label} style={{ flex: 1 }}><SafeAreaProvider><AccountShell force onNavigate={onNavigate || onRequestClose}><DetailNavigation crumbs={crumbs} onBack={onRequestClose} backLabel={backLabel} />{children}</AccountShell></SafeAreaProvider></View></Modal>;
}
