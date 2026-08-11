export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface TaskRemark {
  id: string;
  taskId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface FocusSession {
  isActive: boolean;
  startTime: string | null;
  elapsedSeconds: number;
  notes: string;
  checklists: { id: string; text: string; completed: boolean }[];
  lastAutoSaveAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  
  assignedTo: string;
  assignedToName?: string;
  assignedBy: string;
  assignedByName: string;
  
  attachments: TaskAttachment[];
  focusSession: FocusSession;
  
  isTeamTask: boolean;
  parentTaskId?: string | null;
  teamHeads?: string[];
  
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  
  isRecheck?: boolean;
  blocked?: boolean;
}
