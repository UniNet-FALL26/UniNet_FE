import { apiRequest } from "@/services/api";
import type {
    CreateProjectRequest,
    InvitationPayload,
    JoinRequestPayload,
    Project,
    ProjectInvitation,
    ProjectJoinRequest,
    ProjectRecommendation,
} from "@/types/project";

const mockProjects: Project[] = [
  {
    id: "project-1",
    title: "Hệ thống hỗ trợ nghiên cứu sinh viên",
    objective:
      "Xây dựng nền tảng giúp sinh viên tìm mentor và quản lý tiến độ nghiên cứu.",
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
    estimatedDuration: "3 tháng",
    expectedOutput: "MVP hỗ trợ tìm mentor và quản lý tiến độ.",
    commitmentLevel: "Tập trung 8 giờ/tuần",
    status: "CÔNG KHAI",
    recruitmentStatus: "ĐANG TUYỂN",
    createdAt: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "project-2",
    title: "Ứng dụng học tập cộng đồng",
    objective:
      "Phát triển cộng đồng học tập nơi sinh viên chia sẻ tài liệu và bài tập.",
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
    estimatedDuration: "2 tháng",
    expectedOutput: "Phiên bản beta ứng dụng học tập cộng đồng.",
    commitmentLevel: "Tập trung 6 giờ/tuần",
    status: "CÔNG KHAI",
    recruitmentStatus: "ĐANG TUYỂN",
    createdAt: "2026-09-10T08:00:00.000Z",
  },
];

const mockRecommendations: ProjectRecommendation[] = [
  {
    id: "student-1",
    fullName: "Lê Minh Khôi",
    recommendedRole: "Frontend",
    skills: "React Native, UI/UX, TypeScript",
    shortBio: "Sinh viên năm 3, từng làm 2 dự án mobile.",
    reason:
      "Phù hợp với mục tiêu xây dựng giao diện và trải nghiệm người dùng.",
  },
  {
    id: "student-2",
    fullName: "Nguyễn Thảo Vy",
    recommendedRole: "Backend",
    skills: "Node.js, PostgreSQL, API",
    shortBio: "Tốt nghiệp thực tập tại startup sản phẩm.",
    reason: "Đã có kinh nghiệm thiết kế API và xử lý dữ liệu.",
  },
  {
    id: "student-3",
    fullName: "Trần Quang An",
    recommendedRole: "UI/UX",
    skills: "Figma, wireframe, prototyping",
    shortBio: "Tích cực trong thiết kế trải nghiệm người dùng.",
    reason:
      "Phù hợp với nhu cầu tối ưu trải nghiệm và trải nghiệm cuộc sống người dùng.",
  },
];

export const projectService = {
  async listProjects(): Promise<Project[]> {
    try {
      return await apiRequest<Project[]>("/api/projects");
    } catch {
      return mockProjects;
    }
  },

  async getProjectById(projectId: string): Promise<Project> {
    try {
      return await apiRequest<Project>(`/api/projects/${projectId}`);
    } catch {
      return (
        mockProjects.find((project) => project.id === projectId) ??
        mockProjects[0]
      );
    }
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
        objective: payload.objective,
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
        estimatedDuration: payload.estimatedDuration,
        expectedOutput: payload.expectedOutput,
        commitmentLevel: payload.commitmentLevel,
        status: payload.status ?? "CÔNG KHAI",
        recruitmentStatus: payload.recruitmentStatus ?? "ĐANG TUYỂN",
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
        status: "ĐANG CHỜ",
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
        status: "ĐÃ GỬI",
        createdAt: new Date().toISOString(),
      };
    }
  },

  async fetchRecommendations(
    projectId: string,
  ): Promise<ProjectRecommendation[]> {
    try {
      return await apiRequest<ProjectRecommendation[]>(
        `/api/projects/${projectId}/recommendations`,
      );
    } catch {
      return mockRecommendations;
    }
  },
};
