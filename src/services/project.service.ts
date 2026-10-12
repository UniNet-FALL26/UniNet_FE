import { apiRequest } from "@/services/api";
import { API_URL } from "@/constants/config";
import type {
  CreateProjectRequest,
  InvitationPayload,
  JoinRequestPayload,
  ProjectMemberResponse,
  ProjectInvitation,
  ProjectJoinRequest,
  ProjectRecommendation,
  ProjectListParams,
  ProjectListResponse,
  ProjectDetail,
  ApiProjectStatus,
} from "@/types/project";

const projectsPath = () => API_URL.endsWith("/api") ? "/projects" : "/api/projects";
const requiredId = (id: string) => {
  if (!id.trim()) throw new Error("Không tìm thấy mã định danh.");
  return encodeURIComponent(id);
};
async function projectMutation<T extends { id: string; status: number }>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await apiRequest<T>(`${projectsPath()}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response || typeof response.id !== "string" || !response.id || typeof response.status !== "number") throw new Error("Phản hồi thao tác dự án không hợp lệ.");
  return response;
}

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

  async listProjectsByStatus(status: ApiProjectStatus, page = 1, pageSize = 10, signal?: AbortSignal): Promise<ProjectListResponse> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const path = API_URL.endsWith("/api") ? "/projects" : "/api/projects";
    const response = await apiRequest<ProjectListResponse>(`${path}/status/${status}?${query}`, { method: "GET", signal });
    if (!response || !Array.isArray(response.projects) || !Number.isInteger(response.page) || !Number.isInteger(response.pageSize) || !Number.isInteger(response.totalItems) || !Number.isInteger(response.totalPages)) {
      throw new Error("Phản hồi danh sách dự án không hợp lệ.");
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

  async createProject(payload: CreateProjectRequest): Promise<ProjectDetail> {
    const path = API_URL.endsWith("/api") ? "/projects" : "/api/projects";
    const response = await apiRequest<ProjectDetail>(path, { method: "POST", body: JSON.stringify(payload) });
    if (!response || typeof response.id !== "string" || !response.id || !response.creator || !Array.isArray(response.roleRequirements) || !Array.isArray(response.skills) || !Array.isArray(response.members)) {
      throw new Error("Phản hồi tạo dự án không hợp lệ.");
    }
    return response;
  },

  submitJoinRequest(payload: JoinRequestPayload): Promise<ProjectJoinRequest> {
    return projectMutation(`/${requiredId(payload.projectId)}/join-requests`, "POST", { role: payload.role, message: payload.message });
  },
  sendInvitation(payload: InvitationPayload): Promise<ProjectInvitation> {
    return projectMutation(`/${requiredId(payload.projectId)}/invitations`, "POST", { inviteeId: payload.inviteeId, role: payload.role, message: payload.message });
  },
  kickMember(projectId: string, userId: string): Promise<ProjectMemberResponse> {
    return projectMutation(`/${requiredId(projectId)}/members/${requiredId(userId)}/kick`, "PATCH");
  },
  leaveProject(projectId: string): Promise<ProjectMemberResponse> {
    return projectMutation(`/${requiredId(projectId)}/leave`, "PATCH");
  },
  cancelInvitation(invitationId: string): Promise<ProjectInvitation> {
    return projectMutation(`/invitations/${requiredId(invitationId)}/cancel`, "PATCH");
  },
  acceptInvitation(invitationId: string): Promise<ProjectInvitation> {
    return projectMutation(`/invitations/${requiredId(invitationId)}/accept`, "PATCH");
  },
  rejectInvitation(invitationId: string): Promise<ProjectInvitation> {
    return projectMutation(`/invitations/${requiredId(invitationId)}/reject`, "PATCH");
  },
  acceptJoinRequest(requestId: string): Promise<ProjectJoinRequest> {
    return projectMutation(`/join-requests/${requiredId(requestId)}/accept`, "PATCH");
  },
  rejectJoinRequest(requestId: string): Promise<ProjectJoinRequest> {
    return projectMutation(`/join-requests/${requiredId(requestId)}/reject`, "PATCH");
  },
  cancelJoinRequest(requestId: string): Promise<ProjectJoinRequest> {
    return projectMutation(`/join-requests/${requiredId(requestId)}/cancel`, "PATCH");
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
