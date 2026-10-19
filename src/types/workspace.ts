export enum VerifiedProjectTaskStatus {
  ToDo = 0,
  Overdue = 4,
}

export type ProjectTaskAssignment = {
  assignmentId: string;
  userId: string;
  fullName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  assignedAt: string;
};

export type ProjectTask = {
  id: string;
  projectId: string;
  title: string | null;
  description: string | null;
  status: number;
  deadline: string;
  creatorId: string;
  creatorFullName: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUsers: ProjectTaskAssignment[] | null;
};

export type ProjectTaskListResponse = {
  projectId: string;
  totalTasks: number;
  tasks: ProjectTask[] | null;
};

export type ProjectTaskMutation = {
  title: string;
  description: string;
  deadline: string;
  status: number;
  assignedUserIds: string[];
};

export type WorkspaceProjectMember = {
  userId: string;
  fullName: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: string;
};
