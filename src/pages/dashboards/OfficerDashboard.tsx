import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { formatDate, getGreeting } from "../../lib/utils";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, CheckCheck, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";



import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { OfficerTaskTable } from "../../components/tables/OfficerTaskTable";



import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";


import { INITIAL_REQUESTS } from "../../data/mockData";

export function OfficerDashboard({ user, requests: rawRequests, onSelect, onStatusUpdate, activeTab, globalSearch }: {
  user: User; requests: Request[]; onSelect: (r: Request) => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  activeTab: string; globalSearch: string;
}) {
  const requests = (rawRequests && rawRequests.length > 0) ? rawRequests : INITIAL_REQUESTS;
  const deptCategoriesMap: Record<string, string[]> = useMemo(() => ({
    "electrical systems": ["electricity"],
    "plumbing & civil": ["plumbing"],
    "it & networks": ["internet"],
    "general maintenance": ["hvac", "furniture", "other"],
  }), []);

  const assigned = useMemo(() => {
    const userIdStr = String(user.id).toLowerCase();
    const userNameStr = (user.name || "").toLowerCase();
    const userDept = (user.department || "").trim().toLowerCase();
    const deptCats = deptCategoriesMap[userDept] || [];

    return requests.filter(r => {
      const assignByStr = String(r.assignedTo || "").toLowerCase();
      const assignNameStr = (r.assignedToName || "").toLowerCase();

      const matchId = Boolean(assignByStr && (assignByStr === userIdStr || assignByStr === `u${userIdStr}` || userIdStr === `u${assignByStr}`));
      const matchName = Boolean(userNameStr && assignNameStr && (userNameStr.includes(assignNameStr) || assignNameStr.includes(userNameStr)));
      const matchDept = deptCats.length > 0 && deptCats.includes(r.category);
      const isUnassigned = !r.assignedTo;

      return (matchId || matchName || matchDept || isUnassigned) && ["pending", "assigned", "in_progress"].includes(r.status);
    });
  }, [requests, user, deptCategoriesMap]);

  const completed = useMemo(() => {
    const userIdStr = String(user.id).toLowerCase();
    const userNameStr = (user.name || "").toLowerCase();
    const userDept = (user.department || "").trim().toLowerCase();
    const deptCats = deptCategoriesMap[userDept] || [];

    return requests.filter(r => {
      const assignByStr = String(r.assignedTo || "").toLowerCase();
      const assignNameStr = (r.assignedToName || "").toLowerCase();

      const matchId = Boolean(assignByStr && (assignByStr === userIdStr || assignByStr === `u${userIdStr}` || userIdStr === `u${assignByStr}`));
      const matchName = Boolean(userNameStr && assignNameStr && (userNameStr.includes(assignNameStr) || assignNameStr.includes(userNameStr)));
      const matchDept = deptCats.length > 0 && deptCats.includes(r.category);

      return (matchId || matchName || matchDept) && ["resolved", "closed"].includes(r.status);
    });
  }, [requests, user, deptCategoriesMap]);

  // Apply global search to assigned tasks tab
  const assignedFiltered = useMemo(() => {
    const q = globalSearch.toLowerCase();
    return !q ? assigned : assigned.filter(r => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [assigned, globalSearch]);

  const urgentTasks   = assigned.filter(r => ["urgent","high"].includes(r.priority));
  const completedToday = completed.filter(r => r.resolvedAt && new Date(r.resolvedAt).toDateString() === new Date().toDateString()).length;

  const pageTitle: Record<string, string> = {
    overview:  `${getGreeting()}, ${user.name.split(" ")[0]}`,
    tasks:     "Assigned Tasks",
    completed: "Completed Tasks",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {pageTitle[activeTab] ?? user.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{user.department} · Maintenance Officer</p>
      </div>

      <div className="px-3 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Awaiting Start"  value={assigned.filter(r => ["pending", "assigned"].includes(r.status)).length}   icon={<Clock size={18} />} />
              <StatCard label="In Progress"     value={assigned.filter(r => r.status === "in_progress").length} icon={<RefreshCw size={18} />} accent />
              <StatCard label="Completed Today" value={completedToday}                                          icon={<CheckCircle size={18} />} />
              <StatCard label="Total Completed" value={completed.length}                                        icon={<CheckCheck size={18} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Active tasks summary */}
              <div className="lg:col-span-2 bg-card border border-border rounded">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Active Tasks</h3>
                  <span className="text-xs text-muted-foreground">{assigned.length} active</span>
                </div>
                {assigned.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCheck size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assigned.slice(0, 5).map(r => (
                      <div key={r.id} onClick={() => onSelect(r)}
                        className="px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{r.id}</span>
                            <StatusBadge status={r.status} />
                            {["urgent","high"].includes(r.priority) && (
                              <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                                <AlertTriangle size={11} /> {r.priority === "urgent" ? "Urgent" : "High"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>
                            {r.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <CategoryTag category={r.category} />
                            <span className="text-xs text-muted-foreground">{r.location.split("—")[0].trim()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {(user.role || "").toLowerCase() === "officer" && ["pending", "assigned"].includes(r.status) && (
                            <button onClick={e => { e.stopPropagation(); onStatusUpdate(r.id, "in_progress", "Work started."); }}
                              className="px-2.5 py-1 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
                              Start Work
                            </button>
                          )}
                          {r.status === "in_progress" && (
                            <button onClick={e => { e.stopPropagation(); onStatusUpdate(r.id, "resolved", "Work completed."); }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                              Mark Resolved
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {formatDate(r.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Urgent/High priority alert */}
                {urgentTasks.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-destructive" />
                      <span className="text-xs font-bold text-destructive uppercase tracking-wide">Urgent Attention Required</span>
                    </div>
                    <div className="space-y-2">
                      {urgentTasks.slice(0, 3).map(r => (
                        <div key={r.id} onClick={() => onSelect(r)}
                          className="text-xs text-destructive/80 cursor-pointer hover:text-destructive truncate">
                          → {r.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work summary */}
                <div className="bg-card border border-border rounded p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Work Summary</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Awaiting start", value: assigned.filter(r => ["pending", "assigned"].includes(r.status)).length, color: "text-amber-600" },
                      { label: "In progress",    value: assigned.filter(r => r.status === "in_progress").length, color: "text-violet-600" },
                      { label: "Resolved total", value: completed.filter(r => r.status === "resolved").length, color: "text-emerald-600" },
                      { label: "Closed total",   value: completed.filter(r => r.status === "closed").length, color: "text-gray-500" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-bold ${item.color}`} style={{ fontFamily: "var(--font-mono)" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recently completed */}
                {completed.length > 0 && (
                  <div className="bg-card border border-border rounded p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recently Completed</h3>
                    <div className="space-y-2">
                      {completed.slice(0, 3).map(r => (
                        <div key={r.id} className="text-xs">
                          <div className="font-medium text-foreground truncate">{r.title}</div>
                          <div className="text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                            {r.resolvedAt ? formatDate(r.resolvedAt) : formatDate(r.updatedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ASSIGNED TASKS TAB ────────────────────────────────────── */}
        {activeTab === "tasks" && (
                      <OfficerTaskTable
              requests={assignedFiltered}
              onSelect={onSelect}
              onStatusUpdate={onStatusUpdate}
              emptyLabel="No active tasks assigned to you."
              currentUser={user}
            />
        )}

        {/* ── COMPLETED TASKS TAB ───────────────────────────────────── */}
        {activeTab === "completed" && (
          <OfficerTaskTable
            requests={completed}
            onSelect={onSelect}
            onStatusUpdate={onStatusUpdate}
            emptyLabel="No completed tasks yet."
            currentUser={user}
          />
        )}

      </div>
    </div>
  );
}
