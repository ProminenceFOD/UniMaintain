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
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../types";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../lib/constants";
import type { CatConfig } from "../lib/constants";
\nexport function ProfilePage({ user, onSave }: { user: User; onSave: (u: User) => void }) {
  const [form, setForm] = useState({ name: user.name, department: user.department });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...user, name: form.name, department: form.department });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.next.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    // In API mode this would call a change-password endpoint
    setPwSaved(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwSaved(false), 2500);
  }

  const ROLE_LABEL: Record<string, string> = {
    student: "Student", staff: "Staff",
    officer: "Maintenance Officer", admin: "Administrator",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account details</p>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-xl">
        {/* Avatar + role */}
        <div className="bg-card border border-border rounded p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ fontFamily: "var(--font-display)" }}>
            {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {user.name}
            </div>
            <div className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              {user.email}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                user.role === "admin"   ? "bg-primary/10 text-primary" :
                user.role === "officer" ? "bg-amber-50 text-amber-800" :
                user.role === "staff"   ? "bg-blue-50 text-blue-800" :
                "bg-muted text-muted-foreground"
              }`} style={{ fontFamily: "var(--font-mono)" }}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              <span className="text-xs text-muted-foreground">· Joined {formatDate(user.joinedAt)}</span>
            </div>
          </div>
        </div>

        {/* Edit profile */}
        <div className="bg-card border border-border rounded">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Personal Information</h3>
          </div>
          <form onSubmit={handleProfile} className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Email</label>
              <input value={user.email} disabled
                className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Department</label>
              <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                placeholder="Your department"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="submit"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>
                Save Changes
              </button>
              {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} /> Saved!</span>}
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Change Password</h3>
          </div>
          <form onSubmit={handlePassword} className="px-5 py-5 space-y-4">
            {[
              { label: "Current Password", key: "current", placeholder: "••••••••" },
              { label: "New Password",     key: "next",    placeholder: "Min. 6 characters" },
              { label: "Confirm Password", key: "confirm", placeholder: "Re-enter new password" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type="password" value={(pwForm as any)[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>
                Update Password
              </button>
              {pwSaved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} /> Password updated!</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}\n