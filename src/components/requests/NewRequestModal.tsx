import { apiCreateRequest } from "../../lib/api";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, DEFAULT_CATEGORIES, CATEGORIES_KEY } from "../../lib/constants";
import { generateId } from "../../lib/utils";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, Paperclip, ChevronDown, ChevronLeft, ChevronRight, Send, Filter, Check, RefreshCw, Layers, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";




import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";

import type { CatConfig } from "../../lib/constants";

export function NewRequestModal({ currentUser, onClose, onSubmit, apiMode, existingRequests }: {
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
          attachments: files,
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
      const saved = localStorage.getItem(CATEGORIES_KEY);
      if (saved) {
        const items = JSON.parse(saved) as { id: string; name: string; desc: string }[];
        return items.map(c => ({ value: c.id, label: c.name }));
      }
    } catch { /* ignore */ }
    return DEFAULT_CATEGORIES.map(c => ({ value: c.id, label: c.name }));
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
            {fileObjects.length > 0 && (
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {fileObjects.map((file, idx) => {
                    const isImg = file.type.startsWith("image/");
                    const previewUrl = isImg ? URL.createObjectURL(file) : null;
                    return (
                      <div key={idx} className="relative group rounded border border-border/80 p-1 bg-muted/20 flex flex-col items-center justify-center text-center">
                        {isImg && previewUrl ? (
                          <img src={previewUrl} alt={file.name} className="w-full h-16 object-cover rounded mb-1" />
                        ) : (
                          <div className="w-full h-16 bg-muted rounded flex items-center justify-center mb-1 text-muted-foreground">
                            <Paperclip size={16} />
                          </div>
                        )}
                        <span className="text-[10px] text-foreground font-mono truncate w-full px-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = fileObjects.filter((_, i) => i !== idx);
                            setFileObjects(updated);
                            setFiles(updated.map(f => f.name));
                          }}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full shadow hover:bg-destructive/90 transition-colors"
                          title="Remove file"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
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
