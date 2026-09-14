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

export interface FocusChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface FocusSession {
  startedBy: string;
  startedByName: string;
  startedAt: string;
  resumedAt: string;
  status: "running" | "paused";
  elapsedSeconds: number;
  checklist: FocusChecklistItem[];
  notes: string;
  breakCount: number;
  durationMinutes: number | null;
  lastAutoSaveAt?: string;
  // Backward compatibility
  isActive?: boolean;
  startTime?: string | null;
  checklists?: { id: string; text: string; completed: boolean }[];
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
