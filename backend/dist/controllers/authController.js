"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || "secret", {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
}
// POST /api/auth/register
async function register(req, res) {
    const { name, email, password, role, department } = req.body;
    try {
        // Check if email already exists
        const existing = await database_1.default.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: "An account with this email already exists" });
            return;
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const result = await database_1.default.query(`INSERT INTO users (name, email, password, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, active, created_at`, [name, email, hash, role || "student", department || ""]);
        const user = result.rows[0];
        const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        res.status(201).json({ token, user });
    }
    catch (err) {
        console.error("Register error:", err && err.stack ? err.stack : err);
        const payload = { error: "Registration failed. Please try again." };
        if (process.env.SHOW_ERRORS === "true" && err && (err.message || err.toString())) {
            payload.details = err.message || String(err);
        }
        res.status(500).json(payload);
    }
}
// POST /api/auth/login
async function login(req, res) {
    const { email, password } = req.body;
    try {
        const result = await database_1.default.query("SELECT id, name, email, password, role, department, active FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const user = result.rows[0];
        if (!user.active) {
            res.status(403).json({ error: "Your account has been deactivated. Contact the administrator." });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        const { password: _pw, ...safeUser } = user;
        res.json({ token, user: safeUser });
    }
    catch (err) {
        console.error("Login error:", err && err.stack ? err.stack : err);
        const payload = { error: "Login failed. Please try again." };
        if (process.env.SHOW_ERRORS === "true" && err && (err.message || err.toString())) {
            payload.details = err.message || String(err);
        }
        res.status(500).json(payload);
    }
}
// GET /api/auth/me  (requires authenticate middleware)
async function getMe(req, res) {
    try {
        const result = await database_1.default.query("SELECT id, name, email, role, department, active, created_at FROM users WHERE id = $1", [req.user.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json({ user: result.rows[0] });
    }
    catch (err) {
        console.error("Get me error:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
}
