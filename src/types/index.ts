export type Role     = "student" | "staff" | "officer" | "admin";
export type Status   = "pending" | "assigned" | "in_progress" | "resolved" | "closed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Category = "electricity" | "plumbing" | "furniture" | "internet" | "hvac" | "other";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  joinedAt: string;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  performedByName: string;
  details: string;
  timestamp: string;
  attachments?: string[];
}

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userRole: Role;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export interface Request {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  location: string;
  submittedBy: string;
  submittedByName: string;
  submittedByEmail?: string;
  submittedByRole?: Role;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  hasAttachment: boolean;
  attachments?: string[];
  audit: AuditEntry[];
  comments?: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  requestId?: string;
}