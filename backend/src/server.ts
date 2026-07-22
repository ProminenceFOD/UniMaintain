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
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  // Allow the deployed Render host and any Render-provided external URL
  process.env.API_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.RENDER_URL,
  "https://unimaintain-backend.onrender.com",
].filter(Boolean) as string[];

const API_URL = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || `http://localhost:${PORT}`;
const swaggerSpec = getSwaggerSpec(API_URL);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
export const io = new SocketIO(server, {
  cors: { origin: CORS_ORIGINS, credentials: true },
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
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
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

// ─── START ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`🚀 UniMaintain API    → ${API_URL}`);
    console.log(`📋 API Documentation  → ${API_URL}/api/docs`);
    console.log(`⚡ Socket.io enabled  → ${API_URL.replace(/^http/, "ws")}`);
  });
}

export default app;
