import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, CheckCheck, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { PriorityLabel } from "../../components/ui/PriorityLabel";
import { Pagination } from "../../components/tables/Pagination";

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

export function OfficerTaskTable({ requests, onSelect, onStatusUpdate, emptyLabel }: {
  requests: Request[]; onSelect: (r: Request) => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter(r => !q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [requests, search]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-card border border-border rounded">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {requests.length} task{requests.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-2">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks…"
            className="bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground w-40"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <CheckCheck size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["ID","Title","Category","Priority","Status","Location","Submitted","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const isUrgent = r.priority === "urgent" || r.priority === "high";
                return (
                  <tr key={r.id}
                    className={`border-b border-border hover:bg-muted/40 transition-colors ${isUrgent && r.status === "assigned" ? "border-l-2 border-l-destructive" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{r.id}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="text-xs font-medium text-foreground truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.submittedByName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><CategoryTag category={r.category} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityLabel priority={r.priority} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <span className="text-xs text-muted-foreground truncate block">{r.location.split("—")[0].trim()}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(r.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onSelect(r)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View details">
                          <Eye size={13} />
                        </button>
                        {r.status === "assigned" && (
                          <button onClick={() => onStatusUpdate(r.id, "in_progress", "Work started.")}
                            className="px-2.5 py-1 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
                            Start Work
                          </button>
                        )}
                        {r.status === "in_progress" && (
                          <button onClick={() => onStatusUpdate(r.id, "resolved", "Work completed.")}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
    </div>
  );
}
