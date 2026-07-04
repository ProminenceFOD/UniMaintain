import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { injectFavicon } from "./favicon";
import { io as socketIO } from "socket.io-client";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
// ─── Extracted modules ────────────────────────────────────────────────────────
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../types";
import { USERS, INITIAL_REQUESTS, INITIAL_NOTIFICATIONS } from "../data/mockData";
import { initials, formatDate, formatDateTime, generateId, exportCSV } from "../lib/utils";
import {
  DEMO_USER_KEY, DEMO_REQUESTS_KEY, DEMO_USERS_KEY, DEMO_NOTIFICATIONS_KEY,
  saveDemoSession, loadDemoSession, clearDemoUser, clearAllDemoData,
} from "../lib/session";
import {
  apiLogin, apiRegister, apiGetMe, apiGetRequests, apiGetRequest,
  apiCreateRequest, apiUpdateStatus, apiAssignOfficer, apiGetStats,
  apiGetUsers, apiGetOfficers, apiToggleUser,
  apiGetNotifications, apiMarkRead, apiMarkAllRead,
  saveToken, clearToken,
  type ApiUser, type ApiRequest, type ApiNotification,
} from "../lib/api";
import {
  Bell, Search, LogOut, Plus, Download, X, Zap, Wifi, Menu, UserPlus, EyeOff, ArrowLeft,
  Droplets, Package, Wrench, Wind, CheckCircle2, Clock,
  AlertTriangle, AlertCircle, Users, BarChart2, Eye,
  Home, FileText, Shield, MapPin, Paperclip, ChevronDown,
  ChevronLeft, ChevronRight, UserCheck, ArrowUpRight,
  Send, Building2, Edit2, CheckCheck, Circle, Filter, Check, Copy,
  RefreshCw, Layers, ClipboardList, TrendingUp, Printer, Code, Settings,
  MessageSquare, Image as ImageIcon, Calendar, Activity, Sparkles, Key,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────




// ─── CONFIG ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: "Pending",     bg: "bg-amber-50",  text: "text-amber-800",  dot: "bg-amber-400" },
  assigned:    { label: "Assigned",    bg: "bg-blue-50",   text: "text-blue-800",   dot: "bg-blue-500" },
  in_progress: { label: "In Progress", bg: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500" },
  resolved:    { label: "Resolved",    bg: "bg-emerald-50",  text: "text-emerald-800", dot: "bg-emerald-500" },
  closed:      { label: "Closed",      bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400" },
  cancelled:   { label: "Cancelled",   bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-400" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "text-gray-500" },
  medium: { label: "Medium", color: "text-blue-600" },
  high:   { label: "High",   color: "text-orange-600" },
  urgent: { label: "Urgent", color: "text-red-600" },
};

type CatConfig = { label: string; icon: React.ReactNode };
const CATEGORY_CONFIG: Record<Category, CatConfig> = {
  electricity: { label: "Electricity", icon: <Zap size={14} /> },
  plumbing:    { label: "Plumbing",    icon: <Droplets size={14} /> },
  furniture:   { label: "Furniture",   icon: <Package size={14} /> },
  internet:    { label: "Internet",    icon: <Wifi size={14} /> },
  hvac:        { label: "HVAC",        icon: <Wind size={14} /> },
  other:       { label: "Other",       icon: <Wrench size={14} /> },
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

function PriorityLabel({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span className={`text-xs font-semibold uppercase tracking-widest ${c.color}`}
      style={{ fontFamily: "var(--font-mono)" }}>
      {c.label}
    </span>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-sm" };
  return (
    <div className={`${sizes[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ fontFamily: "var(--font-display)" }}>
      {initials(name)}
    </div>
  );
}

function CategoryTag({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category as Category];
  // For custom categories stored by ID (e.g. "c7"), look up name from localStorage
  const customLabel = (() => {
    if (c) return null;
    try {
      const saved = localStorage.getItem("unimaintain_categories");
      if (!saved) return null;
      const items = JSON.parse(saved) as { id: string; name: string }[];
      return items.find(i => i.id === category)?.name ?? category;
    } catch { return category; }
  })();
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {c?.icon ?? <Layers size={12} />} {c?.label ?? customLabel}
    </span>
  );
}

function StatCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`bg-card border border-border rounded p-5 flex items-start gap-4 ${accent ? "border-l-2 border-l-accent" : ""}`}>
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onGoRegister, apiMode }: {
  onLogin: (user: User) => void;
  onGoRegister: () => void;
  apiMode: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      if (apiMode) {
        const { token, user } = await apiLogin(email, password);
        saveToken(token);
        onLogin({
          id: String(user.id), name: user.name, email: user.email,
          role: user.role, department: user.department,
          joinedAt: user.created_at?.split("T")[0] ?? "2026-01-01", active: user.active,
        });
      } else {
        const user = USERS.find(u => u.email === email);
        if (!user) { setError("No account found with that email address."); return; }
        onLogin(user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const demos: Array<{ label: string; role: string; userId: string }> = [
    { label: "Student",     role: "student", userId: "u1"  },
    { label: "Staff",       role: "staff",   userId: "u10" },
    { label: "Officer",     role: "officer", userId: "u5"  },
    { label: "Admin",       role: "admin",   userId: "u8"  },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Forgot Password Modal */}
      {showForgotPw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForgotPw(false)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  Password Reset
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To reset your password, please contact your system administrator or the IT help desk at{" "}
                  <span className="font-medium text-foreground">support@university.edu</span>
                </p>
              </div>
            </div>
            <div className="bg-muted/50 border border-border rounded p-3 mb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">For demo accounts:</span> All demo credentials use the password{" "}
                <code className="bg-background px-1.5 py-0.5 rounded text-primary font-mono">password123</code>
              </p>
            </div>
            <button
              onClick={() => setShowForgotPw(false)}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
              style={{ fontFamily: "var(--font-display)" }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <Wrench size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              UniMaintain
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Campus Maintenance<br />Request System
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Submit, track, and manage facility maintenance requests across all campus buildings and departments.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: <Shield size={14} />, text: "Role-based access control for all user types" },
            { icon: <CheckCircle2 size={14} />, text: "Real-time request tracking with full audit trail" },
            { icon: <BarChart2 size={14} />, text: "Analytics dashboard and data export" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-white/70 text-sm">
              <div className="text-white/50">{f.icon}</div>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile-only — clean minimal header */}
          <div className="lg:hidden mb-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-5">
              <Wrench size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              UniMaintain
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Report. Track. Resolve.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Sign in
            </h2>
            <p className="text-muted-foreground text-sm">Welcome back to UniMaintain</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-card border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Password <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPw(true)}
                  className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 bg-card border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: "var(--font-display)" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Click to fill demo account</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {demos.map(d => {
                const user = USERS.find(u => u.id === d.userId)!;
                const isSelected = email === user.email;
                return (
                  <button key={d.userId} type="button"
                    onClick={() => {
                      setEmail(user.email);
                      setPassword("password123");
                      setError("");
                    }}
                    disabled={loading}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded border transition-all text-center disabled:opacity-50 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/40 hover:bg-secondary"
                    }`}>
                    <Avatar name={user.name} size="sm" />
                    <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {d.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">{user.name}</span>
                  </button>
                );
              })}
            </div>
            {/* Hint when a demo account is selected */}
            {demos.some(d => USERS.find(u => u.id === d.userId)?.email === email) && (
              <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <CheckCircle2 size={11} className="text-primary" />
                Credentials filled — click <span className="font-semibold text-foreground mx-1">Sign In</span> to continue
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            No account?{" "}
            <button onClick={onGoRegister} className="text-primary font-medium hover:underline">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER SCREEN ──────────────────────────────────────────────────────────

function RegisterScreen({ onBack, onRegister, apiMode }: {
  onBack: () => void;
  onRegister: (user: User) => void;
  apiMode: boolean;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "" as Role | "", department: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength and requirements
  const passwordRequirements = {
    minLength: form.password.length >= 8,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /\d/.test(form.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };

  const getPasswordStrength = (): { level: number; label: string; color: string } => {
    const pwd = form.password;
    if (!pwd) return { level: 0, label: "", color: "" };
    let strength = 0;
    if (passwordRequirements.minLength) strength++;
    if (passwordRequirements.hasUpper && passwordRequirements.hasLower) strength++;
    if (passwordRequirements.hasNumber) strength++;
    if (passwordRequirements.hasSpecial) strength++;
    
    if (strength <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (strength === 2) return { level: 2, label: "Fair", color: "bg-orange-500" };
    if (strength === 3) return { level: 3, label: "Good", color: "bg-yellow-500" };
    return { level: 4, label: "Strong", color: "bg-emerald-500" };
  };

  const passwordStrength = getPasswordStrength();
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  // Check if signups are disabled in Site Settings
  const signupsBlocked = (() => {
    try {
      const s = localStorage.getItem("unimaintain_site_settings");
      if (!s) return false;
      return JSON.parse(s).allowSignups === false;
    } catch { return false; }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name)       { setError("Full name is required."); return; }
    if (!form.email)      { setError("Email address is required."); return; }
    if (!form.password)   { setError("Password is required."); return; }
    if (!passwordRequirements.minLength) { setError("Password must be at least 8 characters."); return; }
    if (!passwordRequirements.hasUpper) { setError("Password must contain at least one uppercase letter."); return; }
    if (!passwordRequirements.hasLower) { setError("Password must contain at least one lowercase letter."); return; }
    if (!passwordRequirements.hasNumber) { setError("Password must contain at least one number."); return; }
    if (!passwordRequirements.hasSpecial) { setError("Password must contain at least one special character."); return; }
    if (!form.role)       { setError("Please select your role."); return; }
    if (!form.department) { setError("Department is required."); return; }

    setLoading(true); setError("");
    try {
      if (apiMode) {
        const { token, user } = await apiRegister({ ...form, role: form.role as Role });
        saveToken(token);
        onRegister({
          id: String(user.id), name: user.name, email: user.email,
          role: user.role, department: user.department,
          joinedAt: user.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          active: user.active,
        });
      } else {
        const newUser: User = {
          id: `u${Date.now()}`,
          name: form.name,
          email: form.email,
          role: form.role as Role,
          department: form.department,
          joinedAt: new Date().toISOString().split("T")[0],
          active: true,
        };
        onRegister(newUser);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }


  if (signupsBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-6">
            <Shield size={28} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Registrations Closed
          </h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            New user registration is currently disabled by the system administrator. Please contact the admin office to request an account.
          </p>
          <button onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5 sm:p-8">
      <div className="w-full max-w-sm">

        {/* Mobile-only branding — register screen */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-5">
            <UserPlus size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            UniMaintain
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">Join your campus community.</p>
        </div>

        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft size={16} /> Back to sign in
        </button>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Create account</h2>
        <p className="text-muted-foreground text-sm mb-8">Register for UniMaintain access</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Full Name",       key: "name",       type: "text",     placeholder: "e.g. Damilola Ogunlade" },
            { label: "Email Address",   key: "email",      type: "email",    placeholder: "you@university.edu" },
            { label: "Password",        key: "password",   type: "password", placeholder: "Min. 8 characters" },
            { label: "Department",      key: "department", type: "text",     placeholder: "e.g. Computer Science" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">
                {f.label} <span className="text-destructive">*</span>
              </label>
              {f.type === "password" ? (
                <div>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 pr-10 bg-card border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                      placeholder={f.placeholder}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {form.password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Password Strength:</span>
                        <span className={`text-xs font-semibold ${
                          passwordStrength.level <= 2 ? "text-red-600" : 
                          passwordStrength.level === 3 ? "text-yellow-600" : "text-emerald-600"
                        }`}>{passwordStrength.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              i <= passwordStrength.level ? passwordStrength.color : "bg-muted"
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Password Requirements */}
                  {form.password && (
                    <div className="mt-3 p-3 bg-muted/50 border border-border rounded-lg space-y-1.5">
                      <p className="text-xs font-semibold text-foreground mb-2">Password Requirements:</p>
                      {[
                        { met: passwordRequirements.minLength, text: "At least 8 characters" },
                        { met: passwordRequirements.hasUpper, text: "One uppercase letter (A-Z)" },
                        { met: passwordRequirements.hasLower, text: "One lowercase letter (a-z)" },
                        { met: passwordRequirements.hasNumber, text: "One number (0-9)" },
                        { met: passwordRequirements.hasSpecial, text: "One special character (!@#$%...)" },
                      ].map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {req.met ? (
                            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Circle size={14} className="text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={`text-xs ${req.met ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}

          {/* Role selector — dropdown with placeholder */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value as Role | "" }))}
              className={`w-full px-3 py-2.5 bg-card border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors ${
                !form.role ? "text-muted-foreground" : "text-foreground"
              } border-border`}>
              <option value="" disabled>Select your role…</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="officer">Maintenance Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors mt-2 disabled:opacity-60"
            style={{ fontFamily: "var(--font-display)" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ user, activeTab, onTab, open, onClose, collapsed, onToggleCollapse }: {
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
}

// ─── HEADER ───────────────────────────────────────────────────────────────────

function Header({ user, notifications, onBell, showNotif, onCloseNotif, onMarkRead, onMarkAllRead, globalSearch, onSearch, onToggleSidebar, onNotifClick, onGoToProfile, onLogoutFromHeader }: {
  user: User; notifications: Notification[];
  onBell: () => void; showNotif: boolean; onCloseNotif: () => void;
  onMarkRead: (id: string) => void; onMarkAllRead: () => void;
  globalSearch: string; onSearch: (v: string) => void;
  onNotifClick: (n: Notification) => void;
  onToggleSidebar: () => void;
  onGoToProfile: () => void;
  onLogoutFromHeader: () => void;
}) {
  const mine = notifications.filter(n => n.userId === user.id);
  const unread = mine.filter(n => !n.read).length;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1 max-w-xs min-w-0">
          <Search size={14} className="text-muted-foreground flex-shrink-0 hidden sm:block" />
          <input
            value={globalSearch} onChange={e => onSearch(e.target.value)}
            placeholder="Search requests…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 min-w-0" />
          {globalSearch && (
            <button onClick={() => onSearch("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        <button onClick={onBell}
          className="relative p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center leading-none font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowUserMenu(p => !p)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
            <Avatar name={user.name} size="sm" />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{user.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
            </div>
            <ChevronDown size={12} className="text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-52 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <div className="text-xs font-semibold text-foreground truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</div>
              </div>
              <div className="py-1">
                <button onClick={() => { setShowUserMenu(false); onGoToProfile(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors text-left">
                  <Shield size={13} className="text-muted-foreground" /> My Profile
                </button>
                <div className="h-px bg-border mx-3 my-1" />
                <button onClick={() => { setShowUserMenu(false); onLogoutFromHeader(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {showNotif && (
          <div className="absolute top-11 right-0 w-[calc(100vw-1.5rem)] sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={onMarkAllRead}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button onClick={onCloseNotif} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[26rem] overflow-y-auto divide-y divide-border">
              {mine.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">All caught up</p>
                  <p className="text-xs text-muted-foreground">No notifications yet.</p>
                </div>
              ) : mine.map(n => {
                // Pick icon by title keyword
                const icon = n.title.toLowerCase().includes("resolv") ? (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                ) : n.title.toLowerCase().includes("assign") ? (
                  <UserCheck size={14} className="text-primary" />
                ) : n.title.toLowerCase().includes("urgent") || n.title.toLowerCase().includes("high") ? (
                  <AlertTriangle size={14} className="text-destructive" />
                ) : n.title.toLowerCase().includes("receiv") || n.title.toLowerCase().includes("new") ? (
                  <Plus size={14} className="text-accent" />
                ) : (
                  <Bell size={14} className="text-muted-foreground" />
                );

                // Relative timestamp
                const relTime = (() => {
                  const diff = Date.now() - new Date(n.timestamp).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  if (days === 1) return "yesterday";
                  if (days < 7) return `${days}d ago`;
                  return formatDate(n.timestamp);
                })();

                return (
                  <div key={n.id} onClick={() => onNotifClick(n)}
                    className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${
                      n.read ? "hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/10"
                    }`}>
                    {/* Unread left bar */}
                    {!n.read && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-full" />}

                    {/* Icon bubble */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                      n.read ? "bg-muted" : "bg-card border border-border shadow-sm"
                    }`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-muted-foreground/70 flex-shrink-0 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                          {relTime}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      {n.requestId && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary font-medium group-hover:underline" style={{ fontFamily: "var(--font-mono)" }}>
                          {n.requestId} <ArrowUpRight size={10} />
                        </span>
                      )}
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {mine.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
                <span className="text-xs text-muted-foreground">
                  {mine.filter(n => n.read).length} of {mine.length} read
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REQUEST DETAIL PANEL ─────────────────────────────────────────────────────

function RequestDetail({ request, currentUser, onClose, onStatusUpdate, onDelete, onAssign, officers, onAddComment }: {
  request: Request; currentUser: User; onClose: () => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  onDelete: (id: string) => void;
  onAssign: (requestId: string, officerId: string) => void;
  officers: User[];
  onAddComment?: (requestId: string, message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(true);

  const isMyRequest = ["student","staff"].includes(currentUser.role) && request.submittedBy === currentUser.id;
  const isMyTask    = currentUser.role === "officer"  && request.assignedTo  === currentUser.id;

  function nextStatus(): Status | null {
    if (isMyRequest) {
      if (request.status === "pending")  return "cancelled"; // cancel
      if (request.status === "resolved") return "closed"; // acknowledge
    }
    if (isMyTask) {
      if (request.status === "assigned")    return "in_progress";
      if (request.status === "in_progress") return "resolved";
    }
    if (currentUser.role === "admin" && request.status === "resolved") return "closed";
    return null;
  }

  const next = nextStatus();

  const ACTION_LABEL: Record<string, string> = {
    in_progress: "Start Work",
    resolved:    "Mark Resolved",
    cancelled:   "Cancel Request",
    closed:      isMyRequest && request.status === "resolved"
                   ? "Acknowledge & Close"
                   : "Close Request",
  };

  const ACTION_STYLE: Record<string, string> = {
    in_progress: "bg-primary text-primary-foreground hover:bg-primary/90",
    resolved:    "bg-emerald-600 text-white hover:bg-emerald-700",
    cancelled:   "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    closed:      "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full sm:w-[480px] bg-card flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{request.id}</span>
            <h3 className="text-sm font-semibold text-foreground mt-0.5" style={{ fontFamily: "var(--font-display)" }}>
              Request Details
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {request.title}
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge status={request.status} />
              <PriorityLabel priority={request.priority} />
              <CategoryTag category={request.category} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</div>
              <div className="flex items-start gap-1.5">
                <MapPin size={13} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground">{request.location}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Submitted</div>
              <div className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(request.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Submitted by</div>
              <div className="flex items-center gap-1.5">
                <Avatar name={request.submittedByName} size="sm" />
                <span className="text-xs text-foreground">{request.submittedByName}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assigned to</div>
              {request.assignedToName ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={request.assignedToName} size="sm" />
                  <span className="text-xs text-foreground">{request.assignedToName}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>
          </div>

          {request.hasAttachment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2.5">
              <Paperclip size={13} />
              <span>Attachments included with this request</span>
            </div>
          )}

          {/* Feedback rating — visible to admin/officer when request is closed */}
          {["admin","officer"].includes(currentUser.role) && request.status === "closed" && (() => {
            const feedbackEntry = request.audit.find(a => a.details?.includes("Rating:"));
            if (!feedbackEntry) return null;
            const match = feedbackEntry.details.match(/Rating: (★+)(☆*)/);
            const commentMatch = feedbackEntry.details.match(/— "(.+)"$/);
            const stars = match ? match[1].length : 0;
            const comment = commentMatch ? commentMatch[1] : null;
            if (stars === 0) return null;
            return (
              <div className="bg-amber-50 border border-amber-100 rounded p-3.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                  Requester Feedback
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={s <= stars ? "#C9A227" : "none"}
                        stroke={s <= stars ? "#C9A227" : "#CBD5E1"}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  ))}
                  <span className="text-xs text-amber-700 ml-1 font-medium">{stars}/5</span>
                </div>
                {comment && (
                  <p className="text-xs text-amber-800 italic">"{comment}"</p>
                )}
                <div className="text-xs text-amber-600/70 mt-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatDate(feedbackEntry.timestamp)}
                </div>
              </div>
            );
          })()}

          {/* Comments/Updates Section */}
          {request.status !== "cancelled" && request.status !== "closed" && (
            <div>
              <button
                onClick={() => setShowComments(p => !p)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
              >
                <MessageSquare size={14} />
                Updates & Communication
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {(request.comments ?? []).length}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
              </button>

              {showComments && (
                <div className="space-y-3">
                  {/* Comment list */}
                  {(request.comments ?? []).length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(request.comments ?? []).map((comment) => (
                        <div key={comment.id} className="bg-muted/40 rounded p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={comment.userName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{comment.userName}</span>
                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                  comment.userRole === "officer" ? "bg-amber-100 text-amber-700" :
                                  comment.userRole === "admin" ? "bg-primary/10 text-primary" :
                                  "bg-muted text-muted-foreground"
                                }`} style={{ fontFamily: "var(--font-mono)" }}>
                                  {comment.userRole}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                                {formatDateTime(comment.timestamp)}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed pl-9">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment form */}
                  {onAddComment && (
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add an update or ask a question…"
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (!newComment.trim()) return;
                          onAddComment(request.id, newComment);
                          setNewComment("");
                        }}
                        disabled={!newComment.trim()}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Send size={11} /> Post Update
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audit Timeline — staff/admin only */}
          {currentUser.role !== "student" && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Log</div>
              <div className="space-y-3">
                {request.audit.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary" style={{ fontSize: 8 }}>●</span>
                      </div>
                      {i < request.audit.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                          {entry.action}
                        </span>
                        <span className="text-xs text-muted-foreground">by {entry.performedByName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                      <div className="text-xs text-muted-foreground/60 mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                        {formatDateTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students see a simple status timeline instead */}
          {["student","staff"].includes(currentUser.role) && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Request Status</div>
              {request.status === "cancelled" ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded">
                  <span className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center flex-shrink-0">
                    <X size={12} className="text-red-600" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-red-700">Request Cancelled</div>
                    <div className="text-xs text-red-500 mt-0.5">You cancelled this request.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(["pending","assigned","in_progress","resolved","closed","cancelled"] as Status[]).map((s) => {
                    const statusOrder = ["pending","assigned","in_progress","resolved","closed"];
                    const currentIdx = statusOrder.indexOf(request.status);
                    const stepIdx    = statusOrder.indexOf(s);
                    const isDone     = stepIdx <= currentIdx;
                    const isCurrent  = s === request.status;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                          isCurrent ? "border-primary bg-primary" :
                          isDone    ? "border-primary bg-primary/20" :
                                      "border-border bg-background"
                        }`}>
                          {isDone && !isCurrent && <CheckCircle2 size={12} className="text-primary" />}
                          {isCurrent && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`text-xs font-medium ${isCurrent ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                          {STATUS_CONFIG[s].label}
                        </span>
                        {isCurrent && <StatusBadge status={s} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-border">

          {/* Admin: assign officer */}
          {currentUser.role === "admin" && !["resolved","closed","cancelled"].includes(request.status) && (
            <div className="px-6 py-3 border-b border-border space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Officer</div>
              <div className="flex gap-2">
                <select value={assignId} onChange={e => setAssignId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-primary transition-colors">
                  <option value="">Select officer…</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name} — {o.department}</option>
                  ))}
                </select>
                <button disabled={!assignId}
                  onClick={() => { onAssign(request.id, assignId); setAssignId(""); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Assign
                </button>
              </div>
            </div>
          )}

          {/* Primary status action */}
          {next && (
            <div className="px-6 py-4 space-y-3">
              {!(isMyRequest && request.status === "resolved") && (
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)…"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  rows={2}
                />
              )}
              <button onClick={() => {
                  if (next === "cancelled") { setShowCancelConfirm(true); return; }
                  if (next === "closed" && isMyRequest && request.status === "resolved") { setShowFeedback(true); return; }
                  onStatusUpdate(request.id, next, note || ACTION_LABEL[next]); onClose();
                }}
                className={`w-full py-2.5 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${ACTION_STYLE[next]}`}
                style={{ fontFamily: "var(--font-display)" }}>
                <Send size={14} />
                {ACTION_LABEL[next]}
              </button>
            </div>
          )}

          {/* Admin: delete request */}
          {currentUser.role === "admin" && (
            <div className="px-6 pb-4">
              {confirmDelete ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium">Permanently delete this request?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => { onDelete(request.id); onClose(); }}
                      className="flex-1 py-1.5 bg-destructive text-destructive-foreground rounded text-xs font-semibold hover:bg-destructive/90 transition-colors">
                      Yes, Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-xs text-destructive hover:underline">
                  Delete this request
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <CancelConfirmModal
          requestId={request.id}
          onConfirm={() => { onStatusUpdate(request.id, "cancelled", "Request cancelled by submitter."); onClose(); }}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}

      {/* Feedback/rating modal on acknowledge */}
      {showFeedback && (
        <FeedbackModal
          requestId={request.id}
          onSubmit={(rating, comment) => {
            const feedback = `Acknowledged. Rating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}${comment ? ` — "${comment}"` : ""}`;
            onStatusUpdate(request.id, "closed", feedback);
            onClose();
          }}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

// ─── NEW REQUEST MODAL ────────────────────────────────────────────────────────

function NewRequestModal({ currentUser, onClose, onSubmit, apiMode, existingRequests }: {
  currentUser: User; onClose: () => void;
  onSubmit: (req: Request) => void;
  apiMode: boolean;
  existingRequests: Request[];
}) {
  const [form, setForm] = useState({
    title: "", description: "", category: "" as string,
    priority: "medium" as Priority, building: "", room: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileObjects, setFileObjects] = useState<File[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function touch(field: string) { setTouched(p => ({ ...p, [field]: true })); }
  function fieldError(field: string) {
    if (!touched[field]) return false;
    return !(form as any)[field];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ title: true, category: true, building: true, description: true });
    if (!form.title || !form.category || !form.building || !form.description) {
      setError("Please complete all required fields."); return;
    }
    setLoading(true); setError("");
    const location = `${form.building}${form.room ? ` — ${form.room}` : ""}`;

    try {
      if (apiMode) {
        const { request } = await apiCreateRequest({
          title: form.title, description: form.description,
          category: form.category as string, priority: form.priority,
          location, files: fileObjects,
        });
        const now = new Date().toISOString();
        onSubmit({
          id: request.id, title: request.title, description: request.description,
          category: (request.category as Category) || "other",
          priority: (request.priority as Priority) || "medium",
          status: "pending", location: request.location,
          submittedBy: currentUser.id, submittedByName: currentUser.name, submittedByRole: currentUser.role,
          createdAt: request.createdAt, updatedAt: request.updatedAt,
          hasAttachment: request.hasAttachment,
          audit: [{ id: "init", action: "Request Submitted", performedByName: currentUser.name,
            details: "Submitted via portal.", timestamp: now }],
        });
      } else {
        const now = new Date().toISOString();
        onSubmit({
          id: generateId(existingRequests), title: form.title, description: form.description,
          category: form.category as Category, priority: form.priority,
          status: "pending", location,
          submittedBy: currentUser.id, submittedByName: currentUser.name, submittedByRole: currentUser.role,
          createdAt: now, updatedAt: now, hasAttachment: files.length > 0,
          audit: [{ id: `init-${Date.now()}`, action: "Request Submitted", performedByName: currentUser.name,
            details: `Submitted via portal${files.length > 0 ? ` with ${files.length} attachment(s)` : ""}.`, timestamp: now }],
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  // Load custom categories from Site Settings (falls back to defaults)
  const categories: { value: string; label: string }[] = (() => {
    try {
      const saved = localStorage.getItem("unimaintain_categories");
      if (saved) {
        const items = JSON.parse(saved) as { id: string; name: string; desc: string }[];
        return items.map(c => ({ value: c.id, label: c.name }));
      }
    } catch { /* ignore */ }
    // Default fallback matches CATEGORY_CONFIG
    return [
      { value: "electricity", label: "Electricity" },
      { value: "plumbing",    label: "Plumbing" },
      { value: "furniture",   label: "Furniture" },
      { value: "internet",    label: "Internet / IT" },
      { value: "hvac",        label: "HVAC" },
      { value: "other",       label: "Other" },
    ];
  })();
  const priorities: Priority[] = ["low", "medium", "high", "urgent"];
  const buildings = [
    "Engineering Block A", "Engineering Block B", "Block B", "Block C",
    "Main Building", "Humanities Block", "Science Block", "Main Library",
    "Student Residence Hall", "Sports Complex",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-xl rounded-t-xl sm:rounded shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            New Maintenance Request
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Request Title <span className="text-destructive">*</span>
            </label>
            <input type="text" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onBlur={() => touch("title")}
              placeholder="Brief description of the issue"
              className={`w-full px-3 py-2.5 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors ${
                fieldError("title") ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {fieldError("title") && <p className="text-xs text-destructive mt-1">Title is required.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
              Category <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const knownConfig = CATEGORY_CONFIG[cat.value as Category];
                return (
                  <button key={cat.value} type="button"
                    onClick={() => { setForm(p => ({ ...p, category: cat.value as Category })); touch("category"); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-all ${
                      form.category === cat.value
                        ? "border-primary bg-primary/5 text-primary"
                        : touched.category && !form.category
                        ? "border-destructive/50 text-muted-foreground hover:border-destructive/80"
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                    }`}>
                    {knownConfig?.icon ?? <Layers size={14} />} {cat.label}
                  </button>
                );
              })}
            </div>
            {touched.category && !form.category && (
              <p className="text-xs text-destructive mt-1">Please select a category.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {priorities.map(p => {
                const pc = PRIORITY_CONFIG[p];
                return (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={`py-2 rounded border text-xs font-semibold transition-all uppercase tracking-wide ${
                      form.priority === p ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-muted-foreground/40"
                    }`}
                    style={{ fontFamily: "var(--font-mono)" }}>
                    {pc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                Building <span className="text-destructive">*</span>
              </label>
              <select value={form.building}
                onChange={e => setForm(p => ({ ...p, building: e.target.value }))}
                onBlur={() => touch("building")}
                className={`w-full px-3 py-2.5 bg-background border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors ${
                  fieldError("building") ? "border-destructive" : "border-border focus:border-primary"
                }`}>
                <option value="">Select building</option>
                {buildings.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {fieldError("building") && <p className="text-xs text-destructive mt-1">Building is required.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Room / Area</label>
              <input type="text" value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                placeholder="e.g. Lab 304, Floor 2"
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onBlur={() => touch("description")}
              placeholder="Describe the issue in detail — include when it started, severity, and impact on activities…"
              rows={4}
              className={`w-full px-3 py-2.5 bg-background border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors ${
                fieldError("description") ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {fieldError("description") && <p className="text-xs text-destructive mt-1">Description is required.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Attachments</label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors w-full justify-center">
              <Paperclip size={14} /> Click to attach photos or documents
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf"
              className="hidden"
              onChange={e => {
                const selected = Array.from(e.target.files ?? []);
                setFileObjects(selected);
                setFiles(selected.map(f => f.name));
              }}
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map(f => (
                  <div key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Paperclip size={11} /> {f}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ fontFamily: "var(--font-display)" }}>
            <Send size={14} /> {loading ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REQUEST TABLE ────────────────────────────────────────────────────────────

function RequestTable({ requests, onSelect, showAssign, officers, onAssign, hideRequester, users }: {
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
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function Pagination({ page, total, perPage, onPage }: {
  page: number; total: number; perPage: number; onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
      <span>
        {total === 0 ? "0" : `${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)}`} of {total}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(page - 1)} disabled={page === 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
            let p = i + 1;
            if (pages > 5) {
              if (page <= 3) p = i + 1;
              else if (page >= pages - 2) p = pages - 4 + i;
              else p = page - 2 + i;
            }
            return (
              <button key={p} onClick={() => onPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => onPage(page + 1)} disabled={page === pages}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── FILTERS BAR ──────────────────────────────────────────────────────────────

function FiltersBar({ search, setSearch, statusFilter, setStatusFilter, categoryFilter, setCategoryFilter }: {
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  categoryFilter: string; setCategoryFilter: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2 flex-1 min-w-48">
        <Search size={13} className="text-muted-foreground flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or ID…"
          className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
        />
      </div>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        className="bg-card border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer">
        <option value="">All Statuses</option>
        {(["pending","assigned","in_progress","resolved","closed","cancelled"] as Status[]).map(s => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
        className="bg-card border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer">
        <option value="">All Categories</option>
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map(c => (
          <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────

function StudentDashboard({ user, requests, onNewRequest, onSelect, globalSearch, activeTab, onTabChange }: {
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
              {activeTab === "requests" ? "My Requests" : `Good morning, ${user.name.split(" ")[0]}`}
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
              <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 size={18} />} />
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
                                <CheckCircle2 size={12} /> Acknowledge
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

// ─── OFFICER DASHBOARD ────────────────────────────────────────────────────────

function OfficerTaskTable({ requests, onSelect, onStatusUpdate, emptyLabel }: {
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

function OfficerDashboard({ user, requests, onSelect, onStatusUpdate, activeTab, globalSearch }: {
  user: User; requests: Request[]; onSelect: (r: Request) => void;
  onStatusUpdate: (id: string, status: Status, note: string) => void;
  activeTab: string; globalSearch: string;
}) {
  const assigned  = requests.filter(r => r.assignedTo === user.id && ["assigned","in_progress"].includes(r.status));
  const completed = requests.filter(r => r.assignedTo === user.id && ["resolved","closed"].includes(r.status));

  // Apply global search to assigned tasks tab
  const assignedFiltered = useMemo(() => {
    const q = globalSearch.toLowerCase();
    return !q ? assigned : assigned.filter(r => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [assigned, globalSearch]);

  const urgentTasks   = assigned.filter(r => ["urgent","high"].includes(r.priority));
  const completedToday = completed.filter(r => r.resolvedAt && new Date(r.resolvedAt).toDateString() === new Date().toDateString()).length;

  const pageTitle: Record<string, string> = {
    overview:  `Good morning, ${user.name.split(" ")[0]}`,
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
              <StatCard label="Awaiting Start"  value={assigned.filter(r => r.status === "assigned").length}   icon={<Clock size={18} />} />
              <StatCard label="In Progress"     value={assigned.filter(r => r.status === "in_progress").length} icon={<RefreshCw size={18} />} accent />
              <StatCard label="Completed Today" value={completedToday}                                          icon={<CheckCircle2 size={18} />} />
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
                          {r.status === "assigned" && (
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
                      { label: "Awaiting start", value: assigned.filter(r => r.status === "assigned").length, color: "text-amber-600" },
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
          />
        )}

        {/* ── COMPLETED TASKS TAB ───────────────────────────────────── */}
        {activeTab === "completed" && (
          <OfficerTaskTable
            requests={completed}
            onSelect={onSelect}
            onStatusUpdate={onStatusUpdate}
            emptyLabel="No completed tasks yet."
          />
        )}

      </div>
    </div>
  );
}

// ─── MONTH PICKER ────────────────────────────────────────────────────────────

function MonthPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(value ? parseInt(value.slice(0, 4)) : currentYear);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : -1;
  const selectedYear  = value ? parseInt(value.slice(0, 4)) : -1;

  const displayValue = value
    ? `${MONTHS[parseInt(value.slice(5,7)) - 1]} ${value.slice(0,4)}`
    : "Select month…";

  function selectMonth(m: number) {
    const mm = String(m + 1).padStart(2, "0");
    onChange(`${year}-${mm}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-2 bg-background border rounded text-sm transition-colors min-w-[180px] justify-between ${
          open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        }`}>
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayValue}</span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-2xl p-4 w-64">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setYear(y => y - 1)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isSelected = selectedYear === year && selectedMonth === i;
              const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === i;
              return (
                <button key={m} onClick={() => selectMonth(i)}
                  className={`py-2 rounded text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                      ? "border border-primary/40 text-primary hover:bg-primary/10"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR POPOVER ────────────────────────────────────────────────────────

function CalendarPopover({ label, value, onChange, mode = "single", rangeValue, onRangeChange }: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  mode?: "single" | "range";
  rangeValue?: { from: string; to: string };
  onRangeChange?: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = (() => {
    if (mode === "range") {
      if (rangeValue?.from && rangeValue?.to)
        return `${rangeValue.from} → ${rangeValue.to}`;
      if (rangeValue?.from) return `From ${rangeValue.from}`;
      return "Select range…";
    }
    return value || "Select date…";
  })();

  const selectedSingle = value ? new Date(value + "T00:00:00") : undefined;

  const selectedRange: DateRange | undefined = rangeValue?.from ? {
    from: new Date(rangeValue.from + "T00:00:00"),
    to:   rangeValue?.to ? new Date(rangeValue.to + "T00:00:00") : undefined,
  } : undefined;

  function toStr(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-2 bg-background border rounded text-sm transition-colors min-w-[180px] justify-between ${
          open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        }`}>
        <span className={value || (rangeValue?.from) ? "text-foreground" : "text-muted-foreground"}>
          {displayValue}
        </span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-2xl p-3"
          style={{ minWidth: 280 }}>
          {mode === "single" ? (
            <DayPicker
              mode="single"
              selected={selectedSingle}
              onSelect={d => {
                if (d) { onChange?.(toStr(d)); setOpen(false); }
              }}
              className="!font-sans"
              classNames={{
                months:       "flex flex-col",
                month:        "space-y-2",
                caption:      "flex justify-center items-center relative py-1",
                caption_label:"text-sm font-semibold text-foreground",
                nav:          "flex items-center gap-1",
                nav_button:   "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                nav_button_previous: "absolute left-1",
                nav_button_next:     "absolute right-1",
                table:        "w-full border-collapse",
                head_row:     "flex",
                head_cell:    "text-muted-foreground rounded w-9 font-normal text-xs text-center",
                row:          "flex w-full mt-1",
                cell:         "text-center text-sm p-0 relative",
                day:          "h-9 w-9 p-0 font-normal rounded hover:bg-muted transition-colors text-xs mx-auto flex items-center justify-center",
                day_selected: "!bg-primary !text-primary-foreground hover:!bg-primary/90 font-semibold",
                day_today:    "border border-primary/40 text-primary font-semibold",
                day_outside:  "text-muted-foreground/40",
                day_disabled: "text-muted-foreground/30 cursor-not-allowed",
              }}
            />
          ) : (
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={range => {
                onRangeChange?.(
                  range?.from ? toStr(range.from) : "",
                  range?.to   ? toStr(range.to)   : ""
                );
              }}
              numberOfMonths={1}
              className="!font-sans"
              classNames={{
                months:       "flex flex-col",
                month:        "space-y-2",
                caption:      "flex justify-center items-center relative py-1",
                caption_label:"text-sm font-semibold text-foreground",
                nav:          "flex items-center gap-1",
                nav_button:   "p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                nav_button_previous: "absolute left-1",
                nav_button_next:     "absolute right-1",
                table:        "w-full border-collapse",
                head_row:     "flex",
                head_cell:    "text-muted-foreground rounded w-9 font-normal text-xs text-center",
                row:          "flex w-full mt-1",
                cell:         "text-center text-sm p-0 relative",
                day:          "h-9 w-9 p-0 font-normal rounded hover:bg-muted transition-colors text-xs mx-auto flex items-center justify-center",
                day_selected: "!bg-primary !text-primary-foreground hover:!bg-primary/90",
                day_range_middle: "!bg-primary/15 !text-primary rounded-none",
                day_range_start:  "!bg-primary !text-primary-foreground rounded-r-none",
                day_range_end:    "!bg-primary !text-primary-foreground rounded-l-none",
                day_today:    "border border-primary/40 text-primary font-semibold",
                day_outside:  "text-muted-foreground/40",
              }}
            />
          )}
          {(mode === "range" && rangeValue?.from) && (
            <div className="border-t border-border pt-2 mt-2 flex justify-end">
              <button onClick={() => { onRangeChange?.("",""); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                Clear
              </button>
              {rangeValue.to && (
                <button onClick={() => setOpen(false)}
                  className="ml-2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 transition-colors font-semibold">
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN REPORTS PAGE ───────────────────────────────────────────────────────

function AdminReports({ requests, users }: { requests: Request[]; users: User[] }) {
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
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
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

// ─── RESET PASSWORD MODAL ────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onReset }: { 
  user: User; 
  onClose: () => void; 
  onReset: (userId: string, newPassword: string) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Password strength calculator
  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: "", color: "" };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*]/.test(pwd)) strength++;
    
    if (strength <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (strength === 2) return { level: 2, label: "Fair", color: "bg-orange-500" };
    if (strength === 3) return { level: 3, label: "Good", color: "bg-yellow-500" };
    if (strength === 4) return { level: 4, label: "Strong", color: "bg-emerald-500" };
    return { level: 5, label: "Very Strong", color: "bg-emerald-600" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    onReset(user.id, newPassword);
    setSuccess(true);
    setTimeout(() => onClose(), 2500);
  }

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 14; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
    setShowPw(true);
    setIsGenerated(true);
    setCopied(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-md rounded shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Reset Password</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-1 border-b border-border pb-3">
            <Avatar name={user.name} size="md" />
            <div>
              <div className="text-sm font-medium text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{user.email}</div>
              <span className={`inline-block text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded mt-1 ${
                user.role === "admin" ? "bg-primary/10 text-primary" :
                user.role === "officer" ? "bg-amber-50 text-amber-800" :
                user.role === "staff" ? "bg-blue-50 text-blue-800" : "bg-muted text-muted-foreground"
              }`} style={{ fontFamily: "var(--font-mono)" }}>{user.role}</span>
            </div>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Check size={28} className="text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-emerald-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Password Reset Successful
              </p>
              <p className="text-xs text-emerald-700 leading-relaxed mb-3">
                The new password has been set for <span className="font-semibold">{user.name}</span>.
              </p>
              <div className="bg-white/60 border border-emerald-300 rounded p-2.5 text-xs text-emerald-800">
                <Key size={14} className="inline mr-1.5" />
                User should change this password on first login
              </div>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex gap-3">
                <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 mb-1">Admin Security Action</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You're resetting the password for this user. Ensure you share the temporary password securely 
                    and instruct them to change it immediately after first login.
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={generateRandomPassword}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg text-sm font-semibold hover:from-primary/90 hover:to-primary/80 transition-all shadow-sm">
                <Sparkles size={16} />
                Generate Secure Password
              </button>

              {/* Password Generated Banner */}
              {isGenerated && newPassword && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-900 mb-1">Strong password generated!</p>
                    <p className="text-xs text-emerald-700">Copy and share this temporary password securely.</p>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setIsGenerated(false); }}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2.5 pr-24 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {newPassword && (
                      <button 
                        type="button" 
                        onClick={copyToClipboard}
                        title="Copy password"
                        className="p-1.5 hover:bg-muted rounded transition-colors">
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-muted-foreground" />}
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setShowPw(p => !p)}
                      title={showPw ? "Hide password" : "Show password"}
                      className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Password Strength:</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength.level <= 2 ? "text-red-600" : 
                        passwordStrength.level === 3 ? "text-yellow-600" : "text-emerald-600"
                      }`}>{passwordStrength.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div 
                          key={i} 
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i <= passwordStrength.level ? passwordStrength.color : "bg-muted"
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check size={16} className="text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm" 
                  style={{ fontFamily: "var(--font-display)" }}>
                  <Key size={14} className="inline mr-1.5" />
                  Reset Password
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── EDIT USER MODAL ─────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [form, setForm] = useState({ name: user.name, department: user.department, role: user.role as Role });
  const [error, setError] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.department) { setError("Name and department are required."); return; }
    onSave({ ...user, ...form });
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Edit User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 pb-1">
            <Avatar name={user.name} size="md" />
            <div>
              <div className="text-xs font-medium text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{user.email}</div>
            </div>
          </div>
          {([["Full Name","name","text","Full name"],["Department","department","text","Department"]] as const).map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Role</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
              className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors">
              <option value="student">Student / Staff</option>
              <option value="officer">Maintenance Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: "var(--font-display)" }}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────

// ─── INVITE USER MODAL ───────────────────────────────────────────────────────

function InviteUserModal({ onClose, onInvite }: {
  onClose: () => void;
  onInvite: (user: User) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "student" as Role, department: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.department) { setError("Please fill in all fields."); return; }
    const newUser: User = {
      id: `u${Date.now()}`, name: form.name, email: form.email,
      role: form.role, department: form.department,
      joinedAt: new Date().toISOString().split("T")[0], active: true,
    };
    onInvite(newUser);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>Invite New User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              User added successfully
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              {form.name} has been added as {form.role}.
            </p>
            <button onClick={onClose}
              className="bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "e.g. John Adeyemi" },
              { label: "Email Address", key: "email", type: "email", placeholder: "user@university.edu" },
              { label: "Department", key: "department", type: "text", placeholder: "e.g. Civil Engineering" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors">
                <option value="student">Student / Staff</option>
                <option value="officer">Maintenance Officer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>
                Add User
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────

function AdminDashboard({ requests, users, onSelect, onAssign, onStatusUpdate, onToggleUser, onInviteUser, onEditUser, activeTab, globalSearch }: {
  requests: Request[]; users: User[]; onSelect: (r: Request) => void;
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
              {activeTab === "overview"   ? "Overview"
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
              <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 size={18} />} />
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

// Session helpers imported from ../lib/session

// ─── CANCEL CONFIRMATION MODAL ───────────────────────────────────────────────

function CancelConfirmModal({ requestId, onConfirm, onClose }: {
  requestId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
          <AlertTriangle size={22} className="text-destructive" />
        </div>
        <h3 className="text-base font-bold text-center text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Cancel this request?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          <span className="font-mono text-xs text-foreground">{requestId}</span> will be marked as cancelled and can no longer be processed.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
            Keep it
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded text-sm font-semibold hover:bg-destructive/90 transition-colors"
            style={{ fontFamily: "var(--font-display)" }}>
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FEEDBACK RATING MODAL ────────────────────────────────────────────────────

function FeedbackModal({ requestId, onSubmit, onClose }: {
  requestId: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const labels: Record<number, string> = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mx-auto mb-4">
          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-center text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Request resolved!
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          How satisfied are you with the resolution of <span className="font-mono text-xs text-foreground">{requestId}</span>?
        </p>

        {/* Star rating */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1,2,3,4,5].map(star => (
            <button key={star} type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={(hovered || rating) >= star ? "#C9A227" : "none"}
                  stroke={(hovered || rating) >= star ? "#C9A227" : "#CBD5E1"}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
        {(hovered || rating) > 0 && (
          <p className="text-xs text-center text-muted-foreground mb-4">{labels[hovered || rating]}</p>
        )}

        {/* Comment */}
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Any additional feedback? (optional)"
          rows={3}
          className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors">
            Skip
          </button>
          <button
            disabled={rating === 0}
            onClick={() => { onSubmit(rating, comment); onClose(); }}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-display)" }}>
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SITE SETTINGS PAGE ──────────────────────────────────────────────────────

const SETTINGS_KEY    = "unimaintain_site_settings";
const CATEGORIES_KEY  = "unimaintain_categories";

type CategoryItem = { id: string; name: string; desc: string };

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "c1", name: "Electricity",   desc: "Faulty wiring, power outages, broken sockets" },
  { id: "c2", name: "Plumbing",      desc: "Leaking pipes, blocked drains, water supply issues" },
  { id: "c3", name: "Furniture",     desc: "Damaged chairs, broken tables, missing equipment" },
  { id: "c4", name: "Internet / IT", desc: "Network outages, router issues, Wi-Fi problems" },
  { id: "c5", name: "HVAC",          desc: "Air conditioning, ventilation, heating issues" },
  { id: "c6", name: "Other",         desc: "Any other maintenance issue not listed above" },
];

function loadSiteSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" };
  } catch { return { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" }; }
}

function loadCategories(): CategoryItem[] {
  try {
    const c = localStorage.getItem(CATEGORIES_KEY);
    return c ? JSON.parse(c) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

function SiteSettingsPage() {
  const [tab, setTab] = useState<"branding" | "categories">("branding");
  const [settings, setSettings] = useState(loadSiteSettings);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>(loadCategories);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: "", desc: "" });
  const [newCat, setNewCat] = useState({ name: "", desc: "" });
  const [showAddCat, setShowAddCat] = useState(false);
  const [catSaved, setCatSaved] = useState(false);

  function saveBranding() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* quota */ }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function saveCategories(updated: CategoryItem[]) {
    setCategories(updated);
    try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated)); } catch { /* quota */ }
    setCatSaved(true); setTimeout(() => setCatSaved(false), 2000);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-card">
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Site Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage global application configurations, branding, and data categories</p>
        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(["branding","categories"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`} style={{ fontFamily: "var(--font-display)" }}>
              {t === "branding" ? "General & Branding" : "Request Categories"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-3xl">

        {/* ── GENERAL & BRANDING TAB ───────────────────────────────────────── */}
        {tab === "branding" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Brand Identity */}
              <div className="bg-card border border-border rounded p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  <Shield size={14} className="text-muted-foreground" /> Brand Identity
                </h3>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Application Name</label>
                  <input defaultValue="UniMaintain" disabled
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Institution Name</label>
                  <input value={settings.institution}
                    onChange={e => setSettings((p: any) => ({ ...p, institution: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">Support Email</label>
                  <input value={settings.supportEmail} type="email"
                    onChange={e => setSettings((p: any) => ({ ...p, supportEmail: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors" />
                </div>
              </div>

              {/* System Configuration */}
              <div className="bg-card border border-border rounded p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  <Settings size={14} className="text-muted-foreground" /> System Configuration
                </h3>
                {[
                  { key: "allowSignups", label: "Allow New User Signups", desc: "If disabled, the registration page will be blocked for all new users" },
                  { key: "emailNotifs",  label: "Email Notifications",       desc: "Send email alerts when requests are updated" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    <button onClick={() => setSettings((p: any) => ({ ...p, [item.key]: !p[item.key] }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${settings[item.key as keyof typeof settings] ? "bg-primary" : "bg-border"}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${settings[item.key as keyof typeof settings] ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveBranding}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>
                Save Settings
              </button>
              {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} /> Saved!</span>}
            </div>
          </>
        )}

        {/* ── REQUEST CATEGORIES TAB ────────────────────────────────────────── */}
        {tab === "categories" && (
          <div className="bg-card border border-border rounded">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Request Categories</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage the types of issues students can report</p>
              </div>
              <button onClick={() => setShowAddCat(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>
                <Plus size={13} /> Add Category
              </button>
            </div>

            {showAddCat && (
              <div className="px-5 py-4 border-b border-border bg-muted/30 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Category</div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                    placeholder="Category name"
                    className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary" />
                  <input value={newCat.desc} onChange={e => setNewCat(p => ({ ...p, desc: e.target.value }))}
                    placeholder="Description"
                    className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                      if (!newCat.name) return;
                      const updated = [...categories, { id: `c${Date.now()}`, name: newCat.name, desc: newCat.desc }];
                      saveCategories(updated);
                      setNewCat({ name: "", desc: "" }); setShowAddCat(false);
                    }}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90 transition-colors">
                    Add
                  </button>
                  <button onClick={() => setShowAddCat(false)}
                    className="px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name","Description","Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      {editingCat === c.id ? (
                        <input value={editValues.name}
                          onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                          className="px-2 py-1 border border-primary rounded text-xs w-full focus:outline-none" autoFocus />
                      ) : (
                        <span className="text-sm text-foreground">{c.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[240px]">
                      {editingCat === c.id ? (
                        <input value={editValues.desc}
                          onChange={e => setEditValues(p => ({ ...p, desc: e.target.value }))}
                          className="px-2 py-1 border border-primary rounded text-xs w-full focus:outline-none" />
                      ) : c.desc}
                    </td>
                    <td className="px-5 py-3">
                      {editingCat === c.id ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => {
                              const updated = categories.map(x => x.id === c.id ? { ...x, name: editValues.name, desc: editValues.desc } : x);
                              saveCategories(updated); setEditingCat(null);
                            }}
                            className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium">Save</button>
                          <button onClick={() => setEditingCat(null)}
                            className="px-2 py-1 border border-border rounded text-xs font-medium hover:bg-muted">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingCat(c.id); setEditValues({ name: c.name, desc: c.desc }); }}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => saveCategories(categories.filter(x => x.id !== c.id))}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {catSaved && (
              <div className="px-5 py-3 flex items-center gap-2 text-xs text-emerald-600 font-medium border-t border-border">
                <CheckCircle2 size={13} /> Changes saved to storage
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ────────────────────────────────────────────────────────────

function ProfilePage({ user, onSave }: { user: User; onSave: (u: User) => void }) {
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
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-32">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── MAIN APP ���────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<"loading" | "login" | "register" | "app">("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>(USERS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // Refs so closures (logout, etc.) always read the latest state values
  const requestsRef     = useRef(requests);
  const usersRef        = useRef(users);
  const notificationsRef = useRef(notifications);
  useEffect(() => { requestsRef.current      = requests;      }, [requests]);
  useEffect(() => { usersRef.current         = users;         }, [users]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [apiMode, setApiMode] = useState(false); // true when backend is reachable

  // Adapter: convert ApiUser → internal User shape
  function adaptUser(u: ApiUser): User {
    return {
      id: String(u.id), name: u.name, email: u.email,
      role: u.role, department: u.department,
      joinedAt: u.created_at?.split("T")[0] ?? "2026-01-01", active: u.active,
    };
  }

  // Adapter: convert ApiRequest → internal Request shape
  function adaptRequest(r: ApiRequest): Request {
    return {
      id: r.id, title: r.title, description: r.description,
      category: (r.category as Category) || "other",
      priority: (r.priority as Priority) || "medium",
      status: (r.status as Status) || "pending",
      location: r.location, submittedBy: String(r.submittedBy),
      submittedByName: r.submittedByName,
      assignedTo: r.assignedTo ? String(r.assignedTo) : undefined,
      assignedToName: r.assignedToName,
      createdAt: r.createdAt, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt,
      hasAttachment: r.hasAttachment,
      audit: (r.audit ?? []).map(a => ({
        id: String(a.id), action: a.action,
        performedByName: a.performedByName,
        details: a.details, timestamp: a.timestamp,
      })),
    };
  }

  // ─── SOCKET.IO REAL-TIME UPDATES ─────────────────────────────────────────────
  useEffect(() => {
    if (!apiMode || !currentUser || screen !== "app") return;

    const socket = socketIO(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("join", String(currentUser.id));
    });

    // New request submitted by someone else → update list
    socket.on("request:new", (req: ApiRequest) => {
      const adapted = adaptRequest(req);
      setRequests(prev => {
        if (prev.find(r => r.id === adapted.id)) return prev;
        return [adapted, ...prev];
      });
    });

    // Status updated on any request
    socket.on("request:updated", (req: ApiRequest) => {
      const adapted = adaptRequest(req);
      setRequests(prev => prev.map(r => r.id === adapted.id ? adapted : r));
    });

    // Officer assigned to a request
    socket.on("request:assigned", (req: ApiRequest) => {
      const adapted = adaptRequest(req);
      setRequests(prev => prev.map(r => r.id === adapted.id ? adapted : r));
    });

    return () => { socket.disconnect(); };
  }, [apiMode, currentUser, screen]);

  // Inject favicon and page title on mount
  useEffect(() => { injectFavicon(); }, []);

  // Keep demo session in sync with localStorage whenever any key state changes
  useEffect(() => {
    if (!apiMode && currentUser && screen === "app") {
      saveDemoSession(currentUser, requests, users, notifications);
    }
  }, [requests, users, notifications, currentUser, apiMode, screen]);

  // On mount: restore session from JWT (API mode) or localStorage (demo mode)
  useEffect(() => {
    async function checkSession() {
      // Always show the loader for at least 1.8s so the splash is visible
      const minDisplay = new Promise(r => setTimeout(r, 1800));

      let nextScreen: "app" | "login" = "login";

      // 1. Try JWT auth against backend
      try {
        const { user } = await apiGetMe();
        setCurrentUser(adaptUser(user));
        setApiMode(true);
        setActiveTab("overview");
        await refreshData(user.role, String(user.id));
        nextScreen = "app";
      } catch {
        // 2. Check if backend is reachable at all
        try {
          await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/health`);
          setApiMode(true);
        } catch {
          setApiMode(false);
        }

        // 3. Restore demo session from localStorage
        const { user: demoUser, requests: demoRequests, users: demoUsers, notifications: demoNotifs } = loadDemoSession();
        if (demoUser) {
          const mergedUsers   = USERS.map(base => demoUsers.find(u => u.id === base.id) ?? base);
          const extraUsers    = demoUsers.filter(u => !USERS.find(b => b.id === u.id));
          const restoredUsers = [...mergedUsers, ...extraUsers];
          // Restore notification read states from storage
          const savedUserNotifs = demoNotifs.filter(n => n.userId === demoUser.id);
          const restoredNotifs  = savedUserNotifs.length > 0
            ? savedUserNotifs
            : INITIAL_NOTIFICATIONS.filter(n => n.userId === demoUser.id);

          setCurrentUser(demoUser);
          setRequests(demoRequests.length > 0 ? demoRequests : INITIAL_REQUESTS);
          setUsers(restoredUsers);
          setNotifications(restoredNotifs);
          setActiveTab("overview");
          nextScreen = "app";
        }
      }

      // Wait for minimum display time before transitioning away from loader
      await minDisplay;
      setScreen(nextScreen);
    }
    checkSession();
  }, []);

  // Load data from API after login
  const refreshData = useCallback(async (role: string, userId: string) => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        apiGetRequests({ limit: 50 }),
        apiGetNotifications(),
      ]);
      setRequests(reqRes.requests.map(adaptRequest));
      setNotifications(notifRes.notifications.map(n => ({
        id: String(n.id), userId,
        title: n.title, message: n.message,
        read: n.read, timestamp: n.created_at, requestId: n.request_id ?? undefined,
      })));

      if (role === "admin") {
        const userRes = await apiGetUsers();
        setUsers(userRes.users.map(adaptUser));
      }
    } catch (err) {
      console.warn("Failed to refresh data:", err);
    }
  }, []);

  const DEMO_USER_IDS = ["u1","u2","u3","u4","u5","u6","u7","u8","u9","u10"];

  async function handleLogin(user: User) {
    setActiveTab("overview");
    if (apiMode) {
      setCurrentUser(user);
      await refreshData(user.role, user.id);
    } else if (DEMO_USER_IDS.includes(user.id)) {
      // Always load from storage first — this preserves data across logouts
      const { requests: savedRequests, users: savedUsers, notifications: savedNotifs } = loadDemoSession();
      const currentRequests = savedRequests.length > 0 ? savedRequests : (requests.length > 0 ? requests : INITIAL_REQUESTS);
      const mergedUsers = USERS.map(baseUser => {
        const saved = savedUsers.find(u => u.id === baseUser.id);
        return saved ?? baseUser;
      });
      const newUsers = savedUsers.filter(u => !USERS.find(b => b.id === u.id));
      const currentUsers = [...mergedUsers, ...newUsers];
      const loggedInUser = currentUsers.find(u => u.id === user.id) ?? user;
      // Restore saved notification read states — fall back to INITIAL_NOTIFICATIONS for this user
      const baseNotifs = INITIAL_NOTIFICATIONS.filter(n => n.userId === user.id);
      const currentNotifs = savedNotifs.filter(n => n.userId === user.id).length > 0
        ? savedNotifs.filter(n => n.userId === user.id)
        : baseNotifs;
      setCurrentUser(loggedInUser);
      setRequests(currentRequests);
      setUsers(currentUsers);
      setNotifications(currentNotifs);
      saveDemoSession(loggedInUser, currentRequests, currentUsers, currentNotifs);
    } else {
      // Newly registered account — add to users list and start fresh
      setRequests([]);
      setNotifications([]);
      setUsers(prev => {
        const exists = prev.find(u => u.id === user.id);
        const updated = exists ? prev : [user, ...prev];
        saveDemoSession(user, [], updated);
        return updated;
      });
    }
    setScreen("app");
  }

  function handleLogout() {
    clearToken();
    if (apiMode) {
      // API mode: clear everything, next login fetches fresh from server
      clearAllDemoData();
      setRequests([]);
      setUsers(USERS);
    } else {
      // Demo mode: save all state before clearing the user session
      try {
        const r  = JSON.stringify(requestsRef.current);
        const us = JSON.stringify(usersRef.current);
        const n  = JSON.stringify(notificationsRef.current);
        [sessionStorage, localStorage].forEach(store => {
          store.setItem(DEMO_REQUESTS_KEY,      r);
          store.setItem(DEMO_USERS_KEY,         us);
          store.setItem(DEMO_NOTIFICATIONS_KEY, n);
        });
      } catch { /* quota */ }
      clearDemoUser();
    }
    setCurrentUser(null);
    setNotifications([]);
    setScreen("login");
    setActiveTab("overview");
  }

  async function handleNewRequest(req: Request) {
    const updated = [req, ...requestsRef.current];
    setRequests(updated);
    if (!apiMode && currentUser) {
      saveDemoSession(currentUser, updated, usersRef.current, notificationsRef.current);
      // Notify all admins of the new request
      usersRef.current.filter(u => u.role === "admin").forEach(admin => {
        pushNotif(admin.id,
          req.priority === "urgent" ? "New Urgent Request" :
          req.priority === "high"   ? "New High Priority Request" : "New Request Submitted",
          `${req.id}: ${req.title} — submitted by ${currentUser.name}.`,
          req.id
        );
      });
      // Confirm to submitter
      pushNotif(currentUser.id, "Request Submitted",
        `${req.id}: Your request has been received and is pending review.`, req.id);
    }
    if (apiMode) await refreshData(currentUser!.role, currentUser!.id);
  }

  async function handleStatusUpdate(requestId: string, status: Status, note: string) {
    const now = new Date().toISOString();
    const actionMap: Record<Status, string> = {
      in_progress: "Work Started", resolved: "Resolved",
      closed: "Closed", assigned: "Assigned", pending: "Reverted to Pending", cancelled: "Cancelled",
    };

    // Always update local state immediately for instant UI feedback
    const newEntry: AuditEntry = {
      id: `audit-${Date.now()}`, action: actionMap[status],
      performedByName: currentUser!.name,
      details: note || `Status updated to ${STATUS_CONFIG[status].label}.`,
      timestamp: now,
    };
    const req = requestsRef.current.find(r => r.id === requestId); // read BEFORE state update
    const updatedRequests = requestsRef.current.map(r => {
      if (r.id !== requestId) return r;
      return { ...r, status, updatedAt: now, resolvedAt: status === "resolved" ? now : status === "closed" ? r.resolvedAt : undefined, audit: [...r.audit, newEntry] };
    });
    setRequests(updatedRequests);
    if (!apiMode && currentUser) {
      saveDemoSession(currentUser, updatedRequests, usersRef.current, notificationsRef.current);
      if (req) {
        // Notify the submitter (if someone else changed the status)
        if (req.submittedBy !== currentUser.id) {
          const statusMessages: Partial<Record<Status, string>> = {
            in_progress: `${requestId}: Work has started on your request.`,
            resolved:    `${requestId}: Your request has been resolved. Please acknowledge.`,
            closed:      `${requestId}: Your request has been closed.`,
            cancelled:   `${requestId}: Your request has been cancelled by an administrator.`,
          };
          const msg = statusMessages[status];
          if (msg) pushNotif(req.submittedBy, `Request ${STATUS_CONFIG[status].label}`, msg, requestId);
        }
        // If submitter self-cancels an assigned request, notify the officer
        if (status === "cancelled" && currentUser.role !== "admin" && req.assignedTo) {
          pushNotif(req.assignedTo, "Task Cancelled",
            `${requestId}: "${req.title}" was cancelled by the requester.`, requestId);
        }
        // Notify admins when a request is resolved (so they can close it)
        if (status === "resolved" && currentUser.role === "officer") {
          usersRef.current.filter(u => u.role === "admin").forEach(admin => {
            pushNotif(admin.id, "Request Resolved",
              `${requestId}: ${req.title} has been resolved by ${currentUser.name}.`, requestId);
          });
        }
      }
    }

    // Sync to backend in background if connected
    if (apiMode) {
      try {
        const { request: updated } = await apiUpdateStatus(requestId, status, note);
        const adapted = adaptRequest(updated);
        setRequests(p => p.map(r => r.id === requestId ? adapted : r));
        apiGetNotifications().then(res => {
          if (!currentUser) return;
          setNotifications(res.notifications.map(n => ({
            id: String(n.id), userId: currentUser.id,
            title: n.title, message: n.message,
            read: n.read, timestamp: n.created_at, requestId: n.request_id ?? undefined,
          })));
        }).catch(() => {});
      } catch (err) {
        console.error("Backend sync failed (local update still applied):", err);
      }
    }
  }

  async function handleAssign(requestId: string, officerId: string) {
    if (apiMode) {
      try {
        const { request: updated } = await apiAssignOfficer(requestId, parseInt(officerId));
        setRequests(p => p.map(r => r.id === requestId ? adaptRequest(updated) : r));
        apiGetNotifications().then(res => {
          if (!currentUser) return;
          setNotifications(res.notifications.map(n => ({
            id: String(n.id), userId: currentUser.id,
            title: n.title, message: n.message,
            read: n.read, timestamp: n.created_at, requestId: n.request_id ?? undefined,
          })));
        }).catch(() => {});
        return;
      } catch (err) {
        console.error("Assign failed:", err);
      }
    }
    // Fallback local (demo mode, or API mode after failed request)
    const officer = usersRef.current.find(u => u.id === officerId);
    if (!officer) return; // officer not found — no-op
    const now = new Date().toISOString();
    const updatedRequests = requestsRef.current.map(r => {
      if (r.id !== requestId) return r;
      const isReassign = !!r.assignedTo && r.assignedTo !== officerId;
      const entry: AuditEntry = {
        id: `audit-${Date.now()}`,
        action: isReassign ? "Reassigned to Officer" : "Assigned to Officer",
        performedByName: currentUser!.name,
        details: isReassign
          ? `Reassigned from ${r.assignedToName} to ${officer.name} (${officer.department}).`
          : `Assigned to ${officer.name} (${officer.department}).`,
        timestamp: now,
      };
      return { ...r, status: "assigned" as Status, assignedTo: officerId, assignedToName: officer.name, updatedAt: now, audit: [...r.audit, entry] };
    });
    const req = requestsRef.current.find(r => r.id === requestId); // read BEFORE setRequests updates the ref
    setRequests(updatedRequests);
    if (currentUser) {
      saveDemoSession(currentUser, updatedRequests, usersRef.current, notificationsRef.current);
      // Notify the assigned officer
      pushNotif(officerId, "New Assignment",
        `${requestId}: ${req?.title ?? "A maintenance request"} has been assigned to you.`, requestId);
      // Notify the requester if it's not the admin themselves
      if (req && req.submittedBy !== currentUser.id) {
        pushNotif(req.submittedBy, "Request Assigned",
          `${requestId}: ${officer.name} has been assigned to your request.`, requestId);
      }
    }
  }

  function handleAddComment(requestId: string, message: string) {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      requestId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message,
      timestamp: now,
    };

    const updatedRequests = requestsRef.current.map(r => {
      if (r.id !== requestId) return r;
      return { ...r, comments: [...(r.comments ?? []), newComment], updatedAt: now };
    });
    
    setRequests(updatedRequests);
    if (!apiMode && currentUser) {
      saveDemoSession(currentUser, updatedRequests, usersRef.current, notificationsRef.current);
      
      // Notify relevant parties
      const req = requestsRef.current.find(r => r.id === requestId);
      if (req) {
        // Notify the requester if this is from officer/admin
        if (currentUser.id !== req.submittedBy && req.submittedBy) {
          pushNotif(req.submittedBy, "New Update",
            `${requestId}: ${currentUser.name} added an update to your request.`, requestId);
        }
        // Notify the assigned officer if this is from requester
        if (currentUser.id !== req.assignedTo && req.assignedTo) {
          pushNotif(req.assignedTo, "New Message",
            `${requestId}: ${currentUser.name} added a message to their request.`, requestId);
        }
      }
    }
  }

  async function handleToggleUser(id: string) {
    if (apiMode) {
      try {
        const { user: updated } = await apiToggleUser(parseInt(id));
        const updatedUsers = usersRef.current.map(u => u.id === id ? adaptUser(updated) : u);
        setUsers(updatedUsers);
        return;
      } catch (err) {
        console.error("Toggle user failed:", err);
      }
    }
    const updatedUsers = usersRef.current.map(u => u.id === id ? { ...u, active: !u.active } : u);
    setUsers(updatedUsers);
    if (currentUser) saveDemoSession(currentUser, requestsRef.current, updatedUsers, notificationsRef.current);
  }

  // Push a new in-app notification (demo mode)
  function pushNotif(userId: string, title: string, message: string, requestId?: string) {
    if (apiMode) return;
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId, title, message, read: false,
      timestamp: new Date().toISOString(),
      requestId,
    };
    setNotifications(p => {
      const updated = [notif, ...p];
      // Save immediately so new notifications survive logout
      try {
        [localStorage, sessionStorage].forEach(s =>
          s.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated))
        );
      } catch { /* quota */ }
      return updated;
    });
  }

  function handleMarkRead(id: string) {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    if (!apiMode) {
      try {
        [localStorage, sessionStorage].forEach(s => s.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated)));
      } catch { /* quota */ }
    }
    if (apiMode) apiMarkRead(parseInt(id)).catch(() => {});
  }

  async function handleMarkAllRead() {
    const updated = notifications.map(n => n.userId === currentUser?.id ? { ...n, read: true } : n);
    setNotifications(updated);
    if (!apiMode) {
      try {
        [localStorage, sessionStorage].forEach(s => s.setItem(DEMO_NOTIFICATIONS_KEY, JSON.stringify(updated)));
      } catch { /* quota */ }
    }
    if (apiMode) {
      try { await apiMarkAllRead(); } catch { /* ignore */ }
    }
  }

  function handleDelete(requestId: string) {
    const updatedRequests = requestsRef.current.filter(r => r.id !== requestId);
    setRequests(updatedRequests);
    if (selectedRequest?.id === requestId) setSelectedRequest(null);
    if (currentUser) saveDemoSession(currentUser, updatedRequests, usersRef.current, notificationsRef.current);
  }

  function handleEditUser(updated: User) {
    const updatedUsers = usersRef.current.map(u => u.id === updated.id ? updated : u);
    setUsers(updatedUsers);
    usersRef.current = updatedUsers;
    // If edited user is the assigned officer on the open request, refresh the panel
    setSelectedRequest(prev => {
      if (!prev) return null;
      if (prev.assignedTo === updated.id) return { ...prev, assignedToName: updated.name };
      if (prev.submittedBy === updated.id) return { ...prev, submittedByName: updated.name };
      return prev;
    });
    // If the edited user is the currently logged-in user, update their session too
    const activeUser = currentUser?.id === updated.id ? updated : currentUser;
    if (activeUser) saveDemoSession(activeUser, requestsRef.current, updatedUsers, notificationsRef.current);
  }

  if (screen === "loading") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-5">
        {/* Spinning arc — matches the reference style */}
        <div className="relative w-14 h-14">
          <svg className="w-full h-full animate-spin" viewBox="0 0 56 56" fill="none"
            style={{ animationDuration: "0.9s" }}>
            <circle cx="28" cy="28" r="22" stroke="#E4E8EF" strokeWidth="3.5" />
            <circle cx="28" cy="28" r="22"
              stroke="url(#spinGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="80 60"
              strokeDashoffset="0"
            />
            <defs>
              <linearGradient id="spinGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1A4731" stopOpacity="0" />
                <stop offset="100%" stopColor="#1A4731" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* App name */}
        <p className="text-foreground font-semibold text-base"
          style={{ fontFamily: "var(--font-display)" }}>
          Loading UniMaintain…
        </p>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoRegister={() => setScreen("register")}
        apiMode={apiMode}
      />
    );
  }
  if (screen === "register") {
    return (
      <RegisterScreen
        onBack={() => setScreen("login")}
        onRegister={handleLogin}
        apiMode={apiMode}
      />
    );
  }
  if (!currentUser) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        user={currentUser} activeTab={activeTab}
        onTab={t => { setActiveTab(t); setSidebarOpen(false); }}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={currentUser} notifications={notifications}
          onBell={() => setShowNotif(p => !p)} showNotif={showNotif}
          onCloseNotif={() => setShowNotif(false)}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          globalSearch={globalSearch} onSearch={setGlobalSearch}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onGoToProfile={() => { setActiveTab("profile"); setSidebarOpen(false); }}
          onLogoutFromHeader={handleLogout}
          onNotifClick={(n) => {
            handleMarkRead(n.id);
            setShowNotif(false);
            if (n.requestId) {
              const req = requests.find(r => r.id === n.requestId);
              if (req) {
                setSelectedRequest(req);
                // Navigate to correct tab so request is visible in background
                if (["student", "staff"].includes(currentUser.role)) setActiveTab("requests");
                if (currentUser.role === "officer") setActiveTab(
                  ["assigned","in_progress"].includes(req.status) ? "tasks" : "completed"
                );
                if (currentUser.role === "admin") setActiveTab("requests");
              }
            }
          }}
        />

        {/* Profile page — available to all roles */}
        {activeTab === "profile" && (
          <ProfilePage user={currentUser} onSave={u => {
            const updatedUsers = users.map(x => x.id === u.id ? u : x);
            setUsers(updatedUsers);
            setCurrentUser(u);
            usersRef.current = updatedUsers;
            // Save immediately to both storages — no effect timing issues
            try {
              const data = JSON.stringify(updatedUsers);
              localStorage.setItem(DEMO_USERS_KEY, data);
              sessionStorage.setItem(DEMO_USERS_KEY, data);
              const userData = JSON.stringify(u);
              localStorage.setItem(DEMO_USER_KEY, userData);
              sessionStorage.setItem(DEMO_USER_KEY, userData);
            } catch { /* quota */ }
          }} />
        )}

        {["student","staff"].includes(currentUser.role) && activeTab !== "profile" && (
          <StudentDashboard user={currentUser} requests={requests}
            onNewRequest={() => setShowNewRequest(true)} onSelect={setSelectedRequest}
            globalSearch={globalSearch} activeTab={activeTab} onTabChange={setActiveTab}
          />
        )}
        {currentUser.role === "officer" && activeTab !== "profile" && (
          <OfficerDashboard user={currentUser} requests={requests}
            onSelect={setSelectedRequest} onStatusUpdate={handleStatusUpdate}
            activeTab={activeTab} globalSearch={globalSearch}
          />
        )}
        {currentUser.role === "admin" && !["reports","profile","settings","api-reference"].includes(activeTab) && (
          <AdminDashboard requests={requests} users={users}
            onSelect={setSelectedRequest} onAssign={handleAssign}
            onStatusUpdate={handleStatusUpdate} onToggleUser={handleToggleUser}
            onInviteUser={u => setUsers(p => [...p, u])}
            onEditUser={handleEditUser}
            activeTab={activeTab} globalSearch={globalSearch}
          />
        )}
        {currentUser.role === "admin" && activeTab === "reports" && (
          <AdminReports requests={requests} users={users} />
        )}
        {currentUser.role === "admin" && activeTab === "settings" && (
          <SiteSettingsPage />
        )}
      </div>

      {selectedRequest && (
        <RequestDetail request={requests.find(r => r.id === selectedRequest.id) ?? selectedRequest} currentUser={currentUser}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
          onAssign={handleAssign}
          officers={users.filter(u => u.role === "officer" && u.active !== false)}
          onAddComment={handleAddComment}
        />
      )}
      {showNewRequest && (
        <NewRequestModal currentUser={currentUser}
          onClose={() => setShowNewRequest(false)} onSubmit={handleNewRequest}
          apiMode={apiMode} existingRequests={requests}
        />
      )}
    </div>
  );
}
