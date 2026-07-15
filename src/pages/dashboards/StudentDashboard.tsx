import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { formatDate, getGreeting } from "../../lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { PriorityLabel } from "../../components/ui/PriorityLabel";
import { Avatar } from "../../components/ui/Avatar";
import { FiltersBar } from "../../components/tables/FiltersBar";
import { Pagination } from "../../components/tables/Pagination";
import { getGreeting, formatDate } from "../../lib/utils";
import { CheckCircle } from "lucide-react";

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

export function StudentDashboard({ user, requests, onNewRequest, onSelect, globalSearch, activeTab, onTabChange }: {
  user: User; requests: Request[]; onNewRequest: () => void; onSelect: (r: Request) => void;
  globalSearch: string; activeTab: string; onTabChange: (t: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const mine = requests.filter(r => r.submittedBy === user.id);

  const filtered = useMemo(() => {
    return mine.filter(r => {
      const q = (globalSearch || search).toLowerCase();
      const matchQ = !q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchS = !statusFilter || r.status === statusFilter;
      const matchC = !categoryFilter || r.category === categoryFilter;
      return matchQ && matchS && matchC;
    });
  }, [mine, search, globalSearch, statusFilter, categoryFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: mine.length,
    pending: mine.filter(r => r.status === "pending").length,
    inProgress: mine.filter(r => ["assigned","in_progress"].includes(r.status)).length,
    resolved: mine.filter(r => ["resolved","closed"].includes(r.status)).length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {activeTab === "requests" ? "My Requests" : `${getGreeting()}, ${user.name.split(" ")[0]}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTab === "requests" ? "Track and manage your maintenance requests" : `${user.department} · ${formatDate(new Date().toISOString())}`}
            </p>
          </div>
          <button onClick={onNewRequest}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
            style={{ fontFamily: "var(--font-display)" }}>
            <Plus size={15} /> New Request
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Total Requests" value={stats.total} icon={<FileText size={18} />} />
              <StatCard label="Pending Review" value={stats.pending} icon={<Clock size={18} />} accent />
              <StatCard label="In Progress" value={stats.inProgress} icon={<RefreshCw size={18} />} />
              <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle size={18} />} />
            </div>

            {/* Priority Distribution */}
            {mine.length > 0 && (
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Request Priority Breakdown
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => {
                    const count = mine.filter(r => r.priority === p).length;
                    const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    const pc = PRIORITY_CONFIG[p];
                    return (
                      <div key={p} className="text-center">
                        <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                          {count}
                        </div>
                        <div className={`text-xs font-semibold uppercase mb-1 ${pc.color}`} style={{ fontFamily: "var(--font-mono)" }}>
                          {pc.label}
                        </div>
                        <div className="text-xs text-muted-foreground">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Recent requests — compact card list */}
            <div className="lg:col-span-2 bg-card border border-border rounded">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Recent Requests</h3>
                <button onClick={() => onTabChange("requests")}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </button>
              </div>
              {mine.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
                  <button onClick={onNewRequest} className="mt-3 text-sm text-primary hover:underline font-medium">
                    Submit your first request
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {mine.slice(0, 5).map(r => (
                    <div key={r.id} onClick={() => onSelect(r)}
                      className="px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{r.id}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>
                          {r.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <CategoryTag category={r.category} />
                          <span className="text-xs text-muted-foreground">{r.location.split("—")[0].trim()}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <PriorityLabel priority={r.priority} />
                        <div className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                          {formatDate(r.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column — activity summary */}
            <div className="space-y-4">
              {/* Status breakdown */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Status Summary</h3>
                <div className="space-y-3">
                  {(["pending","assigned","in_progress","resolved","closed","cancelled"] as Status[]).map(s => {
                    const count = mine.filter(r => r.status === s).length;
                    const c = STATUS_CONFIG[s];
                    return (
                      <div key={s} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="text-xs text-muted-foreground">{c.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick action */}
              <div className="bg-primary rounded p-5 text-white">
                <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  Report an Issue
                </h3>
                <p className="text-xs text-white/70 mb-4 leading-relaxed">
                  Spotted a fault on campus? Submit a maintenance request and track its progress.
                </p>
                <button onClick={onNewRequest}
                  className="w-full flex items-center justify-center gap-2 bg-white text-primary py-2 rounded text-xs font-semibold hover:bg-white/90 transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}>
                  <Plus size={13} /> New Request
                </button>
              </div>

              {/* Most recent assigned officer */}
              {mine.find(r => r.assignedToName && ["assigned","in_progress"].includes(r.status)) && (() => {
                const active = mine.find(r => r.assignedToName && ["assigned","in_progress"].includes(r.status))!;
                return (
                  <div className="bg-card border border-border rounded p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Officer</h3>
                    <div className="flex items-center gap-3">
                      <Avatar name={active.assignedToName!} size="md" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{active.assignedToName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Working on your request</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-card border border-border rounded">
            <div className="px-5 py-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer">
                    {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>All My Requests</h3>
                </div>
                <span className="text-xs text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
              </div>
              <FiltersBar
                search={search} setSearch={v => { setSearch(v); setPage(1); }}
                statusFilter={statusFilter} setStatusFilter={v => { setStatusFilter(v); setPage(1); }}
                categoryFilter={categoryFilter} setCategoryFilter={v => { setCategoryFilter(v); setPage(1); }}
              />
            </div>

            {paginated.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No requests match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["ID", "Title", "Category", "Priority", "Status", "Date Submitted", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(r => (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{r.id}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="text-xs font-medium text-foreground truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{r.location.split("—")[0].trim()}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <CategoryTag category={r.category} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PriorityLabel priority={r.priority} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {formatDate(r.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelect(r)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
                              style={{ fontFamily: "var(--font-display)" }}>
                              <Eye size={12} /> View
                            </button>
                            {r.status === "pending" && (
                              <button
                                onClick={() => onSelect(r)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive text-destructive rounded text-xs font-semibold hover:bg-destructive/10 transition-colors"
                                style={{ fontFamily: "var(--font-display)" }}>
                                Cancel
                              </button>
                            )}
                            {r.status === "resolved" && (
                              <button
                                onClick={() => onSelect(r)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors"
                                style={{ fontFamily: "var(--font-display)" }}>
                                <CheckCircle size={12} /> Acknowledge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
