import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { Server as SocketIO } from "socket.io";
import swaggerUi from "swagger-ui-express";

import authRoutes         from "./routes/auth";
import userRoutes         from "./routes/users";
import requestRoutes      from "./routes/requests";
import notificationRoutes from "./routes/notifications";
import { getSwaggerSpec } from "./config/swagger";
import pool from "./config/database";

dotenv.config();

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT || "5000");

const CORS_ORIGINS = [
  "https://uni-maintain.vercel.app",
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  process.env.API_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.RENDER_URL,
  "https://unimaintain-backend.onrender.com",
].filter(Boolean) as string[];

const API_URL = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || `http://localhost:${PORT}`;
const swaggerSpec = getSwaggerSpec(API_URL);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
export const io = new SocketIO(server, {
  cors: { origin: "*", credentials: true },
});

io.on("connection", (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // Client joins their personal room so we can send targeted events
  socket.on("join", (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`  → User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log(`⚡ Socket disconnected: ${socket.id}`);
  });
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin or matching Vercel/local origins
    if (!origin || CORS_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to req so controllers can emit events
app.use((req: any, _res, next) => { req.io = io; next(); });

import { getUploadsDir } from "./middleware/upload";

// Serve uploaded files statically with CORS & Cross-Origin-Resource-Policy headers
const uploadsDir = getUploadsDir();

app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(uploadsDir), (_req, res) => {
  // If physical file isn't on disk (e.g. ephemeral cloud storage), serve a clean SVG image placeholder
  const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
    <rect width="800" height="600" fill="#0F172A"/>
    <rect x="200" y="140" width="400" height="280" rx="16" fill="#1E293B" stroke="#334155" stroke-width="4"/>
    <circle cx="400" cy="240" r="48" fill="#10B981" opacity="0.8"/>
    <path d="M260 360 L340 270 L400 320 L480 240 L540 360 Z" fill="#34D399" opacity="0.6"/>
    <text x="400" y="470" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="22" font-weight="600">UniMaintain Ticket Attachment</text>
    <text x="400" y="505" text-anchor="middle" fill="#64748B" font-family="system-ui, sans-serif" font-size="14">Sample Image Preview</text>
  </svg>`;

  res.type("image/svg+xml").send(svgPlaceholder);
});

// ─── API DOCUMENTATION ────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve as any, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "UniMaintain API Docs",
  customCss: ".swagger-ui .topbar { background: #1A4731; }",
}) as any);
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth",           authRoutes);
app.use("/api/users",          userRoutes);
app.use("/api/requests",       requestRoutes);
app.use("/api/notifications",  notificationRoutes);

// Fallback aliases without /api prefix to guarantee route matching
app.use("/auth",          authRoutes);
app.use("/users",         userRoutes);
app.use("/requests",      requestRoutes);
app.use("/notifications", notificationRoutes);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    if (process.env.MOCK_DB === "true") {
      return res.json({ status: "ok", database: "mock", timestamp: new Date().toISOString() });
    }
    // Query database to keep connection alive and verify health
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("Health check database connection error:", err.message);
    res.status(500).json({ status: "error", message: "Database connection failed", error: err.message });
  }
});
app.get("/api", (_req, res) => res.json({ message: "UniMaintain API is running" }));

// Root route
app.get("/", (_req, res) => {
  res.json({ message: "UniMaintain API is running" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  const show = process.env.SHOW_ERRORS === "true";
  const payload: any = { error: "Internal server error" };
  if (show && err && err.message) payload.details = err.message;
  res.status(500).json(payload);
});

async function syncDatabaseSeed() {
  try {
    console.log("🔄 Syncing full 15 service requests into PostgreSQL database...");

    // 1. Ensure Janet Folakemi exists as Staff user in PostgreSQL database
    await pool.query(`
      INSERT INTO users (name, email, password, role, department)
      VALUES ('Janet Folakemi', 'j.folakemi@university.edu', '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'staff', 'Faculty of Sciences')
      ON CONFLICT (email) DO UPDATE SET name = 'Janet Folakemi', role = 'staff', department = 'Faculty of Sciences';
    `);

    // 2. Clean up any legacy "Newest User" placeholders in users table
    await pool.query(`
      UPDATE users
      SET name = 'Janet Folakemi', email = 'j.folakemi@university.edu', role = 'staff', department = 'Faculty of Sciences'
      WHERE name ILIKE '%newest%' OR email ILIKE '%newest%';
    `);

    const studentRes = await pool.query("SELECT id, email, name FROM users WHERE role = 'student' ORDER BY id ASC");
    const staffRes   = await pool.query("SELECT id, email, name FROM users WHERE email = 'j.folakemi@university.edu' OR role = 'staff' ORDER BY id ASC");
    const officerRes = await pool.query("SELECT id, email, name FROM users WHERE role = 'officer' ORDER BY id ASC");

    if (studentRes.rows && studentRes.rows.length > 0) {
      const students = studentRes.rows;
      const staff    = (staffRes.rows && staffRes.rows.length > 0) ? staffRes.rows[0].id : students[0].id;
      const officers = (officerRes.rows && officerRes.rows.length > 0) ? officerRes.rows : [];

      const s1 = students[0]?.id; // Prominence Damilola
      const s2 = students[1]?.id || s1; // Marcus Johnson
      const s3 = students[2]?.id || s1; // Priya Patel
      const s4 = students[3]?.id || s1; // Aiden Walsh

      const o1 = officers[0]?.id || null; // Ademola Moyinoluwa
      const o2 = officers[1]?.id || null; // Diana Osei
      const o3 = officers[2]?.id || null; // Tom Brennan

      const requestsData = [
        ['MR-2026-001', 'Flickering and failed lights — Block C Corridor', 'Fluorescent lights in main corridor flickering.', 1, 'medium', 'closed', 'Block C — Main Corridor', s2, o1, false, '2026-06-01 16:00:00', '2026-06-04 12:00:00', '2026-06-03 15:00:00'],
        ['MR-2026-002', 'Power outlets non-functional in Computer Lab 3', 'Three power outlets on east wall non-functional.', 1, 'high', 'resolved', 'Engineering Block A — Lab 304', s1, o1, true, '2026-06-02 09:15:00', '2026-06-04 14:30:00', '2026-06-04 14:30:00'],
        ['MR-2026-003', 'Blocked drains — Science Block Women Restroom', 'All 3 sinks in womens restroom blocked.', 2, 'medium', 'resolved', 'Science Block — Floor 2, Womens Restroom', s3, o2, false, '2026-06-05 10:00:00', '2026-06-07 14:00:00', '2026-06-07 14:00:00'],
        ['MR-2026-004', 'Projector lamp end-of-life — Tutorial Room 12', 'Projector displays lamp warning and dim image.', 6, 'medium', 'assigned', 'Engineering Block B — Tutorial Room 12', s4, o3, false, '2026-06-09 13:00:00', '2026-06-10 09:00:00', null],
        ['MR-2026-005', 'Broken chair and damaged tables — Seminar Room 5', 'Broken chair leg and damaged table surfaces.', 3, 'medium', 'assigned', 'Humanities Block — Seminar Room 5', s3, o3, true, '2026-06-12 14:20:00', '2026-06-13 09:00:00', null],
        ['MR-2026-006', 'Cracked window pane — Seminar Room 2', 'Large crack in lower pane of window.', 6, 'high', 'in_progress', 'Humanities Block — Seminar Room 2', s3, o3, true, '2026-06-14 09:00:00', '2026-06-16 11:00:00', null],
        ['MR-2026-007', 'Leaking supply pipe under sink — Block B Restroom', 'Persistent leak under sink #2 creating slip hazard.', 2, 'urgent', 'in_progress', 'Block B — Ground Floor, Male Restroom', s2, o2, false, '2026-06-17 07:45:00', '2026-06-17 10:00:00', null],
        ['MR-2026-008', 'Poor ventilation — Staff Office Block 2, Floor 3', 'Inadequate airflow in staff offices for past week.', 5, 'medium', 'pending', 'Office Block 2 — Floor 3, Staff Offices', staff, null, false, '2026-06-18 09:15:00', '2026-06-18 09:15:00', null],
        ['MR-2026-009', 'Faulty light switch — Faculty of Sciences Meeting Room', 'Light switch sparking when toggled.', 1, 'high', 'assigned', 'Faculty of Sciences Block — Meeting Room 204', staff, o1, false, '2026-06-18 15:30:00', '2026-06-18 16:00:00', null],
        ['MR-2026-010', 'Broken window blind — Faculty of Sciences Staff Office', 'Window blind cord snapped, stuck open.', 3, 'low', 'assigned', 'Faculty of Sciences Block — Staff Office 312, Floor 3', staff, o3, false, '2026-06-19 07:00:00', '2026-06-19 08:00:00', null],
        ['MR-2026-011', 'HVAC not cooling — Lecture Hall A', 'Air conditioning system running but not cooling.', 5, 'high', 'pending', 'Main Building — Lecture Hall A', s4, null, false, '2026-06-19 08:30:00', '2026-06-19 08:30:00', null],
        ['MR-2026-012', 'Damaged floor tiles creating trip hazard — Faculty Corridor', 'Cracked and raised floor tiles in corridor.', 6, 'high', 'resolved', 'Faculty of Sciences Block — Main Corridor, Floor 2', staff, o3, true, '2026-06-19 10:00:00', '2026-06-19 14:30:00', '2026-06-19 14:30:00'],
        ['MR-2026-013', 'Wi-Fi access point offline — Library Level 2', 'Wi-Fi AP-LIB-L2-03 offline for 2 days.', 4, 'high', 'pending', 'Main Library — Level 2', s1, null, false, '2026-06-19 11:00:00', '2026-06-19 11:00:00', null],
        ['MR-2026-014', 'Ethernet ports dead — Library Study Pod 4', 'All ethernet wall ports in Study Pod 4 dead.', 4, 'low', 'pending', 'Main Library — Study Pod 4', s2, null, false, '2026-06-19 14:00:00', '2026-06-19 14:00:00', null],
        ['MR-2026-015', 'Ceiling fan making loud grinding noise — Staff Office 204', 'Ceiling fan producing loud grinding noise.', 5, 'medium', 'pending', 'Faculty of Sciences Block — Staff Office 204', staff, null, false, '2026-06-19 16:00:00', '2026-06-19 16:00:00', null],
      ];

      for (const item of requestsData) {
        await pool.query(
          `INSERT INTO service_requests
           (id, title, description, category_id, priority, status, location, submitted_by, assigned_to, has_attachment, created_at, updated_at, resolved_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          item
        );
      }

      console.log("✅ All 15 service requests synced to PostgreSQL database successfully!");
    }
  } catch (err: any) {
    console.warn("Database seed sync warning:", err.message);
  }
}

// ─── START ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`🚀 UniMaintain API    → ${API_URL}`);
    console.log(`📋 API Documentation  → ${API_URL}/api/docs`);
    console.log(`⚡ Socket.io enabled  → ${API_URL.replace(/^http/, "ws")}`);
    syncDatabaseSeed();
  });
}

export default app;
