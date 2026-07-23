import { initials, formatDate, formatDateTime, generateId, exportCSV, getGreeting } from "../lib/utils";

import type { Status, Priority, Category, Request } from "../types";

import type { Request } from "../types";

export function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function generateId(existingRequests: Request[]): string {
  const max = existingRequests.reduce((highest, r) => {
    const match = r.id.match(/MR-\d{4}-(\d+)/);
    if (!match) return highest;
    return Math.max(highest, parseInt(match[1]));
  }, 0);
  return `MR-2026-${String(max + 1).padStart(3, "0")}`;
}

export function exportCSV(requests: Request[]) {
  const headers = ["ID", "Title", "Category", "Priority", "Status", "Location", "Submitted By", "Assigned To", "Created", "Updated"];
  const rows = requests.map(r => [
    r.id,
    (r.title || "").replace(/"/g, '""'),
    r.category,
    r.priority,
    r.status,
    (r.location || "").replace(/"/g, '""'),
    (r.submittedByName || "").replace(/"/g, '""'),
    (r.assignedToName || "Unassigned").replace(/"/g, '""'),
    formatDate(r.createdAt),
    formatDate(r.updatedAt),
  ]);
  const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "maintenance_requests.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
