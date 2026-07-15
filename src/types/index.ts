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
  overtimeHours: number;
  overtimePay: number;
  bonuses: number;
  bonusNotes?: string;
  expensesReimbursed?: number;
  gratuityPay?: number;
  netPay: number;
  status: "Paid" | "Pending";
  bankName?: string;
  iban?: string;
}

export interface PayrollRun {
  id: string;
  month: string;
  year: number;
  totalDisbursement: number;
  records: PayrollData[];
  runBy: string;
  runAt: any;
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

export type JobStatus = "Draft" | "Open" | "Closed";
export type CandidateStatus = "Applied" | "Screening" | "Interviewing" | "Offered" | "Hired" | "Rejected";

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  status: JobStatus;
  description: string;
  createdAt: any;
  createdBy: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone?: string;
  status: CandidateStatus;
  resumeUrl?: string;
  notes?: string;
  appliedAt: any;
}

export type OKRLevel = "Company" | "Department" | "Individual";
export type OKRStatus = "On Track" | "At Risk" | "Off Track" | "Completed";

export interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export interface Objective {
  id: string;
  title: string;
  level: OKRLevel;
  department?: string;
  ownerUid?: string;
  ownerName?: string;
  quarter: string;
  keyResults: KeyResult[];
  status: OKRStatus;
  progress: number;
  createdAt: any;
  createdBy: string;
}

export type AssetCategory = "Laptop" | "Monitor" | "Software License" | "Vehicle" | "Other";
export type AssetStatus = "Available" | "Assigned" | "Under Maintenance" | "Retired";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  serialNumber?: string;
  assignedToUid?: string;
  assignedToName?: string;
  status: AssetStatus;
  purchaseDate: string;
  cost: number;
  depreciationRate?: number; // percentage per year
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  date: string;
  description: string;
  cost: number;
  status: "Completed" | "Pending";
}

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  category: string;
  description: string;
  receiptUrl?: string;
  status: "Pending" | "Approved" | "Rejected" | "Reimbursed";
  submittedAt: any;
  approvedAt?: any;
}
