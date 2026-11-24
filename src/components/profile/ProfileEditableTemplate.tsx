import type { PortfolioResponse, ProfileTheme } from '@/types/portfolio';
import type { ProfileEditorSection } from '@/utils/profile-editor';
import type { ProfileEditField, ProfileImageTarget } from '@/utils/profile-fields';
import { ProfileTemplateRenderer } from './ProfileTemplateRenderer';
import { ProfileEditContext } from './ProfileEditContext';

type Props = { templateId: string; data: PortfolioResponse; theme: ProfileTheme; width: number; disabled: boolean; onAdd: (section: ProfileEditorSection) => void; onField: (field: ProfileEditField) => void; onPhoto: (target: ProfileImageTarget) => void; onEditEducation: (index: number) => void; onEditCertificate: (index: number) => void; onRemoveSocialLink: (index: number) => void };
export function ProfileEditableTemplate({ disabled, onAdd, onField, onPhoto, onEditEducation, onEditCertificate, onRemoveSocialLink, ...props }: Props) {
  return <ProfileEditContext.Provider value={{ data: props.data, disabled, onAdd, onField, onPhoto, onEditEducation, onEditCertificate, onRemoveSocialLink }}><ProfileTemplateRenderer {...props} /></ProfileEditContext.Provider>;
}
