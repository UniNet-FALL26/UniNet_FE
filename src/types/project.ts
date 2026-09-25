export type ProjectStatus =
  | "RIÊNG TƯ"
  | "CÔNG KHAI"
  | "ĐANG HOẠT ĐỘNG"
  | "HOÀN THÀNH"
  | "LƯU TRỮ";
export type RecruitmentStatus =
  | "ĐANG TUYỂN"
  | "ĐÃ ĐỦ THÀNH VIÊN"
  | "ĐÃ ĐÓNG"
  | "HẾT HẠN";
export type ProjectJoinRequestStatus =
  | "ĐANG CHỜ"
  | "ĐÃ CHẤP NHẬN"
  | "ĐÃ TỪ CHỐI"
  | "HỦY";
export type ProjectInvitationStatus =
  | "ĐÃ GỬI"
  | "ĐÃ CHẤP NHẬN"
  | "ĐÃ TỪ CHỐI"
  | "ĐÃ HẾT HẠN";

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
  estimatedDuration?: string;
  expectedOutput?: string;
  commitmentLevel?: string;
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
