import { captureOnboardingLink } from '@/utils/assessor-onboarding';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const link = captureOnboardingLink(path);
  return link ? `/assessor-onboarding/${link.step}` : path;
}
