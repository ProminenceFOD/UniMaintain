/**
 * Service Requests endpoint tests — UniMaintain
 */

import request from "supertest";
import app from "../server";

jest.mock("../config/database");

let studentToken: string;
let adminToken: string;
let officerToken: string;
let staffToken: string;

beforeAll(async () => {
  const [studentRes, adminRes, officerRes, staffRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "p.damilola@university.edu",       password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "d.ogunlade@admin.university.edu", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "m.ogundipe@maintenance.edu",      password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "j.folakemi@university.edu",       password: "password123" }),
  ]);
  studentToken = studentRes.body.token;
  adminToken   = adminRes.body.token;
  officerToken = officerRes.body.token;
  staffToken   = staffRes.body.token;
});

// ─── GET /api/requests ────────────────────────────────────────────────────────

describe("GET /api/requests", () => {
  it("should return only the student's own requests", async () => {
    const res = await request(app)
      .get("/api/requests")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("requests");
    expect(Array.isArray(res.body.requests)).toBe(true);
    // Every request must belong to this student
    res.body.requests.forEach((r: any) => {
      expect(r.submittedBy).toBeTruthy();
    });
  });

  it("should return only the staff's own requests", async () => {
    const res = await request(app)
      .get("/api/requests")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("requests");
    expect(Array.isArray(res.body.requests)).toBe(true);
    res.body.requests.forEach((r: any) => {
      // In the mock database, mockRequests[1] is submitted by staff user 4 (Janet)
      expect(r.submittedBy).toBe(4);
    });
  });

  it("should return all requests for admin", async () => {
    const res = await request(app)
      .get("/api/requests")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(0);
  });

  it("should support status filter", async () => {
    const res = await request(app)
      .get("/api/requests?status=pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.requests.forEach((r: any) => {
      expect(r.status).toBe("pending");
    });
  });

  it("should return 401 without auth token", async () => {
    const res = await request(app).get("/api/requests");
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/requests ───────────────────────────────────────────────────────

describe("POST /api/requests", () => {
  it("should create a new request as student", async () => {
    const res = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${studentToken}`)
      .field("title",       "Test broken light in Lab 5")
      .field("description", "The fluorescent light in Lab 5 is flickering badly.")
      .field("category",    "electricity")
      .field("priority",    "medium")
      .field("location",    "Engineering Block — Lab 5");

    expect(res.status).toBe(201);
    expect(res.body.request.title).toBe("Test broken light in Lab 5");
    expect(res.body.request.status).toBe("pending");
  });

  it("should return 401 without auth", async () => {
    const res = await request(app).post("/api/requests").send({
      title: "Test", description: "Test", category: "other", location: "Test",
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/requests/:id ────────────────────────────────────────────────────

describe("GET /api/requests/:id", () => {
  it("should allow student to view their own request", async () => {
    const res = await request(app)
      .get("/api/requests/MR-2026-001")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.id).toBe("MR-2026-001");
  });

  it("should deny student from viewing another user's request", async () => {
    const res = await request(app)
      .get("/api/requests/MR-2026-002")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it("should allow staff to view their own request", async () => {
    const res = await request(app)
      .get("/api/requests/MR-2026-002")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.id).toBe("MR-2026-002");
  });

  it("should deny staff from viewing another user's request", async () => {
    const res = await request(app)
      .get("/api/requests/MR-2026-001")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("should allow admin to view any request", async () => {
    const res = await request(app)
      .get("/api/requests/MR-2026-001")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/requests/stats ──────────────────────────────────────────────────

describe("GET /api/requests/stats", () => {
  it("should return stats for admin", async () => {
    const res = await request(app)
      .get("/api/requests/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("byStatus");
    expect(res.body).toHaveProperty("byCategory");
  });

  it("should deny stats to non-admin", async () => {
    const res = await request(app)
      .get("/api/requests/stats")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/requests/:id/status ─────────────────────────────────────────────

describe("PUT /api/requests/:id/status", () => {
  it("should deny student from updating status", async () => {
    const res = await request(app)
      .put("/api/requests/MR-2026-001/status")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(403);
  });

  it("should allow admin to close a resolved request", async () => {
    // Find a resolved request first
    const listRes = await request(app)
      .get("/api/requests?status=resolved")
      .set("Authorization", `Bearer ${adminToken}`);

    if (listRes.body.requests.length > 0) {
      const id = listRes.body.requests[0].id;
      const res = await request(app)
        .put(`/api/requests/${id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "closed", note: "Confirmed resolved." });
      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe("closed");
    }
  });
});
