import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, CheckCircle2, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, Copy, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Sparkles, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { Avatar } from "../../components/ui/Avatar";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import type { CatConfig } from "../../lib/constants";

export function ResetPasswordModal({ user, onClose, onReset }: { 
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
