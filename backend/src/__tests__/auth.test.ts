/**
 * Auth endpoint tests — UniMaintain
 * Run: pnpm test (from the backend directory)
 *
 * NOTE: These tests require a running PostgreSQL instance with the
 * test database seeded. For CI, set TEST_DB_NAME=unimaintain_test
 * and run the schema + seed files before the suite.
 */

import request from "supertest";
import app from "../server";

// ─── AUTH TESTS ───────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  const timestamp = Date.now();
  const testUser = {
    name:       "Test User",
    email:      `test.${timestamp}@university.edu`,
    password:   "password123",
    role:       "student",
    department: "Test Department",
  };

  it("should register a new user and return a JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe("student");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("should reject duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });
});

describe("POST /api/auth/login", () => {
  it("should return JWT token for valid seeded credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email:    "d.ogunlade@admin.university.edu",
        password: "password123",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.role).toBe("admin");
  });

  it("should reject incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email:    "d.ogunlade@admin.university.edu",
        password: "wrongpassword",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("should reject non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@nowhere.com", password: "test" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "d.ogunlade@admin.university.edu", password: "password123" });
    token = res.body.token;
  });

  it("should return current user when authenticated", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.email).toBe("d.ogunlade@admin.university.edu");
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should return 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken123");
    expect(res.status).toBe(401);
  });
});
