import { apiLogin, apiRegister, apiGetMe, apiGetRequests, apiGetRequest, apiCreateRequest, apiUpdateStatus, apiAssignOfficer, apiGetStats, apiGetUsers, apiGetOfficers, apiToggleUser, apiGetNotifications, apiMarkRead, apiMarkAllRead, saveToken, clearToken, type ApiUser, type ApiRequest, type ApiNotification } from "../lib/api";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, DEFAULT_CATEGORIES, CATEGORIES_KEY, SETTINGS_KEY } from "../lib/constants";
import { initials, formatDate, formatDateTime, generateId, exportCSV, getGreeting } from "../lib/utils";
import { Bell, Search, LogOut, Plus, Download, X, Zap, Wifi, Menu, UserPlus, EyeOff, ArrowLeft, Droplets, Package, Wrench, Wind, CheckCircle2, Clock, AlertTriangle, AlertCircle, Users, BarChart2, Eye, Home, FileText, Shield, MapPin, Paperclip, ChevronDown, ChevronLeft, ChevronRight, UserCheck, ArrowUpRight, Send, Building2, Edit2, CheckCheck, Circle, Filter, Check, Copy, RefreshCw, Layers, ClipboardList, TrendingUp, Printer, Code, Settings, MessageSquare, Image as ImageIcon, Calendar, Activity, Sparkles, Key } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { injectFavicon } from "./favicon";
import { io as socketIO } from "socket.io-client";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
// ─── Extracted modules ────────────────────────────────────────────────────────
import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment } from "../types";
import { USERS, INITIAL_REQUESTS, INITIAL_NOTIFICATIONS } from "../data/mockData";

import {
  DEMO_USER_KEY, DEMO_REQUESTS_KEY, DEMO_USERS_KEY, DEMO_NOTIFICATIONS_KEY,
  saveDemoSession, loadDemoSession, clearDemoUser, clearAllDemoData,
  saveActiveTab, loadActiveTab, clearActiveTab,
} from "../lib/session";


import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

import type { CategoryItem } from "../types";




// ─── CONFIG ───────────────────────────────────────────────────────────────────
// ─── EXTRACTED COMPONENTS ────────────────────────────────────────────────────────
import { LoginScreen } from "../pages/auth/LoginScreen";
import { RegisterScreen } from "../pages/auth/RegisterScreen";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { RequestDetail } from "../components/requests/RequestDetail";
import { NewRequestModal } from "../components/requests/NewRequestModal";
import { RequestTable } from "../components/tables/RequestTable";
import { Pagination } from "../components/tables/Pagination";
import { FiltersBar } from "../components/tables/FiltersBar";
import { StudentDashboard } from "../pages/dashboards/StudentDashboard";
import { OfficerDashboard } from "../pages/dashboards/OfficerDashboard";
import { MonthPicker } from "../components/ui/MonthPicker";
import { CalendarPopover } from "../components/ui/CalendarPopover";
import { AdminReports } from "../pages/admin/AdminReports";
import { ResetPasswordModal } from "../components/admin/ResetPasswordModal";
import { EditUserModal } from "../components/admin/EditUserModal";
import { AdminDashboard } from "../pages/dashboards/AdminDashboard";
import { InviteUserModal } from "../components/admin/InviteUserModal";
import { CancelConfirmModal } from "../components/requests/CancelConfirmModal";
import { FeedbackModal } from "../components/requests/FeedbackModal";
import { SiteSettingsPage } from "../pages/admin/SiteSettingsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { Spinner } from "../components/ui/Spinner";

// Session helpers imported from ../lib/session

// ─── CANCEL CONFIRMATION MODAL ───────────────────────────────────────────────
// ─── FEEDBACK RATING MODAL ────────────────────────────────────────────────────
// ─── SITE SETTINGS PAGE ──────────────────────────────────────────────────────

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

// ─── PROFILE PAGE ────────────────────────────────────────────────────────────
// ─── MAIN APP ─────────────────────────────────────────────────────────────────

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
// ─── MAIN APP ���────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<"loading" | "login" | "register" | "app">("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>(USERS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState(() => loadActiveTab());
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
  // Auto-sync selectedRequest with live requests list whenever any request is updated
  useEffect(() => {
    if (selectedRequest) {
      const updated = requests.find(r => r.id === selectedRequest.id);
      if (updated && updated !== selectedRequest) {
        setSelectedRequest(updated);
      }
    }
  }, [requests, selectedRequest]);
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
      attachments: r.attachments || [],
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
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get("demo"); // student, officer, admin, staff
      const tabParam = params.get("tab");

      // Bypass splash screen loader delay if demo query param is set
      const minDisplay = new Promise(r => setTimeout(r, demoParam ? 0 : 1800));

      let nextScreen: "app" | "login" = "login";

      if (demoParam) {
        const demoMap: Record<string, string> = {
          student: "u1",
          staff: "u10",
          officer: "u5",
          admin: "u8"
        };
        const userId = demoMap[demoParam];
        const matchedUser = USERS.find(u => u.id === userId);
        if (matchedUser) {
          setCurrentUser(matchedUser);
          setRequests(INITIAL_REQUESTS);
          setUsers(USERS);
          setNotifications(INITIAL_NOTIFICATIONS.filter(n => n.userId === matchedUser.id));
          setActiveTab(tabParam || loadActiveTab(matchedUser.role));
          setApiMode(false);
          nextScreen = "app";
        }
      } else {
        // 1. Try JWT auth against backend
        try {
          const { user } = await apiGetMe();
          setCurrentUser(adaptUser(user));
          setApiMode(true);
          setActiveTab(loadActiveTab(user.role));
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
            setActiveTab(loadActiveTab(demoUser.role));
            nextScreen = "app";
          }
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
    if (apiMode) {
      setCurrentUser(user);
      setActiveTab(loadActiveTab(user.role));
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
      setActiveTab(loadActiveTab(loggedInUser.role));
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
    clearActiveTab();
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

  async function handleSelectRequest(req: Request) {
    setSelectedRequest(req);
    if (apiMode) {
      try {
        const res = await apiGetRequest(req.id);
        const adapted = adaptRequest(res.request);
        setSelectedRequest(adapted);
        setRequests(prev => prev.map(r => r.id === req.id ? adapted : r));
      } catch (err) {
        console.error("Failed to load request details:", err);
      }
    }
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
                handleSelectRequest(req);
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
            onNewRequest={() => setShowNewRequest(true)} onSelect={handleSelectRequest}
            globalSearch={globalSearch} activeTab={activeTab} onTabChange={setActiveTab}
          />
        )}
        {currentUser.role === "officer" && activeTab !== "profile" && (
          <OfficerDashboard user={currentUser} requests={requests}
            onSelect={handleSelectRequest} onStatusUpdate={handleStatusUpdate}
            activeTab={activeTab} globalSearch={globalSearch}
          />
        )}
        {currentUser.role === "admin" && !["reports","profile","settings","api-reference"].includes(activeTab) && (
          <AdminDashboard requests={requests} users={users} currentUser={currentUser}
            onSelect={handleSelectRequest} onAssign={handleAssign}
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
        <RequestDetail request={selectedRequest} currentUser={currentUser}
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
