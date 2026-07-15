import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, DEFAULT_CATEGORIES, CATEGORIES_KEY, SETTINGS_KEY } from "../../lib/constants";
import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, Send, Edit2, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Trash2, Edit, Hash, PieChart, MoreVertical, User as UserIcon, Info, Mail } from "lucide-react";


import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment, CategoryItem } from "../../types";
function loadSiteSettings() {
  try {
    const s = localStorage.getItem("SETTINGS_KEY");
    return s ? JSON.parse(s) : { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" };
  } catch { return { allowSignups: true, emailNotifs: false, institution: "MIVA Open University", supportEmail: "maintenance@university.edu" }; }
}



import type { CategoryItem } from "../../types";
function loadCategories() { try { const c = localStorage.getItem(CATEGORIES_KEY); return c ? JSON.parse(c) : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; } }

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";

import type { CatConfig } from "../../lib/constants";

export function SiteSettingsPage() {
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
              {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={13} /> Saved!</span>}
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
                <CheckCircle size={13} /> Changes saved to storage
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
