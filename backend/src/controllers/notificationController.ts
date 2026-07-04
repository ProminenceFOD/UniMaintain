import { Request, Response } from "express";
import pool from "../config/database";

// GET /api/notifications
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, title, message, read, request_id, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

// PUT /api/notifications/:id/read
export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2",
      [id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
}

// PUT /api/notifications/read-all
export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    await pool.query(
      "UPDATE notifications SET read = TRUE WHERE user_id = $1",
      [req.user!.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
}
