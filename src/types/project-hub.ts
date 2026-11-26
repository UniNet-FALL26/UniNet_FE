import type { ProjectSpecialization } from './project';

export type HubFile = { url: string; name: string; type: 'image' | 'video' | 'document';
  sizeBytes?: number | null; uploadedAt?: string | null; uploadedBy?: HubPerson | null };
export type HubLink = { label: string; url: string };
export type HubPerson = { id: string; fullName: string; avatarUrl: string | null };
export type HubPosition = {
  id: string; name: string; quantity: number; technologies: string[]; skills: string[];
  jobDescription: string; requirements: string[]; benefits: string[];
};
export type HubDetails = {
  description: string | null; features: string[];
  results: { problem?: string; solution?: string; objectives?: string[]; achievements?: string[];
    expectedProduct?: string; expectedValue?: string; expectedGrowth?: string };
  documents: HubFile[]; media: HubFile[]; links: HubLink[];
  startDate: string | null; completedAt: string | null;
  actualEndDate?: string | null; startDateIsCreationDate?: boolean;
};
export type HubMember = {
  id: string; userId: string; fullName: string; avatarUrl: string | null; role: string;
  positionId: string | null; status: number; joinedAt: string;
};
export type HubRecruitment = { id: string; description: string | null; positions: HubPosition[];
  deadline: string | null; status: 0 | 1 | 2; publishedAt: string | null };
export type HubProject = {
  id: string; title: string; logoUrl: string | null; description: string; technologies: string[];
  status: number; visibility: 0 | 1;
  isOwner: boolean; isMember: boolean; creator: HubPerson; details: HubDetails;
  recruitment: HubRecruitment | null; members: HubMember[];
  myReview: { challenges: string | null; lessonsLearned: string | null } | null;
  specialization?: ProjectSpecialization | null;
  chatRoomId: string | null; createdAt: string; updatedAt: string;
};
export type HubPage = { items: HubProject[]; total: number; page: number; pageSize: number };
export type HubProjectInput = {
  title: string; description: string; logoUrl?: string | null; technologies?: string[];
  status?: number; visibility?: 0 | 1; submitterRole?: string;
  details?: HubDetails;
  timeline?: { startDate: string | null; actualEndDate: string | null };
};
export type HubRequest = {
  id: string; projectId: string; projectTitle: string; userId: string; fullName: string;
  avatarUrl: string | null; requestType: 0 | 1; inviterId: string | null;
  positionId: string | null; role: string; message: string | null;
  status: number; createdAt: string; reviewedAt: string | null;
};
