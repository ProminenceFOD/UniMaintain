import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, Users, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Activity, Key, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { formatDate, exportCSV, getGreeting } from "../../lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import { StatCard } from "../../components/ui/StatCard";
import { RequestTable } from "../../components/tables/RequestTable";
import { FiltersBar } from "../../components/tables/FiltersBar";
import { Pagination } from "../../components/tables/Pagination";
import { InviteUserModal } from "../../components/admin/InviteUserModal";
import { EditUserModal } from "../../components/admin/EditUserModal";
import { ResetPasswordModal } from "../../components/admin/ResetPasswordModal";
import { Avatar } from "../../components/ui/Avatar";
import { getGreeting, exportCSV, formatDate } from "../../lib/utils";
import { CheckCircle, Users, Activity } from "lucide-react";
import { Tooltip } from "recharts";

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

export function AdminDashboard({ requests, users, currentUser, onSelect, onAssign, onStatusUpdate, onToggleUser, onInviteUser, onEditUser, activeTab, globalSearch }: {
  requests: Request[]; users: User[]; currentUser: User; onSelect: (r: Request) => void;
  onAssign: (requestId: string, officerId: string) => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  onToggleUser: (id: string) => void;
  onInviteUser: (user: User) => void;
  onEditUser: (updated: User) => void;
  activeTab: string;
  globalSearch: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [userPerPage, setUserPerPage] = useState(10);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all"|"student"|"staff"|"officer"|"admin">("all");

  const officers = users.filter(u => u.role === "officer" && u.active !== false);

  // User management filter + search
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return users.filter(u => {
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q);
      const matchR = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchQ && matchR;
    });
  }, [users, userSearch, userRoleFilter]);
  const pagedUsers = filteredUsers.slice((userPage - 1) * userPerPage, userPage * userPerPage);

  const stats = {
    total: requests.length,
    open: requests.filter(r => !["resolved","closed"].includes(r.status)).length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    resolved: requests.filter(r => ["resolved","closed"].includes(r.status)).length,
    urgent: requests.filter(r => r.priority === "urgent" && r.status === "pending").length,
    officers: officers.length,
  };

  const filtered = useMemo(() => {
    const q = (globalSearch || search).toLowerCase();
    return requests.filter(r => {
      const matchQ = !q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchS = !statusFilter || r.status === statusFilter;
      const matchC = !categoryFilter || r.category === categoryFilter;
      return matchQ && matchS && matchC;
    });
  }, [requests, search, globalSearch, statusFilter, categoryFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Chart data
  const categoryData = (Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => ({
    name: CATEGORY_CONFIG[cat].label,
    count: requests.filter(r => r.category === cat).length,
  })).filter(d => d.count > 0);

  const statusData = (Object.keys(STATUS_CONFIG) as Status[]).map(s => ({
    name: STATUS_CONFIG[s].label,
    value: requests.filter(r => r.status === s).length,
  })).filter(d => d.value > 0);

  const CHART_COLORS = ["#1A4731","#C9A227","#0B7EA8","#7C3AED","#B91C1C","#059669"];

  const officerWorkload = officers.map(o => ({
    name: o.name.split(" ")[0],
    assigned: requests.filter(r => r.assignedTo === o.id && r.status === "assigned").length,
    active: requests.filter(r => r.assignedTo === o.id && r.status === "in_progress").length,
    done: requests.filter(r => r.assignedTo === o.id && ["resolved","closed"].includes(r.status)).length,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {activeTab === "overview"   ? `${getGreeting()}, ${currentUser.name.split(" ")[0]}`
               : activeTab === "requests" ? "All Requests"
               : activeTab === "users"    ? "User Management"
               : activeTab === "analytics"? "Analytics"
               : activeTab === "reports"  ? "Reports"
               : "Administration"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTab === "overview"    ? "System summary and activity"
               : activeTab === "requests"  ? "Manage and assign maintenance requests"
               : activeTab === "users"     ? "Manage registered users and roles"
               : activeTab === "analytics" ? "Request trends and performance"
               : activeTab === "reports"   ? "Detailed reports with date filtering"
               : "Facilities Management"}
            </p>
          </div>
          {activeTab === "requests" && (
            <button onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 border border-border rounded px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Requests" value={stats.total} icon={<FileText size={18} />} />
              <StatCard label="Open Requests" value={stats.open} icon={<AlertCircle size={18} />} accent />
              <StatCard label="In Progress" value={stats.inProgress} icon={<RefreshCw size={18} />} />
              <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle size={18} />} />
              <StatCard label="Urgent Pending" value={stats.urgent} icon={<AlertTriangle size={18} />} accent />
              <StatCard label="Active Officers" value={stats.officers} icon={<Users size={18} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests by Category — CSS bars */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Requests by Category</h3>
                {categoryData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((d, i) => {
                      const max = Math.max(...categoryData.map(x => x.count), 1);
                      return (
                        <div key={d.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-foreground font-medium">{d.name}</span>
                            <span className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{d.count}</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(d.count / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Distribution — pie chart kept */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Status Distribution</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={180}>
                    <PieChart id="admin-overview-status-pie">
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" stroke="none" isAnimationActive={false}>
                        {statusData.map((entry, i) => <Cell key={`overview-pie-${entry.name}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {statusData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Officer Workload — CSS grouped bars */}
            <div className="bg-card border border-border rounded">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Officer Workload</h3>
                <div className="flex items-center gap-4 mt-1">
                  {[["#1A4731","Assigned"],["#C9A227","In Progress"],["#059669","Resolved"]].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c }} />{l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                {officerWorkload.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No officer data.</p>
                ) : (
                  <div className="space-y-4">
                    {officerWorkload.map(o => {
                      const total = Math.max(o.assigned + o.active + o.done, 1);
                      return (
                        <div key={o.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-foreground">{o.name}</span>
                            <span className="text-xs text-muted-foreground">{o.assigned + o.active + o.done} total</span>
                          </div>
                          <div className="flex h-3 rounded-full overflow-hidden gap-px">
                            {o.assigned > 0 && <div style={{ width: `${(o.assigned/total)*100}%`, background: "#1A4731" }} title={`Assigned: ${o.assigned}`} />}
                            {o.active   > 0 && <div style={{ width: `${(o.active/total)*100}%`,   background: "#C9A227" }} title={`In Progress: ${o.active}`} />}
                            {o.done     > 0 && <div style={{ width: `${(o.done/total)*100}%`,     background: "#059669" }} title={`Resolved: ${o.done}`} />}
                            {(o.assigned + o.active + o.done) === 0 && <div className="flex-1 bg-muted" />}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{o.assigned} assigned</span>
                            <span>{o.active} active</span>
                            <span>{o.done} resolved</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Response Time & Priority Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Average Response Time */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  <Activity size={14} className="text-primary" />
                  Response Time Metrics
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const assignedRequests = requests.filter(r => r.assignedTo && r.status !== "pending");
                    const resolvedRequests = requests.filter(r => r.resolvedAt);
                    
                    // Calculate average time to assign (from creation to assignment)
                    const avgTimeToAssign = (() => {
                      if (assignedRequests.length === 0) return "N/A";
                      const times = assignedRequests.map(r => {
                        const created = new Date(r.createdAt).getTime();
                        const assignEntry = r.audit.find(a => a.action.includes("Assigned"));
                        if (!assignEntry) return 0;
                        const assigned = new Date(assignEntry.timestamp).getTime();
                        return assigned - created;
                      }).filter(t => t > 0);
                      
                      if (times.length === 0) return "N/A";
                      const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
                      const hours = Math.round(avgMs / (1000 * 60 * 60));
                      return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
                    })();

                    // Calculate average time to resolve
                    const avgTimeToResolve = (() => {
                      if (resolvedRequests.length === 0) return "N/A";
                      const times = resolvedRequests.map(r => {
                        const created = new Date(r.createdAt).getTime();
                        const resolved = new Date(r.resolvedAt!).getTime();
                        return resolved - created;
                      });
                      
                      const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
                      const hours = Math.round(avgMs / (1000 * 60 * 60));
                      return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
                    })();

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Avg. Time to Assign</span>
                          <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{avgTimeToAssign}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Avg. Time to Resolve</span>
                          <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{avgTimeToResolve}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Resolution Rate</span>
                          <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {requests.length > 0 ? Math.round((resolvedRequests.length / requests.length) * 100) : 0}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  <AlertTriangle size={14} className="text-primary" />
                  Priority Distribution
                </h3>
                <div className="space-y-3">
                  {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => {
                    const count = requests.filter(r => r.priority === p).length;
                    const percentage = requests.length > 0 ? (count / requests.length) * 100 : 0;
                    const pc = PRIORITY_CONFIG[p];
                    return (
                      <div key={p}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold uppercase ${pc.color}`} style={{ fontFamily: "var(--font-mono)" }}>
                            {pc.label}
                          </span>
                          <span className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              p === "urgent" ? "bg-red-500" :
                              p === "high" ? "bg-orange-500" :
                              p === "medium" ? "bg-blue-500" :
                              "bg-gray-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Recent Requests</h3>
                <span className="text-xs text-muted-foreground">{requests.length} total</span>
              </div>
              <RequestTable requests={requests.slice(0,6)} onSelect={onSelect}
                showAssign officers={officers} onAssign={onAssign} users={users} />
            </div>
          </>
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
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>All Requests</h3>
                </div>
                <span className="text-xs text-muted-foreground">{filtered.length} results</span>
              </div>
              <FiltersBar
                search={search} setSearch={v => { setSearch(v); setPage(1); }}
                statusFilter={statusFilter} setStatusFilter={v => { setStatusFilter(v); setPage(1); }}
                categoryFilter={categoryFilter} setCategoryFilter={v => { setCategoryFilter(v); setPage(1); }}
              />
            </div>
            <RequestTable requests={paginated} onSelect={onSelect}
              showAssign officers={officers} onAssign={onAssign} users={users} />
            <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-card border border-border rounded">
            <div className="px-5 py-4 border-b border-border space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <select value={userPerPage} onChange={e => { setUserPerPage(Number(e.target.value)); setUserPage(1); }}
                    className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer">
                    {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>User Management</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{users.length} registered users</p>
                  </div>
                </div>
                <button onClick={() => setShowInvite(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}>
                  <Plus size={13} /> Invite User
                </button>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-2">
                <Search size={13} className="text-muted-foreground flex-shrink-0" />
                <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                  placeholder="Search by name, email, or department..."
                  className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
                />
                {userSearch && <button onClick={() => setUserSearch("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
              </div>

              {/* Role filter tabs */}
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: "all",     label: "All Users" },
                  { key: "student", label: "Students" },
                  { key: "staff",   label: "Staff" },
                  { key: "officer", label: "Officers" },
                  { key: "admin",   label: "Admins" },
                ] as const).map(r => {
                  const count = r.key === "all" ? users.length : users.filter(u => u.role === r.key).length;
                  return (
                    <button key={r.key} onClick={() => { setUserRoleFilter(r.key); setUserPage(1); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        userRoleFilter === r.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}>
                      {r.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        userRoleFilter === r.key ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {showInvite && (
              <InviteUserModal
                onClose={() => setShowInvite(false)}
                onInvite={(u) => { onInviteUser(u); setShowInvite(false); }}
              />
            )}
            {editingUser && (
              <EditUserModal
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSave={(updated) => { onEditUser(updated); setEditingUser(null); }}
              />
            )}
            {resetPasswordUser && (
              <ResetPasswordModal
                user={resetPasswordUser}
                onClose={() => setResetPasswordUser(null)}
                onReset={(userId, newPassword) => {
                  // In a real app, this would call the API
                  // For now, just show success and close
                  console.log(`Password reset for user ${userId}: ${newPassword}`);
                }}
              />
            )}
            {/* Mobile: card list */}
            <div className="divide-y divide-border sm:hidden">
              {pagedUsers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No users found.</div>
              ) : pagedUsers.map(u => (
                <div key={u.id} className="px-4 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar name={u.name} size="md" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate" style={{ fontFamily: "var(--font-mono)" }}>{u.email}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                          u.role === "admin" ? "bg-primary/10 text-primary" :
                          u.role === "officer" ? "bg-amber-50 text-amber-800" :
                          u.role === "staff" ? "bg-blue-50 text-blue-800" : "bg-muted text-muted-foreground"
                        }`} style={{ fontFamily: "var(--font-mono)" }}>{u.role}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${u.active ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{u.department} · {formatDate(u.joinedAt)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button onClick={() => setEditingUser(u)}
                      className="text-xs text-primary hover:underline font-medium">Edit</button>
                    <button onClick={() => setResetPasswordUser(u)}
                      className="text-xs text-amber-600 hover:underline font-medium">Reset Password</button>
                    <button onClick={() => onToggleUser(u.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["User","Email","Role","Department","Joined","Status","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No users found.</td></tr>
                  ) : pagedUsers.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <span className="text-xs font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-xs text-muted-foreground truncate block" style={{ fontFamily: "var(--font-mono)" }}>{u.email}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                          u.role === "admin" ? "bg-primary/10 text-primary" :
                          u.role === "officer" ? "bg-amber-50 text-amber-800" :
                          u.role === "staff" ? "bg-blue-50 text-blue-800" : "bg-muted text-muted-foreground"
                        }`} style={{ fontFamily: "var(--font-mono)" }}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{u.department}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(u.joinedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${u.active ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingUser(u)} className="text-xs text-primary hover:underline font-medium">Edit</button>
                          <span className="text-border">|</span>
                          <button onClick={() => setResetPasswordUser(u)} className="text-xs text-amber-600 hover:underline font-medium">Reset Pwd</button>
                          <span className="text-border">|</span>
                          <button onClick={() => onToggleUser(u.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            {u.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={userPage} total={filteredUsers.length} perPage={userPerPage} onPage={setUserPage} />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Requests by Category — CSS horizontal bars */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Requests by Category</h3>
                {categoryData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((d, i) => {
                      const max = Math.max(...categoryData.map(x => x.count), 1);
                      return (
                        <div key={d.name} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 flex-shrink-0 text-right">{d.name}</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${(d.count / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                          <span className="text-xs font-bold text-foreground w-6 text-right" style={{ fontFamily: "var(--font-mono)" }}>{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Breakdown — pie chart kept */}
              <div className="bg-card border border-border rounded p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Status Breakdown</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart id="admin-analytics-status-pie">
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false} stroke="none" isAnimationActive={false}>
                        {statusData.map((entry, i) => <Cell key={`analytics-pie-${entry.name}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {statusData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground flex-1">{d.name}</span>
                        <span className="font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Distribution — CSS bars */}
            <div className="bg-card border border-border rounded p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Priority Distribution by Category</h3>
              {categoryData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No data yet.</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryData.map((d, i) => (
                    <div key={d.name} className="bg-muted/40 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs font-medium text-foreground truncate">{d.name}</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{d.count}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {requests.length > 0 ? Math.round((d.count / requests.length) * 100) : 0}% of total
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
