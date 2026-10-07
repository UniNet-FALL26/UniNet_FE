import { profileMedia } from './profile-media';

// Bundled assets keep technology logos available without a CDN connection.
const logos: Record<string, number> = {
  react: require('@/assets/images/skill-logos/react.svg'),
  nextjs: require('@/assets/images/skill-logos/nextjs.svg'),
  reactnative: require('@/assets/images/skill-logos/react.svg'),
  typescript: require('@/assets/images/skill-logos/typescript.svg'),
  tailwindcss: require('@/assets/images/skill-logos/tailwindcss.svg'),
  zustand: require('@/assets/images/skill-logos/zustand.svg'),
  net: require('@/assets/images/skill-logos/dot-net.svg'),
  aspnetcore: require('@/assets/images/skill-logos/dotnetcore.svg'),
  nodejs: require('@/assets/images/skill-logos/nodejs.svg'),
  postgresql: require('@/assets/images/skill-logos/postgresql.svg'),
  sqlserver: require('@/assets/images/skill-logos/microsoftsqlserver.svg'),
  firebase: require('@/assets/images/skill-logos/firebase.svg'),
  git: require('@/assets/images/skill-logos/git.svg'),
  docker: require('@/assets/images/skill-logos/docker.svg'),
  linux: require('@/assets/images/skill-logos/linux.svg'),
  vscode: require('@/assets/images/skill-logos/vscode.svg'),
  postman: require('@/assets/images/skill-logos/postman.svg'),
  sonarqube: require('@/assets/images/skill-logos/sonarqube.svg'),
  figma: require('@/assets/images/skill-logos/figma.svg'),
  uiux: require('@/assets/images/skill-logos/ui-ux.svg'),
  canva: require('@/assets/images/skill-logos/canva.svg'),
  photoshop: require('@/assets/images/skill-logos/photoshop.svg'),
  illustrator: require('@/assets/images/skill-logos/illustrator.svg'),
  premiere: require('@/assets/images/skill-logos/premierepro.svg'),
  premierepro: require('@/assets/images/skill-logos/premierepro.svg'),
};

export function skillLogo(name: string, iconUrl?: string | null) {
  const custom = profileMedia(iconUrl);
  if (custom !== undefined) return custom;
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return Object.hasOwn(logos, key) ? logos[key] : undefined;
}
