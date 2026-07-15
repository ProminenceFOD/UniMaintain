import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, CheckCircle2, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Printer, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";



import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { Avatar } from "../../components/ui/Avatar";
import { StatCard } from "../../components/ui/StatCard";
import { CalendarPopover } from "../../components/ui/CalendarPopover";
import { MonthPicker } from "../../components/ui/MonthPicker";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import type { CatConfig } from "../../lib/constants";

export function AdminReports({ requests, users }: { requests: Request[]; users: User[] }) {
  const officers = users.filter(u => u.role === "officer" && u.active !== false);

  // ── Date filter state ──────────────────────────────────────────────────────
  const [filterMode, setFilterMode] = useState<"all" | "day" | "month" | "year" | "custom">("all");
  const [filterDay,   setFilterDay]   = useState("");           // "2026-06-19"
  const [filterMonth, setFilterMonth] = useState("");           // "2026-06"
  const [filterYear,  setFilterYear]  = useState("");           // "2026"
  const [filterFrom,  setFilterFrom]  = useState("");           // "2026-06-01"
  const [filterTo,    setFilterTo]    = useState("");           // "2026-06-30"
  const [applied,     setApplied]     = useState<typeof filterMode>("all");
  const [appliedValues, setAppliedValues] = useState({ day:"", month:"", year:"", from:"", to:"" });

  const years = Array.from(new Set(requests.map(r => r.createdAt.slice(0,4)))).sort().reverse();

  function applyFilter() {
    setApplied(filterMode);
    setAppliedValues({ day: filterDay, month: filterMonth, year: filterYear, from: filterFrom, to: filterTo });
  }

  function clearFilter() {
    setFilterMode("all");
    setFilterDay(""); setFilterMonth(""); setFilterYear(""); setFilterFrom(""); setFilterTo("");
    setApplied("all");
    setAppliedValues({ day:"", month:"", year:"", from:"", to:"" });
  }

  // ── Filtered dataset ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const d = r.createdAt.slice(0, 10); // "2026-06-19"
      if (applied === "day"    && appliedValues.day)   return d === appliedValues.day;
      if (applied === "month"  && appliedValues.month) return d.startsWith(appliedValues.month);
      if (applied === "year"   && appliedValues.year)  return d.startsWith(appliedValues.year);
      if (applied === "custom" && appliedValues.from && appliedValues.to)
        return d >= appliedValues.from && d <= appliedValues.to;
      return true;
    });
  }, [requests, applied, appliedValues]);

  const filterLabel = (() => {
    if (applied === "all")    return "All time";
    if (applied === "day")    return `Day: ${appliedValues.day}`;
    if (applied === "month")  return `Month: ${appliedValues.month}`;
    if (applied === "year")   return `Year: ${appliedValues.year}`;
    if (applied === "custom") return `${appliedValues.from} → ${appliedValues.to}`;
    return "";
  })();

  // ── Summary stats ──────────────────────────────────────────────────────────
  const total     = filtered.length;
  const resolved  = filtered.filter(r => ["resolved","closed"].includes(r.status)).length;
  const open      = filtered.filter(r => !["resolved","closed","cancelled"].includes(r.status)).length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const avgResolutionDays = (() => {
    const done = filtered.filter(r => r.resolvedAt);
    if (!done.length) return "—";
    const avg = done.reduce((acc, r) => {
      const diff = (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 86400000;
      return acc + diff;
    }, 0) / done.length;
    return `${avg.toFixed(1)} days`;
  })();

  // ── Monthly trend (group by month) ────────────────────────────────────────
  const monthlyData = (() => {
    const map: Record<string, { submitted: number; resolved: number }> = {};
    filtered.forEach(r => {
      const m = r.createdAt.slice(0, 7);
      if (!map[m]) map[m] = { submitted: 0, resolved: 0 };
      map[m].submitted++;
      if (["resolved","closed"].includes(r.status)) map[m].resolved++;
    });
    return Object.entries(map).sort().map(([month, v]) => ({
      month: new Date(month + "-01").toLocaleString("en-GB", { month: "short", year: "2-digit" }),
      ...v,
    }));
  })();

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = (Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
    const count = filtered.filter(r => r.category === cat).length;
    const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
    return { cat, label: CATEGORY_CONFIG[cat].label, count, pct };
  }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  // ── Priority breakdown ────────────────────────────────────────────────────
  const priorityData = (["urgent","high","medium","low"] as Priority[]).map(p => ({
    name: PRIORITY_CONFIG[p].label,
    count: filtered.filter(r => r.priority === p).length,
  })).filter(d => d.count > 0);

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statusData = (Object.keys(STATUS_CONFIG) as Status[]).map(s => ({
    name: STATUS_CONFIG[s].label,
    value: filtered.filter(r => r.status === s).length,
    dot: STATUS_CONFIG[s].dot,
  })).filter(d => d.value > 0);

  // ── Officer performance ───────────────────────────────────────────────────
  const officerStats = officers.map(o => {
    const mine = filtered.filter(r => r.assignedTo === o.id);
    const done = mine.filter(r => r.resolvedAt);
    const avgDays = done.length
      ? (done.reduce((acc, r) => acc + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) / 86400000, 0) / done.length).toFixed(1)
      : "—";
    return {
      name: o.name, department: o.department,
      assigned:    mine.filter(r => r.status === "assigned").length,
      inProgress:  mine.filter(r => r.status === "in_progress").length,
      resolved:    mine.filter(r => ["resolved","closed"].includes(r.status)).length,
      total:       mine.length,
      avgDays,
    };
  }).sort((a, b) => b.total - a.total);

  const CHART_COLORS = ["#1A4731","#C9A227","#0B7EA8","#7C3AED","#B91C1C","#059669"];

  function exportReport() {
    const lines = [
      "UNIMAINTAIN — MAINTENANCE REPORT",
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      `Filter: ${filterLabel}`,
      "",
      "SUMMARY",
      `Total Requests,${total}`,
      `Resolved,${resolved}`,
      `Open,${open}`,
      `Resolution Rate,${resolutionRate}%`,
      `Avg Resolution Time,${avgResolutionDays}`,
      "",
      "REQUESTS BY CATEGORY",
      "Category,Count,Percentage",
      ...categoryData.map(d => `${d.label},${d.count},${d.pct}%`),
      "",
      "OFFICER PERFORMANCE",
      "Officer,Department,Total Assigned,In Progress,Resolved,Avg Resolution Time",
      ...officerStats.map(o => `${o.name},${o.department},${o.total},${o.inProgress},${o.resolved},${o.avgDays}`),
      "",
      "ALL REQUESTS",
      "ID,Title,Category,Priority,Status,Submitted By,Assigned To,Date",
      ...filtered.map(r => `${r.id},"${r.title}",${r.category},${r.priority},${r.status},${r.submittedByName},${r.assignedToName ?? "Unassigned"},${formatDate(r.createdAt)}`),
    ];
    const blob = new Blob([lines.join("\\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `unimaintain-report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System summary as of {new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 border border-border rounded px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Printer size={14} /> Print
          </button>
          <button onClick={exportReport}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            style={{ fontFamily: "var(--font-display)" }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Date Filter Panel ─────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-border bg-card/50">
        <div className="flex flex-wrap items-end gap-4">

          {/* Filter type selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Filter By</label>
            <div className="flex rounded overflow-hidden border border-border">
              {(["all","day","month","year","custom"] as const).map(mode => (
                <button key={mode} onClick={() => setFilterMode(mode)}
                  className={`px-3 py-2 text-xs font-semibold capitalize transition-colors border-r border-border last:border-r-0 ${
                    filterMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                  }`} style={{ fontFamily: "var(--font-display)" }}>
                  {mode === "all" ? "All Time" : mode === "custom" ? "Custom Range" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Day picker */}
          {filterMode === "day" && (
            <CalendarPopover
              label="Select Day"
              value={filterDay}
              onChange={setFilterDay}
              mode="single"
            />
          )}

          {/* Month picker */}
          {filterMode === "month" && (
            <MonthPicker
              label="Select Month"
              value={filterMonth}
              onChange={setFilterMonth}
            />
          )}

          {/* Year picker */}
          {filterMode === "year" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Select Year</label>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary transition-colors min-w-[180px]">
                <option value="">Choose year…</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Custom range */}
          {filterMode === "custom" && (
            <CalendarPopover
              label="Select Date Range"
              mode="range"
              rangeValue={{ from: filterFrom, to: filterTo }}
              onRangeChange={(from, to) => { setFilterFrom(from); setFilterTo(to); }}
            />
          )}

          {/* Apply + Clear buttons */}
          <div className="flex items-end gap-2">
            <button onClick={applyFilter}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "var(--font-display)" }}>
              <Filter size={13} /> Apply Filter
            </button>
            {applied !== "all" && (
              <button onClick={clearFilter}
                className="flex items-center gap-1.5 px-4 py-2 border border-border rounded text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Active filter badge */}
        {applied !== "all" && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Showing results for:</span>
            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded" style={{ fontFamily: "var(--font-mono)" }}>
              {filterLabel}
            </span>
            <span className="text-xs text-muted-foreground">— {total} request{total !== 1 ? "s" : ""} found</span>
          </div>
        )}
      </div>

      <div className="px-3 sm:px-8 py-4 sm:py-6 space-y-5 sm:space-y-7">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Requests"    value={total}            icon={<FileText size={18} />} />
          <StatCard label="Resolved"          value={resolved}         icon={<CheckCircle2 size={18} />} />
          <StatCard label="Open Requests"     value={open}             icon={<AlertCircle size={18} />} accent />
          <StatCard label="Resolution Rate"   value={`${resolutionRate}%`} icon={<TrendingUp size={18} />} />
        </div>

        {/* Avg resolution time banner */}
        <div className="bg-primary/5 border border-primary/20 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Average Resolution Time</div>
            <div className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>{avgResolutionDays}</div>
          </div>
          <Clock size={36} className="text-primary/30" />
        </div>

        {/* Monthly trend — CSS bars (no recharts to avoid duplicate key bug) */}
        {monthlyData.length > 0 && (
          <div className="bg-card border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Monthly Requests — Submitted vs Resolved
              </h3>
              <div className="flex items-center gap-4">
                {[["#1A4731","Submitted"],["#C9A227","Resolved"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {(() => {
                const maxVal = Math.max(...monthlyData.flatMap(d => [d.submitted, d.resolved]), 1);
                return monthlyData.map((d, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{d.month}</span>
                      <span className="text-xs text-muted-foreground">{d.submitted} / {d.resolved}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.submitted / maxVal) * 100}%`, background: "#1A4731" }} />
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.resolved / maxVal) * 100}%`, background: "#C9A227" }} />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Category + Priority side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category breakdown */}
          <div className="bg-card border border-border rounded p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Requests by Category</h3>
            <div className="space-y-3">
              {categoryData.map((d, i) => (
                <div key={d.cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      {CATEGORY_CONFIG[d.cat].icon}
                      {d.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{d.count}</span>
                      <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{d.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${d.pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status + Priority */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>Status Breakdown</h3>
              <div className="space-y-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%` }} />
                      </div>
                      <span className="font-semibold text-foreground w-6 text-right" style={{ fontFamily: "var(--font-mono)" }}>{d.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>Priority Distribution</h3>
              <div className="space-y-2">
                {priorityData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${PRIORITY_CONFIG[d.name.toLowerCase() as Priority]?.color ?? "text-muted-foreground"}`}>
                      {d.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%`, background: CHART_COLORS[i] }} />
                      </div>
                      <span className="font-semibold text-foreground w-6 text-right" style={{ fontFamily: "var(--font-mono)" }}>{d.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Officer Performance Table */}
        <div className="bg-card border border-border rounded">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Officer Performance</h3>
          </div>
          {officerStats.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No officer data available.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Officer","Department","Total Assigned","In Progress","Resolved","Avg Resolution Time"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officerStats.map(o => (
                  <tr key={o.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.name} size="sm" />
                        <span className="text-xs font-medium">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.department}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{o.total}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-violet-700">{o.inProgress}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-emerald-700">{o.resolved}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{o.avgDays}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
