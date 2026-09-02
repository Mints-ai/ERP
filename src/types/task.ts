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
  projectName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  
  assignedTo: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedByName?: string;
  
  attachments?: TaskAttachment[];
  focusSession?: FocusSession | null;
  
  // Team hierarchy and governance (from testerp)
  isTeamTask?: boolean;
  teamMembers?: string[];
  teamHeads?: string[];
  teamLeaderId?: string;
  monitorManagerIds?: string[];
  parentTaskId?: string | null;
  parentTaskTitle?: string;
  
  // Review & audit feedback
  feedback?: string | null;
  submittedAt?: string;
  timeSpent?: string;
  remarks?: TaskRemark[];
  
  dueDate: string | null;
  createdAt: any;
  updatedAt?: string;
  
  isRecheck?: boolean;
  blocked?: boolean;
}
