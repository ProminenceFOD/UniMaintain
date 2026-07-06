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

dotenv.config();

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT || "5000");

const CORS_ORIGINS = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
];

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

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ─── START ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 UniMaintain API    → ${API_URL}`);
  console.log(`📋 API Documentation  → ${API_URL}/api/docs`);
  console.log(`⚡ Socket.io enabled  → ${API_URL.replace(/^http/, "ws")}`);
});

export default app;
