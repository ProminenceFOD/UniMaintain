import { Bell, Search, LogOut, Plus, Download, X, Menu, UserPlus, EyeOff, CheckCircle, CheckCircle2, Clock, AlertTriangle, AlertCircle, BarChart2, Eye, FileText, Shield, MapPin, ChevronDown, ChevronLeft, ChevronRight, UserCheck, ArrowUpRight, CheckCheck, Filter, Check, RefreshCw, TrendingUp, Settings, MessageSquare, Calendar, Key, Sun, Moon, Trash2, Edit, Hash, PieChart } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { Avatar } from "../../components/ui/Avatar";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../hooks/useTheme";
import { createPortal } from "react-dom";
import {
  Bell, Check, ChevronDown, Filter, LogOut, Menu, MoreVertical,
  Plus, Search, Settings, User as UserIcon, X, Calendar, Clock,
  MessageSquare, FileText, AlertTriangle, AlertCircle, Info,
  MapPin, CheckCircle, Mail, Key, Shield, UserPlus, Eye, EyeOff,
  Edit, Trash2, Download, RefreshCw, BarChart2, PieChart, TrendingUp, ChevronLeft, ChevronRight, Hash, Sun, Moon
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, addMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../../types";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "../../lib/constants";
import type { CatConfig } from "../../lib/constants";

export function Header({ user, notifications, onBell, showNotif, onCloseNotif, onMarkRead, onMarkAllRead, globalSearch, onSearch, onToggleSidebar, onNotifClick, onGoToProfile, onLogoutFromHeader }: {
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
  const { theme, toggleTheme } = useTheme();
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
        <button onClick={toggleTheme}
          className="relative p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

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
