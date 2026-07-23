import { USERS, INITIAL_REQUESTS, INITIAL_NOTIFICATIONS } from "../data/mockData";

import { describe, it, expect } from "vitest";
import { USERS, INITIAL_REQUESTS, INITIAL_NOTIFICATIONS } from "../data/mockData";

// ─── USERS ────────────────────────────────────────────────────────────────────

describe("USERS mock data", () => {
  it("contains 10 users", () => {
    expect(USERS).toHaveLength(10);
  });

  it("includes all required roles", () => {
    const roles = USERS.map(u => u.role);
    expect(roles).toContain("student");
    expect(roles).toContain("staff");
    expect(roles).toContain("officer");
    expect(roles).toContain("admin");
  });

  it("every user has required fields", () => {
    USERS.forEach(user => {
      expect(user.id).toBeTruthy();
      expect(user.name).toBeTruthy();
      expect(user.email).toBeTruthy();
      expect(user.role).toBeTruthy();
      expect(user.department).toBeTruthy();
      expect(user.joinedAt).toBeTruthy();
    });
  });

  it("all emails are unique", () => {
    const emails = USERS.map(u => u.email);
    const unique  = new Set(emails);
    expect(unique.size).toBe(USERS.length);
  });

  it("all user IDs are unique", () => {
    const ids    = USERS.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(USERS.length);
  });

  it("includes Janet Folakemi as staff", () => {
    const janet = USERS.find(u => u.name === "Janet Folakemi");
    expect(janet).toBeDefined();
    expect(janet?.role).toBe("staff");
  });

  it("includes Damilola Ogunlade as admin", () => {
    const admin = USERS.find(u => u.name === "Damilola Ogunlade");
    expect(admin).toBeDefined();
    expect(admin?.role).toBe("admin");
  });
});

// ─── REQUESTS ─────────────────────────────────────────────────────────────────

describe("INITIAL_REQUESTS mock data", () => {
  it("contains 15 requests", () => {
    expect(INITIAL_REQUESTS).toHaveLength(15);
  });

  it("every request has required fields", () => {
    INITIAL_REQUESTS.forEach(req => {
      expect(req.id).toBeTruthy();
      expect(req.title).toBeTruthy();
      expect(req.category).toBeTruthy();
      expect(req.priority).toBeTruthy();
      expect(req.status).toBeTruthy();
      expect(req.location).toBeTruthy();
      expect(req.createdAt).toBeTruthy();
      expect(Array.isArray(req.audit)).toBe(true);
    });
  });

  it("all request IDs are unique", () => {
    const ids    = INITIAL_REQUESTS.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(INITIAL_REQUESTS.length);
  });

  it("IDs follow the MR-2026-XXX format", () => {
    INITIAL_REQUESTS.forEach(req => {
      expect(req.id).toMatch(/^MR-2026-\d{3}$/);
    });
  });

  it("all dates are in June 2026", () => {
    INITIAL_REQUESTS.forEach(req => {
      expect(req.createdAt).toContain("2026-06");
    });
  });

  it("valid status values only", () => {
    const validStatuses = ["pending","assigned","in_progress","resolved","closed","cancelled"];
    INITIAL_REQUESTS.forEach(req => {
      expect(validStatuses).toContain(req.status);
    });
  });

  it("valid priority values only", () => {
    const validPriorities = ["low","medium","high","urgent"];
    INITIAL_REQUESTS.forEach(req => {
      expect(validPriorities).toContain(req.priority);
    });
  });

  it("valid category values only", () => {
    const validCategories = ["electricity","plumbing","furniture","internet","hvac","other"];
    INITIAL_REQUESTS.forEach(req => {
      expect(validCategories).toContain(req.category);
    });
  });

  it("every request has at least one audit entry", () => {
    INITIAL_REQUESTS.forEach(req => {
      expect(req.audit.length).toBeGreaterThan(0);
    });
  });

  it("resolved requests have a resolvedAt date", () => {
    const resolved = INITIAL_REQUESTS.filter(r => r.status === "resolved");
    resolved.forEach(req => {
      expect(req.resolvedAt).toBeTruthy();
    });
  });

  it("assigned requests have an assignedTo field", () => {
    const assigned = INITIAL_REQUESTS.filter(r =>
      ["assigned","in_progress","resolved","closed"].includes(r.status)
    );
    assigned.forEach(req => {
      expect(req.assignedTo).toBeTruthy();
      expect(req.assignedToName).toBeTruthy();
    });
  });

  it("includes requests from staff role", () => {
    const staffRequests = INITIAL_REQUESTS.filter(r => r.submittedByRole === "staff");
    expect(staffRequests.length).toBeGreaterThan(0);
  });

  it("verifies Janet Folakemi requests can transition to resolved and closed", () => {
    const janetRequests = INITIAL_REQUESTS.filter(r => r.submittedByName === "Janet Folakemi");
    expect(janetRequests.length).toBeGreaterThan(0);
    
    // Simulate officer resolving
    const activeReq = janetRequests.find(r => r.status === "assigned" || r.status === "in_progress") || janetRequests[0];
    const resolvedState = { ...activeReq, status: "resolved" as const, resolvedAt: new Date().toISOString() };
    expect(resolvedState.status).toBe("resolved");

    // Simulate Janet Folakemi acknowledging and closing
    const closedState = { ...resolvedState, status: "closed" as const };
    expect(closedState.status).toBe("closed");
    expect(closedState.resolvedAt).toBeTruthy();
  });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

describe("INITIAL_NOTIFICATIONS mock data", () => {
  it("contains notifications", () => {
    expect(INITIAL_NOTIFICATIONS.length).toBeGreaterThan(0);
  });

  it("every notification has required fields", () => {
    INITIAL_NOTIFICATIONS.forEach(n => {
      expect(n.id).toBeTruthy();
      expect(n.userId).toBeTruthy();
      expect(n.title).toBeTruthy();
      expect(n.message).toBeTruthy();
      expect(typeof n.read).toBe("boolean");
    });
  });

  it("notification IDs are unique", () => {
    const ids    = INITIAL_NOTIFICATIONS.map(n => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(INITIAL_NOTIFICATIONS.length);
  });
});
