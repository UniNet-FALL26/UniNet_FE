import { DeveloperModernTemplate } from './templates/developer-modern/DeveloperModernTemplate';
import { DeveloperShowcaseTemplate } from './templates/developer-showcase/DeveloperShowcaseTemplate';
import { DeveloperLandscapeTemplate, type DeveloperLandscapeTemplateProps } from './templates/developer-landscape/DeveloperLandscapeTemplate';

export function ProfileTemplateRenderer({ templateId, ...props }: DeveloperLandscapeTemplateProps & { templateId: string }) {
  if (templateId === 'developer-landscape') return <DeveloperLandscapeTemplate {...props} />;
  return templateId === 'developer-showcase' ? <DeveloperShowcaseTemplate {...props} /> : <DeveloperModernTemplate {...props} />;
}
