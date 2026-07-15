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
\nexport function RegisterScreen({ onBack, onRegister, apiMode }: {
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
    <div className="min-h-screen flex">
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
            Join UniMaintain<br />Today
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Create an account to easily report issues, track repairs, and help keep our campus facilities running smoothly.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: <Sparkles size={14} />, text: "Quickly report maintenance issues across campus" },
            { icon: <CheckCircle2 size={14} />, text: "Track the status of your requests in real-time" },
            { icon: <Bell size={14} />, text: "Stay informed with automated notifications" },
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
    </div>
  );
}\n