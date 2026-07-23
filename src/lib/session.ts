import type { User, Request, Notification } from "../types";

import type { User, Request, Notification } from "../types";

export const DEMO_USER_KEY          = "unimaintain_demo_user";
export const DEMO_REQUESTS_KEY      = "unimaintain_demo_requests";
export const DEMO_USERS_KEY         = "unimaintain_demo_users";
export const DEMO_NOTIFICATIONS_KEY = "unimaintain_demo_notifications";
export const ACTIVE_TAB_KEY         = "unimaintain_active_tab";

const STUDENT_TABS = ["overview", "requests", "profile"];
const OFFICER_TABS = ["overview", "tasks", "completed", "profile"];
const ADMIN_TABS = ["overview", "requests", "users", "analytics", "reports", "settings", "api-reference", "profile"];

export function getValidActiveTab(tab: string | null | undefined, role?: string | null): string {
  const allowedTabs = role === "officer" ? OFFICER_TABS : role === "admin" ? ADMIN_TABS : STUDENT_TABS;
  return tab && allowedTabs.includes(tab) ? tab : "overview";
}

export function saveActiveTab(tab: string, role?: string | null) {
  const safeTab = getValidActiveTab(tab, role);
  try { sessionStorage.setItem(ACTIVE_TAB_KEY, safeTab); } catch { /* quota exceeded */ }
  try { localStorage.setItem(ACTIVE_TAB_KEY, safeTab); } catch { /* quota exceeded */ }
}

export function loadActiveTab(role?: string | null): string {
  try {
    const saved = sessionStorage.getItem(ACTIVE_TAB_KEY) ?? localStorage.getItem(ACTIVE_TAB_KEY);
    return getValidActiveTab(saved, role);
  } catch {
    return getValidActiveTab(null, role);
  }
}

export function clearActiveTab() {
  [sessionStorage, localStorage].forEach(store => {
    store.removeItem(ACTIVE_TAB_KEY);
  });
}

export function saveDemoSession(user: User, requests: Request[], users: User[], notifications?: Notification[]) {
  const data = {
    user:          JSON.stringify(user),
    requests:      JSON.stringify(requests),
    users:         JSON.stringify(users),
    notifications: notifications ? JSON.stringify(notifications) : null,
  };
  try {
    sessionStorage.setItem(DEMO_USER_KEY,     data.user);
    sessionStorage.setItem(DEMO_REQUESTS_KEY, data.requests);
    sessionStorage.setItem(DEMO_USERS_KEY,    data.users);
    if (data.notifications) sessionStorage.setItem(DEMO_NOTIFICATIONS_KEY, data.notifications);
  } catch { /* quota exceeded */ }
  try {
    localStorage.setItem(DEMO_USER_KEY,     data.user);
    localStorage.setItem(DEMO_REQUESTS_KEY, data.requests);
    localStorage.setItem(DEMO_USERS_KEY,    data.users);
    if (data.notifications) localStorage.setItem(DEMO_NOTIFICATIONS_KEY, data.notifications);
  } catch { /* quota exceeded */ }
}

export function loadDemoSession(): { user: User | null; requests: Request[]; users: User[]; notifications: Notification[] } {
  function get(key: string): string | null {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  }
  try {
    const u  = get(DEMO_USER_KEY);
    const r  = get(DEMO_REQUESTS_KEY);
    const us = get(DEMO_USERS_KEY);
    const n  = get(DEMO_NOTIFICATIONS_KEY);
    return {
      user:          u  ? (JSON.parse(u)  as User)          : null,
      requests:      r  ? (JSON.parse(r)  as Request[])     : [],
      users:         us ? (JSON.parse(us) as User[])        : [],
      notifications: n  ? (JSON.parse(n)  as Notification[]) : [],
    };
  } catch {
    return { user: null, requests: [], users: [], notifications: [] };
  }
}

export function clearDemoUser() {
  [sessionStorage, localStorage].forEach(store => {
    store.removeItem(DEMO_USER_KEY);
  });
}

export function clearAllDemoData() {
  [sessionStorage, localStorage].forEach(store => {
    store.removeItem(DEMO_USER_KEY);
    store.removeItem(DEMO_REQUESTS_KEY);
    store.removeItem(DEMO_USERS_KEY);
    store.removeItem(DEMO_NOTIFICATIONS_KEY);
  });
}
