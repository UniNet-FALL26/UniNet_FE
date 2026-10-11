import { apiRequest } from "@/services/api";
import { API_URL } from "@/constants/config";
import type {
  CreateProjectRequest,
  InvitationPayload,
  JoinRequestPayload,
  Project,
  ProjectInvitation,
  ProjectJoinRequest,
  ProjectRecommendation,
  ProjectListParams,
  ProjectListResponse,
  ProjectDetail,
} from "@/types/project";

const mockProjects: Project[] = [
  {
    id: "project-1",
    title: "Hệ thống hỗ trợ nghiên cứu sinh viên",
    projectField: "Edtech",
    description:
      "Dự án nhằm xây dựng giải pháp hỗ trợ sinh viên kết nối mentor, lên kế hoạch nghiên cứu và theo dõi tiến độ.",
    technologies: ["React Native", "TypeScript", "Node.js", "PostgreSQL"],
    memberTarget: 5,
    currentMemberCount: 2,
    creator: { id: "student-creator", displayName: "Nguyễn Hữu Tân" },
    roles: [
      {
        id: "role-1",
        role: "Frontend",
        quantity: 1,
        requirements: "Có kinh nghiệm React Native hoặc React web.",
      },
      {
        id: "role-2",
        role: "Backend",
        quantity: 1,
        requirements: "Có hiểu biết API, cơ sở dữ liệu và dịch vụ cloud.",
      },
      {
        id: "role-3",
        role: "UI/UX",
        quantity: 1,
        requirements: "Thiết kế trải nghiệm dễ dùng cho người học.",
      },
    ],
    recruitmentDeadline: "2026-10-15",

    expectedOutput: "MVP hỗ trợ tìm mentor và quản lý tiến độ.",
    status: "Public",
    recruitmentStatus: "Open",
    createdAt: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "project-2",
    title: "Ứng dụng học tập cộng đồng",
    projectField: "Ecommerce",
    description:
      "Dự án này tập trung vào một ứng dụng hỗ trợ học tập cộng đồng với nhóm hội thảo và tài liệu.",
    technologies: ["Expo", "Firebase", "TypeScript", "AI"],
    memberTarget: 4,
    currentMemberCount: 3,
    creator: { id: "student-creator-2", displayName: "Phạm Thị Lan" },
    roles: [
      {
        id: "role-4",
        role: "Frontend",
        quantity: 1,
        requirements: "Hiểu Expo và giao diện mobile.",
      },
      {
        id: "role-5",
        role: "Backend",
        quantity: 1,
        requirements: "Có kinh nghiệm API và Firebase.",
      },
    ],
    recruitmentDeadline: "2026-09-30",
    expectedOutput: "Phiên bản beta ứng dụng học tập cộng đồng.",
    status: "Public",
    recruitmentStatus: "Open",
    createdAt: "2026-09-10T08:00:00.000Z",
  },
];

export const projectService = {
  async listProjects(params: ProjectListParams = {}, signal?: AbortSignal): Promise<ProjectListResponse> {
    const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 10) });
    if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
    if (params.field?.trim()) query.set("field", params.field.trim());
    for (const skill of params.skillnames ?? []) {
      if (skill.trim()) query.append("skillnames", skill.trim());
    }
    if (params.recruitmentStatus !== undefined) query.set("recruitmentStatus", String(params.recruitmentStatus));
    const path = API_URL.endsWith("/api") ? "/projects" : "/api/projects";
    const response = await apiRequest<ProjectListResponse>(`${path}?${query}`, { method: "GET", signal });
    if (!response || !Array.isArray(response.projects) || !Number.isInteger(response.page) || !Number.isInteger(response.pageSize) || !Number.isInteger(response.totalItems) || !Number.isInteger(response.totalPages)) {
      throw new Error("Phản hồi danh sách dự án không hợp lệ.");
    }
    return response;
  },

  async listMyProjects(params: Pick<ProjectListParams, "page" | "pageSize"> = {}, signal?: AbortSignal): Promise<ProjectListResponse> {
    const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 10) });
    const path = API_URL.endsWith("/api") ? "/projects/me" : "/api/projects/me";
    const response = await apiRequest<ProjectListResponse>(`${path}?${query}`, { method: "GET", signal });
    if (!response || !Array.isArray(response.projects) || !Number.isInteger(response.page) || !Number.isInteger(response.pageSize) || !Number.isInteger(response.totalItems) || !Number.isInteger(response.totalPages)) {
      throw new Error("Phản hồi danh sách dự án của tôi không hợp lệ.");
    }
    return response;
  },

  async getProjectById(projectId: string, signal?: AbortSignal): Promise<ProjectDetail> {
    if (!projectId.trim()) throw new Error("Không tìm thấy mã dự án.");
    const path = API_URL.endsWith("/api") ? "/projects" : "/api/projects";
    const response = await apiRequest<ProjectDetail>(`${path}/${encodeURIComponent(projectId)}`, { method: "GET", signal });
    if (!response || response.id !== projectId || !response.creator || !Array.isArray(response.roleRequirements) || !Array.isArray(response.skills) || !Array.isArray(response.members) || typeof response.isCreator !== "boolean" || typeof response.isMember !== "boolean") {
      throw new Error("Phản hồi chi tiết dự án không hợp lệ.");
    }
    return response;
  },

  async createProject(payload: CreateProjectRequest): Promise<Project> {
    try {
      return await apiRequest<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      const created: Project = {
        id: `project-${Date.now()}`,
        title: payload.title,
        projectField: payload.projectField,
        description: payload.description,
        technologies: payload.technologies,
        memberTarget: payload.memberTarget,
        currentMemberCount: 1,
        creator: { id: "current-user", displayName: "Bạn" },
        roles: payload.roles.map((role, index) => ({
          id: `role-${Date.now()}-${index}`,
          role: role.role,
          quantity: role.quantity,
          requirements: role.requirements,
        })),
        recruitmentDeadline: payload.recruitmentDeadline,
        expectedOutput: payload.expectedOutput,
        status: payload.status ?? "Public",
        recruitmentStatus: payload.recruitmentStatus ?? "Open",
        createdAt: new Date().toISOString(),
      };
      mockProjects.unshift(created);
      return created;
    }
  },

  async submitJoinRequest(
    payload: JoinRequestPayload,
  ): Promise<ProjectJoinRequest> {
    try {
      return await apiRequest<ProjectJoinRequest>(
        `/api/projects/${payload.projectId}/join-requests`,
        {
          method: "POST",
          body: JSON.stringify({
            role: payload.role,
            message: payload.message,
          }),
        },
      );
    } catch {
      return {
        id: `join-${Date.now()}`,
        projectId: payload.projectId,
        userId: "current-user",
        role: payload.role,
        message: payload.message,
        status: "Pending",
        createdAt: new Date().toISOString(),
      };
    }
  },

  async sendInvitation(payload: InvitationPayload): Promise<ProjectInvitation> {
    try {
      return await apiRequest<ProjectInvitation>(
        `/api/projects/${payload.projectId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            inviteeId: payload.inviteeId,
            role: payload.role,
            message: payload.message,
          }),
        },
      );
    } catch {
      return {
        id: `invite-${Date.now()}`,
        projectId: payload.projectId,
        inviteeId: payload.inviteeId,
        inviterId: "current-user",
        role: payload.role,
        message: payload.message,
        status: "Sent",
        createdAt: new Date().toISOString(),
      };
    }
  },

  async fetchRecommendations(projectId: string, signal?: AbortSignal): Promise<ProjectRecommendation[]> {
    if (!projectId.trim()) throw new Error("Không tìm thấy mã dự án.");
    const path = API_URL.endsWith("/api") ? "/projects" : "/api/projects";
    const response = await apiRequest<ProjectRecommendation[]>(`${path}/${encodeURIComponent(projectId)}/recommended-members`, { method: "GET", signal });
    if (!Array.isArray(response) || response.some((member) =>
      !member || typeof member.userId !== "string" || typeof member.fullName !== "string" ||
      !Array.isArray(member.matchedSkills) || !Array.isArray(member.missingSkills) ||
      ![member.matchScore, member.skillMatch, member.diversityScore, member.collaborationCount, member.finalScore].every((score) => typeof score === "number" && Number.isFinite(score))
    )) throw new Error("Phản hồi gợi ý thành viên không hợp lệ.");
    return response;
  },
};
