"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const requests_1 = __importDefault(require("./routes/requests"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const swagger_1 = require("./config/swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = parseInt(process.env.PORT || "5000");
const CORS_ORIGINS = [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    // Allow the deployed Render host and any Render-provided external URL
    process.env.API_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_URL,
    "https://unimaintain-backend.onrender.com",
].filter(Boolean);
const API_URL = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || `http://localhost:${PORT}`;
const swaggerSpec = (0, swagger_1.getSwaggerSpec)(API_URL);
// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
exports.io = new socket_io_1.Server(server, {
    cors: { origin: CORS_ORIGINS, credentials: true },
});
exports.io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);
    // Client joins their personal room so we can send targeted events
    socket.on("join", (userId) => {
        socket.join(`user:${userId}`);
        console.log(`  → User ${userId} joined room`);
    });
    socket.on("disconnect", () => {
        console.log(`⚡ Socket disconnected: ${socket.id}`);
    });
});
// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({ origin: CORS_ORIGINS, credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Attach io to req so controllers can emit events
app.use((req, _res, next) => { req.io = exports.io; next(); });
// Serve uploaded files statically
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// ─── API DOCUMENTATION ────────────────────────────────────────────────────────
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
    customSiteTitle: "UniMaintain API Docs",
    customCss: ".swagger-ui .topbar { background: #1A4731; }",
}));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/requests", requests_1.default);
app.use("/api/notifications", notifications_1.default);
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Root route
app.get("/", (_req, res) => {
    res.json({ message: "UniMaintain API is running" });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err && err.stack ? err.stack : err);
    const show = process.env.SHOW_ERRORS === "true";
    const payload = { error: "Internal server error" };
    if (show && err && err.message)
        payload.details = err.message;
    res.status(500).json(payload);
});
// ─── START ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`🚀 UniMaintain API    → ${API_URL}`);
    console.log(`📋 API Documentation  → ${API_URL}/api/docs`);
    console.log(`⚡ Socket.io enabled  → ${API_URL.replace(/^http/, "ws")}`);
});
exports.default = app;
