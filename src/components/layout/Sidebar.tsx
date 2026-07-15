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
\nexport function Sidebar({ user, activeTab, onTab, open, onClose, collapsed, onToggleCollapse }: {
  user: User; activeTab: string; onTab: (t: string) => void;
  open: boolean; onClose: () => void;
  collapsed: boolean; onToggleCollapse: () => void;
}) {
  const studentLinks = [
    { id: "overview", icon: <Home size={15} />,      label: "Dashboard" },
    { id: "requests", icon: <FileText size={15} />,  label: "My Requests" },
  ];
  const officerLinks = [
    { id: "overview",  icon: <Home size={15} />,       label: "Dashboard" },
    { id: "tasks",     icon: <Layers size={15} />,     label: "Assigned Tasks" },
    { id: "completed", icon: <CheckCheck size={15} />, label: "Completed" },
  ];
  const adminLinks = [
    { id: "overview",     icon: <Home size={15} />,          label: "Overview" },
    { id: "requests",     icon: <FileText size={15} />,      label: "All Requests" },
    { id: "users",        icon: <Users size={15} />,         label: "User Management" },
    { id: "analytics",    icon: <BarChart2 size={15} />,     label: "Analytics" },
    { id: "reports",      icon: <ClipboardList size={15} />, label: "Reports" },
    { id: "settings",     icon: <Settings size={15} />,      label: "Site Settings" },
    { id: "api-reference",icon: <Code size={15} />,          label: "API Reference" },
  ];
  const links = ["student","staff"].includes(user.role) ? studentLinks : user.role === "officer" ? officerLinks : adminLinks;

  return (
    <div className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto flex-shrink-0 bg-primary flex flex-col h-full transition-all duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "lg:w-16 w-64" : "w-64 lg:w-56"}`}>
      <div className="p-4 border-b border-white/10 relative">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center w-full" : ""}`}>
            <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <Wrench size={13} className="text-white" />
            </div>
            {!collapsed && (
              <span className="text-white font-bold text-sm tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                UniMaintain
              </span>
            )}
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary border border-white/20 rounded-full items-center justify-center text-white/70 hover:text-white hover:bg-primary/80 transition-all z-10">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      <div className={`py-4 flex-1 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && (
          <div className="mb-2 px-2">
            <span className="text-white/30 text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              {user.role === "student" ? "Student" : user.role === "staff" ? "Staff" : user.role === "officer" ? "Officer" : "Admin"}
            </span>
          </div>
        )}
        <nav className="space-y-0.5">
          {links.map(l => (
            <button key={l.id} onClick={() => {
                if (l.id === "api-reference") {
                  window.open("https://unimaintain-backend.onrender.com/api/docs", "_blank");
                  return;
                }
                onTab(l.id); onClose();
              }}
              title={collapsed ? l.label : undefined}
              className={`w-full flex items-center rounded text-sm font-medium transition-all text-left ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
              } ${
                activeTab === l.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}>
              {l.icon}
              {!collapsed && l.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom padding so nav doesn't cut off abruptly */}
      <div className="pb-4" />
    </div>
  );
}\n