import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell, Check, ChevronDown, Filter, LogOut, Menu, MoreVertical,
  Plus, Search, Settings, User as UserIcon, X, Calendar, Clock,
  MessageSquare, FileText, AlertTriangle, AlertCircle, Info,
  MapPin, CheckCircle, Mail, Key, Shield, UserPlus, Eye, EyeOff,
  Edit, Trash2, Download, RefreshCw, BarChart2, PieChart, TrendingUp, ChevronLeft, ChevronRight, Hash
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { CatConfig } from "../../lib/constants";
\nexport function RequestTable({ requests, onSelect, showAssign, officers, onAssign, hideRequester, users }: {
  requests: Request[]; onSelect: (r: Request) => void;
  showAssign?: boolean; officers?: User[];
  onAssign?: (requestId: string, officerId: string) => void;
  hideRequester?: boolean;
  users?: User[];
}) {
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [assignRect, setAssignRect] = useState<DOMRect | null>(null);

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No requests found.</p>
      </div>
    );
  }

  const headers = ["ID", "Title", ...(!hideRequester ? ["Requester", "Role"] : []), "Category", "Priority", "Status", "Location", "Date", "Actions"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id} className="border-b border-border hover:bg-muted/40 transition-colors cursor-pointer group"
              onClick={() => onSelect(r)}>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground max-w-xs truncate text-xs">{r.title}</div>
                {r.assignedToName && (
                  <div className="text-xs text-muted-foreground mt-0.5">→ {r.assignedToName}</div>
                )}
              </td>
              {!hideRequester && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.submittedByName} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{r.submittedByName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[140px]" style={{ fontFamily: "var(--font-mono)" }}>
                        {(users ?? USERS).find(u => u.id === r.submittedBy)?.email ?? ""}
                      </div>
                    </div>
                  </div>
                </td>
              )}
              {!hideRequester && (
                <td className="px-4 py-3 whitespace-nowrap">
                  {(() => {
                    const role = r.submittedByRole ?? users?.find(u => u.id === r.submittedBy)?.role ?? USERS.find(u => u.id === r.submittedBy)?.role;
                    if (!role) return null;
                    return (
                      <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                        role === "staff"   ? "bg-blue-50 text-blue-800" :
                        role === "student" ? "bg-muted text-muted-foreground" :
                        role === "admin"   ? "bg-primary/10 text-primary" :
                        role === "officer" ? "bg-amber-50 text-amber-800" :
                        "bg-muted text-muted-foreground"
                      }`} style={{ fontFamily: "var(--font-mono)" }}>
                        {role}
                      </span>
                    );
                  })()}
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap">
                <CategoryTag category={r.category} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <PriorityLabel priority={r.priority} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 max-w-[160px]">
                <span className="text-xs text-muted-foreground truncate block">{r.location.split("—")[0].trim()}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatDate(r.createdAt)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onSelect(r)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Eye size={13} />
                  </button>
                  {showAssign && officers && onAssign && !["resolved","closed","cancelled"].includes(r.status) && (
                    <div className="relative">
                      <button
                        title="Assign Officer"
                        onClick={e => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setAssignRect(rect);
                          setAssignOpen(assignOpen === r.id ? null : r.id);
                        }}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <UserCheck size={13} />
                      </button>
                      {assignOpen === r.id && assignRect && createPortal(
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setAssignOpen(null)} />
                          <div className="fixed z-50 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                            style={{ top: assignRect.bottom + 4, left: assignRect.right - 192 }}>
                            <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Assign Officer
                            </div>
                            {(officers ?? []).map(o => (
                              <button key={o.id}
                                onClick={() => { onAssign(r.id, o.id); setAssignOpen(null); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border last:border-0 ${r.assignedTo === o.id ? "bg-primary/5" : ""}`}>
                                <div className="font-medium text-foreground flex items-center gap-1.5">
                                  {o.name}
                                  {r.assignedTo === o.id && <span className="text-primary text-[10px]">(current)</span>}
                                </div>
                                <div className="text-muted-foreground">{o.department}</div>
                              </button>
                            ))}
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}\n