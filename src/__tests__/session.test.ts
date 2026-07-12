import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDemoSession, loadDemoSession,
  clearDemoUser, clearAllDemoData,
  saveActiveTab, loadActiveTab, clearActiveTab,
  DEMO_USER_KEY, DEMO_REQUESTS_KEY, DEMO_USERS_KEY,
} from "../lib/session";
import type { User, Request } from "../types";

const mockUser: User = {
  id: "u8", name: "Damilola Ogunlade",
  email: "d.ogunlade@admin.university.edu",
  role: "admin", department: "Facilities Management",
  joinedAt: "2026-06-01", active: true,
};

const mockRequests: Request[] = [
  {
    id: "MR-2026-015", title: "Test request", description: "Test",
    category: "electricity", priority: "medium", status: "pending",
    location: "Block A", submittedBy: "u1", submittedByName: "Test User",
    createdAt: "2026-06-19T10:00:00Z", updatedAt: "2026-06-19T10:00:00Z",
    hasAttachment: false, audit: [],
  },
];

const mockUsers: User[] = [mockUser];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ─── saveDemoSession ───────────────────────────────────────────────────────────

describe("saveDemoSession()", () => {
  it("saves user, requests and users to both storages", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);

    expect(localStorage.getItem(DEMO_USER_KEY)).not.toBeNull();
    expect(localStorage.getItem(DEMO_REQUESTS_KEY)).not.toBeNull();
    expect(localStorage.getItem(DEMO_USERS_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(DEMO_USER_KEY)).not.toBeNull();
  });

  it("saved user data matches original", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);
    const saved = JSON.parse(localStorage.getItem(DEMO_USER_KEY)!);
    expect(saved.name).toBe("Damilola Ogunlade");
    expect(saved.role).toBe("admin");
  });

  it("saved requests match original", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);
    const saved = JSON.parse(localStorage.getItem(DEMO_REQUESTS_KEY)!);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("MR-2026-015");
  });
});

// ─── loadDemoSession ───────────────────────────────────────────────────────────

describe("loadDemoSession()", () => {
  it("returns null user and empty arrays when nothing is saved", () => {
    const result = loadDemoSession();
    expect(result.user).toBeNull();
    expect(result.requests).toHaveLength(0);
    expect(result.users).toHaveLength(0);
  });

  it("returns saved data correctly", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);
    const result = loadDemoSession();
    expect(result.user?.name).toBe("Damilola Ogunlade");
    expect(result.requests).toHaveLength(1);
    expect(result.users).toHaveLength(1);
  });

  it("prefers sessionStorage over localStorage", () => {
    // Save different data to each storage
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify({ ...mockUser, name: "Session User" }));
    sessionStorage.setItem(DEMO_REQUESTS_KEY, JSON.stringify(mockRequests));
    sessionStorage.setItem(DEMO_USERS_KEY, JSON.stringify(mockUsers));
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ ...mockUser, name: "Local User" }));

    const result = loadDemoSession();
    expect(result.user?.name).toBe("Session User");
  });
});

// ─── clearDemoUser ────────────────────────────────────────────────────────────

describe("clearDemoUser()", () => {
  it("removes only the user key — keeps requests and users", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);
    clearDemoUser();

    expect(localStorage.getItem(DEMO_USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(DEMO_USER_KEY)).toBeNull();
    // Requests and users should still be there
    expect(localStorage.getItem(DEMO_REQUESTS_KEY)).not.toBeNull();
    expect(localStorage.getItem(DEMO_USERS_KEY)).not.toBeNull();
  });
});

// ─── clearAllDemoData ─────────────────────────────────────────────────────────

describe("clearAllDemoData()", () => {
  it("removes all three keys from both storages", () => {
    saveDemoSession(mockUser, mockRequests, mockUsers);
    clearAllDemoData();

    expect(localStorage.getItem(DEMO_USER_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_REQUESTS_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_USERS_KEY)).toBeNull();
    expect(sessionStorage.getItem(DEMO_USER_KEY)).toBeNull();
  });
});

// ─── active tab persistence ─────────────────────────────────────────────────

describe("active tab persistence", () => {
  it("persists and restores a valid tab for the current role", () => {
    saveActiveTab("requests");

    expect(loadActiveTab("student")).toBe("requests");
  });

  it("falls back to the dashboard when the saved tab is not valid for the role", () => {
    saveActiveTab("analytics");

    expect(loadActiveTab("student")).toBe("overview");
  });

  it("clears the stored tab", () => {
    saveActiveTab("users");
    clearActiveTab();

    expect(localStorage.getItem("unimaintain_active_tab")).toBeNull();
    expect(sessionStorage.getItem("unimaintain_active_tab")).toBeNull();
  });
});
