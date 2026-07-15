import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, CheckCircle2, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

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

export function InviteUserModal({ onClose, onInvite }: {
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
