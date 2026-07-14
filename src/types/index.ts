export type TaskStatus = "backlog" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface TaskRemark {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName?: string;
  assignedTo: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: any;
  blocked?: boolean;
  remarks?: TaskRemark[];
}

export interface AuditEvent {
  id: string;
  actorId?: string;
  actorName?: string;
  action: string;
  targetCollection?: string;
  targetId?: string;
  details?: string;
  createdAt?: any;
}

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

export interface ActionMeta {
  label: string;
  severity: SeverityLevel;
  icon: any;
}

export interface CapacityData {
  userId: string;
  name: string;
  role: string;
  avatar: string;
  activeTasks: number;
  totalEstimatedHours: number;
  status: "Overbooked" | "Healthy" | "Available";
  utilization: number; // 0-100%
}

export interface TimesheetRow {
  id: string;
  projectId: string;
  clientId: string;
  hours: {
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
  };
  notes?: string;
}

export type PriorityType = "low" | "normal" | "urgent";

export interface InternalMail {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  subject: string;
  body: string;
  priority: PriorityType;
  readStatus: boolean;
  isStarredByReceiver: boolean;
  isStarredBySender: boolean;
  isDeletedBySender: boolean;
  isDeletedByReceiver: boolean;
  attachments?: { name: string; url: string }[];
  createdAt: any;
}

export interface PayrollData {
  userId: string;
  name: string;
  role: string;
  avatar: string;
  baseSalary: number;
  unpaidLeaves: number;
  deductions: number;
  netPay: number;
  status: "Paid" | "Pending";
}

export interface ParsedEmployee {
  fullName: string;
  email: string;
  role: string;
  jobTitle: string;
  phone: string;
  departments: string[];
  subRoles: string[];
  isIntern: boolean;
  internEndDate: string;
  temporaryPassword?: string;
  errors: Record<string, string>;
  status: "pending" | "provisioning" | "success" | "failed";
  errorMessage?: string;
  employeeId?: string;
}

export interface DocRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  docType: string;
  expiryDate: string;
  notes?: string;
  createdAt?: any;
}

export interface StorageFile {
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
  timeCreated: string;
}
