export type ProjectStatus =
  | "Private"
  | "Public"
  | "Active"
  | "Completed"
  | "Archived";
export type RecruitmentStatus = "Open" | "Full" | "Closed" | "Expired";
export type ProjectJoinRequestStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Cancelled";
export type ProjectInvitationStatus =
  | "Sent"
  | "Accepted"
  | "Declined"
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
  technologies: string[];
  memberTarget: number;
  roles: ProjectRoleRequirement[];
  recruitmentDeadline: string;
  estimatedDuration?: string;
  expectedOutput?: string;
  commitmentLevel?: string;
  status?: ProjectStatus;
  recruitmentStatus?: RecruitmentStatus;
};
export type ProjectJoinRequest = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  message?: string;
  status: ProjectJoinRequestStatus;
  createdAt: string;
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  inviteeId: string;
  inviterId: string;
  role: string;
  message?: string;
  status: ProjectInvitationStatus;
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
  id: string;
  fullName: string;
  avatarUrl?: string;
  recommendedRole: string;
  skills: string;
  shortBio: string;
  reason?: string;
};
