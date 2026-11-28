import { useEffect } from 'react';
import { pwaInstall } from '@/store/pwa-install.web';

export function PwaBootstrap() {
  useEffect(() => pwaInstall.start(), []);
  return null;
}
