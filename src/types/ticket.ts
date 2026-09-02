export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export type TicketPriority = "Low" | "Normal" | "High" | "Urgent";

export type TicketCategory = 
  | "IT Support"
  | "HR & Workplace"
  | "Finance & Invoicing"
  | "Access & Security"
  | "General Operations";

export interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface TicketComment {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isInternal?: boolean;
}

export interface TicketResolutionDetails {
  resolutionNotes: string;
  resolvedBy: string;
  resolvedByName: string;
  resolvedAt: string;
}

export interface TicketCancellationDetails {
  reason: string;
  cancelledBy: string;
  cancelledByName: string;
  cancelledAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber?: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  
  // Requester details
  createdBy: string;
  creatorName?: string;
  creatorEmail?: string;
  
  // Assigned Agent
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  
  // Governance & Audits
  resolutionDetails?: TicketResolutionDetails | null;
  cancellationDetails?: TicketCancellationDetails | null;
  
  attachments?: TicketAttachment[];
  comments?: TicketComment[];
  
  createdAt: any;
  updatedAt?: string;
}
