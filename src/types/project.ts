export type ProjectStatus =
  | "Private"
  | "Public"
  | "Active"
  | "Completed"
  | "Archived";
export type RecruitmentStatus = "Open" | "Full" | "Closed" | "Cancelled" | "Expired";
export enum ApiProjectStatus {
  Pending = 0,
  Active = 1,
  Completed = 2,
  Rejected = 3,
}
export enum ApiRecruitmentStatus {
  Open = 0,
  Full = 1,
  Closed = 2,
  Cancelled = 3,
  Expired = 4,
}
export enum ProjectVisibility {
  Private = 0,
  Public = 1,
}
export type ProjectSkill = {
  skillId: string;
  skillName: string;
  category: string;
  iconUrl: string | null;
  minLevel: number | null;
};
export type ProjectListItem = {
  id: string;
  title: string;
  projectField: string;
  description: string;
  memberTarget: number;
  currentMemberCount: number;
  recruitmentDeadline: string;
  visibility: ProjectVisibility;
  recruitmentStatus: ApiRecruitmentStatus;
  status?: ApiProjectStatus;
  createdAt: string;
  creator: {
    id: string;
    fullName: string;
    nickname: string | null;
    avatarUrl: string | null;
  };
  skills?: ProjectSkill[];
};
export type ProjectListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  field?: string;
  skillnames?: string[];
  recruitmentStatus?: ApiRecruitmentStatus;
};
export type ProjectDetail = ProjectListItem & {
  status: ApiProjectStatus;
  updatedAt: string | null;
  expectedOutput: string | null;
  roleRequirements: {
    id: string;
    roleName: string;
    quantity: number;
    requirements: string;
  }[];
  skills: NonNullable<ProjectListItem["skills"]>;
  isCreator: boolean;
  isMember: boolean;
  invitations?: ProjectInvitation[];
  joinRequests?: ProjectJoinRequest[];
  members: {
    userId: string;
    fullName: string;
    nickname: string | null;
    avatarUrl: string | null;
    role: string;
    status: number;
    joinedAt: string | null;
  }[];
};
export type ProjectListResponse = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  projects: ProjectListItem[];
};
export type ProjectJoinRequestStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Cancelled";
export type ProjectInvitationStatus =
  | "Sent"
  | "Accepted"
  | "Declined"
  | "Cancelled"
  | "Expired";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  Private: "RIÊNG TƯ",
  Public: "CÔNG KHAI",
  Active: "ĐANG HOẠT ĐỘNG",
  Completed: "HOÀN THÀNH",
  Archived: "LƯU TRỮ",
};

export const RECRUITMENT_STATUS_LABEL: Record<RecruitmentStatus, string> = {
  Open: "ĐANG TUYỂN",
  Full: "ĐÃ ĐỦ THÀNH VIÊN",
  Closed: "ĐÃ ĐÓNG",
  Cancelled: "ĐÃ HỦY",
  Expired: "HẾT HẠN",
};

export const JOIN_REQUEST_STATUS_LABEL: Record<
  ProjectJoinRequestStatus,
  string
> = {
  Pending: "ĐANG CHỜ",
  Accepted: "ĐÃ CHẤP NHẬN",
  Rejected: "ĐÃ TỪ CHỐI",
  Cancelled: "HỦY",
};

export const INVITATION_STATUS_LABEL: Record<ProjectInvitationStatus, string> =
  {
    Sent: "ĐÃ GỬI",
    Accepted: "ĐÃ CHẤP NHẬN",
    Declined: "ĐÃ TỪ CHỐI",
    Cancelled: "ĐÃ HỦY",
    Expired: "ĐÃ HẾT HẠN",
  };

export type ProjectRoleRequirement = {
  id: string;
  role: string;
  quantity: number;
  requirements: string;
};

export type ProjectMember = {
  id: string;
  userId: string;
  fullName: string;
  role: string;
  joinedAt?: string;
};

export type Project = {
  id: string;
  title: string;
  projectField: string;
  description: string;
  technologies: string[];
  memberTarget: number;
  currentMemberCount: number;
  creator: {
    id: string;
    displayName: string;
    email?: string;
  };
  roles: ProjectRoleRequirement[];
  recruitmentDeadline: string;
  expectedOutput?: string;
  status: ProjectStatus;
  recruitmentStatus: RecruitmentStatus;
  createdAt: string;
};

export type CreateProjectRequest = {
  title: string;
  projectField: string;
  description: string;
  memberTarget: number;
  recruitmentDeadline: string;
  expectedOutput: string;
  visibility: ProjectVisibility;
  roleRequirements: { role: string; quantity: number; requirements: string }[];
  skillIds: string[];
};
export type ProjectJoinRequest = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  message?: string;
  status: number;
  projectTitle: string;
  fullName: string;
  avatarUrl: string | null;
  updatedAt: string | null;
  createdAt: string;
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  inviteeId: string;
  inviterId: string;
  role: string;
  message?: string;
  status: number;
  projectTitle: string;
  inviterFullName: string;
  inviterAvatarUrl: string | null;
  inviteeFullName: string;
  inviteeAvatarUrl: string | null;
  updatedAt: string | null;
  createdAt: string;
};

export type JoinRequestPayload = {
  projectId: string;
  role: string;
  message?: string;
};

export type InvitationPayload = {
  projectId: string;
  inviteeId: string;
  role: string;
  message?: string;
};

export type ProjectRecommendation = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  skillMatch: number;
  diversityScore: number;
  collaborationCount: number;
  finalScore: number;
};

export type ProjectMemberResponse = {
  id: string;
  projectId: string;
  projectTitle: string;
  userId: string;
  fullName: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: string;
  status: number;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};
