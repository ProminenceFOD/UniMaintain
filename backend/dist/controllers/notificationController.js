"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const database_1 = __importDefault(require("../config/database"));
// GET /api/notifications
async function getNotifications(req, res) {
    try {
        const result = await database_1.default.query(`SELECT id, title, message, read, request_id, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`, [req.user.id]);
        res.json({ notifications: result.rows });
    }
    catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
}
// PUT /api/notifications/:id/read
async function markRead(req, res) {
    const { id } = req.params;
    try {
        await database_1.default.query("UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        res.json({ success: true });
    }
    catch (err) {
        console.error("Mark read error:", err);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
}
// PUT /api/notifications/read-all
async function markAllRead(req, res) {
    try {
        await database_1.default.query("UPDATE notifications SET read = TRUE WHERE user_id = $1", [req.user.id]);
        res.json({ success: true });
    }
    catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
}
