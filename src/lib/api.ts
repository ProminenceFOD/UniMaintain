import { apiLogin, apiRegister, apiGetMe, apiGetRequests, apiGetRequest, apiCreateRequest, apiUpdateStatus, apiAssignOfficer, apiGetStats, apiGetUsers, apiGetOfficers, apiToggleUser, apiGetNotifications, apiMarkRead, apiMarkAllRead, saveToken, clearToken } from "../lib/api";

import { USERS } from "../data/mockData";
import type { Request } from "../types";

// ─── API CLIENT ───────────────────────────────────────────────────────────────
// All communication with the Node.js + Express backend.
// Base URL reads from Vite env var; falls back to localhost:5000.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  return localStorage.getItem("unimaintain_token");
}

export function saveToken(token: string): void {
  localStorage.setItem("unimaintain_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("unimaintain_token");
}

// Core fetch wrapper — attaches JWT, handles errors uniformly
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const headers: HeadersInit = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: "student" | "officer" | "admin";
  department: string;
  active: boolean;
  created_at: string;
}

export interface ApiAuditEntry {
  id: number;
  action: string;
  performedByName: string;
  details: string;
  timestamp: string;
}

export interface ApiRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryName: string;
  priority: string;
  status: string;
  location: string;
  hasAttachment: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  submittedBy: number;
  submittedByName: string;
  assignedTo?: number;
  assignedToName?: string;
  audit?: ApiAuditEntry[];
}

export interface ApiNotification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  request_id?: string;
  created_at: string;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; user: ApiUser }>("POST", "/auth/login", { email, password });
}

export async function apiRegister(data: {
  name: string; email: string; password: string; role: string; department: string;
}) {
  return request<{ token: string; user: ApiUser }>("POST", "/auth/register", data);
}

export async function apiGetMe() {
  return request<{ user: ApiUser }>("GET", "/auth/me");
}

// ─── REQUESTS ─────────────────────────────────────────────────────────────────

export async function apiGetRequests(params?: {
  status?: string; category?: string; priority?: string;
  search?: string; page?: number; limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status)   q.set("status",   params.status);
  if (params?.category) q.set("category", params.category);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.search)   q.set("search",   params.search);
  if (params?.page)     q.set("page",     String(params.page));
  if (params?.limit)    q.set("limit",    String(params.limit));
  return request<{ requests: ApiRequest[]; total: number; page: number; pages: number }>(
    "GET", `/requests?${q}`
  );
}

export async function apiGetRequest(id: string) {
  return request<{ request: ApiRequest }>("GET", `/requests/${id}`);
}

export async function apiCreateRequest(data: {
  title: string; description: string; category: string;
  priority: string; location: string; files?: File[];
}) {
  const form = new FormData();
  form.append("title",       data.title);
  form.append("description", data.description);
  form.append("category",    data.category);
  form.append("priority",    data.priority);
  form.append("location",    data.location);
  data.files?.forEach(f => form.append("attachments", f));

  return request<{ request: ApiRequest }>("POST", "/requests", form, true);
}

export async function apiUpdateStatus(id: string, status: string, note?: string) {
  return request<{ request: ApiRequest }>("PUT", `/requests/${id}/status`, { status, note });
}

export async function apiAssignOfficer(requestId: string, officerId: number) {
  return request<{ request: ApiRequest }>("PUT", `/requests/${requestId}/assign`, { officerId });
}

export async function apiGetStats() {
  return request<{
    total: number;
    byStatus: Array<{ status: string; count: string }>;
    byCategory: Array<{ slug: string; name: string; count: string }>;
    byPriority: Array<{ priority: string; count: string }>;
  }>("GET", "/requests/stats");
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  return request<{ users: ApiUser[] }>("GET", "/users");
}

export async function apiGetOfficers() {
  return request<{ officers: Array<{ id: number; name: string; email: string; department: string }> }>(
    "GET", "/users/officers"
  );
}

export async function apiToggleUser(id: number) {
  return request<{ user: ApiUser }>("PUT", `/users/${id}/toggle`);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function apiGetNotifications() {
  return request<{ notifications: ApiNotification[] }>("GET", "/notifications");
}

export async function apiMarkRead(id: number) {
  return request<{ success: boolean }>("PUT", `/notifications/${id}/read`);
}

export async function apiMarkAllRead() {
  return request<{ success: boolean }>("PUT", "/notifications/read-all");
}
