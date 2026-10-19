import { API_URL } from "@/constants/config";
import { apiRequest } from "@/services/api";
import type {
  ProjectTaskListResponse,
  ProjectTaskMutation,
} from "@/types/workspace";

const AUTOMATIC_OVERDUE_STATUS = 4;

const invalidDeadline = (deadline: string) => {
  const value = new Date(deadline);
  return Number.isNaN(value.getTime()) || value.getTime() <= Date.now();
};

const deadlineError = () =>
  new Error("Hạn hoàn thành phải sau thời điểm hiện tại.");

const projectsPath = () =>
  API_URL.endsWith("/api") ? "/projects" : "/api/projects";

const requiredId = (id: string) => {
  if (!id.trim()) throw new Error("Không tìm thấy mã dự án.");
  return encodeURIComponent(id);
};

function isTaskListResponse(
  response: ProjectTaskListResponse,
  projectId: string,
) {
  return (
    response?.projectId === projectId &&
    Number.isInteger(response.totalTasks) &&
    (response.tasks === null ||
      (Array.isArray(response.tasks) &&
        response.tasks.every(
          (task) =>
            task?.projectId === projectId &&
            typeof task.id === "string" &&
            typeof task.status === "number" &&
            typeof task.deadline === "string" &&
            (task.assignedUsers === null ||
              Array.isArray(task.assignedUsers)),
        )))
  );
}

export const workspaceService = {
  async listTasks(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<ProjectTaskListResponse> {
    const response = await apiRequest<ProjectTaskListResponse>(
      `${projectsPath()}/${requiredId(projectId)}/tasks`,
      { method: "GET", signal },
    );

    if (!isTaskListResponse(response, projectId)) {
      throw new Error("Phản hồi danh sách công việc không hợp lệ.");
    }

    return response;
  },

  createTask(projectId: string, payload: ProjectTaskMutation): Promise<void> {
    if (invalidDeadline(payload.deadline)) {
      return Promise.reject(deadlineError());
    }
    return apiRequest<void>(
      `${projectsPath()}/${requiredId(projectId)}/tasks`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  },

  updateTask(
    projectId: string,
    taskId: string,
    payload: ProjectTaskMutation,
  ): Promise<void> {
    if (payload.status === AUTOMATIC_OVERDUE_STATUS) {
      return Promise.reject(
        new Error("Không thể thay đổi task sau khi đã quá hạn."),
      );
    }
    if (invalidDeadline(payload.deadline)) {
      return Promise.reject(deadlineError());
    }
    return apiRequest<void>(
      `${projectsPath()}/${requiredId(projectId)}/tasks/${requiredId(taskId)}`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
  },

  deleteTask(projectId: string, taskId: string): Promise<void> {
    return apiRequest<void>(
      `${projectsPath()}/${requiredId(projectId)}/tasks/${requiredId(taskId)}`,
      { method: "DELETE" },
    );
  },
};
