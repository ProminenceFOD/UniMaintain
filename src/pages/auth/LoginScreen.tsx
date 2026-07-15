import { apiLogin, saveToken } from "../../lib/api";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, Wrench, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import { USERS } from "../../data/mockData";

import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";


import { Avatar } from "../../components/ui/Avatar";

import { USERS } from "../../data/mockData";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import type { CatConfig } from "../../lib/constants";

export function LoginScreen({ onLogin, onGoRegister, apiMode }: {
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
            { icon: <CheckCircle size={14} />, text: "Real-time request tracking with full audit trail" },
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
                <CheckCircle size={11} className="text-primary" />
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
