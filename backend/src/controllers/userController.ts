import { Request, Response } from "express";
import pool from "../config/database";

// GET /api/users  (admin only)
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, active, created_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// GET /api/users/officers  (admin only — list of officers for assignment dropdown)
export async function getOfficers(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, name, email, department FROM users WHERE role = 'officer' AND active = TRUE ORDER BY name`
    );
    res.json({ officers: result.rows });
  } catch (err) {
    console.error("Get officers error:", err);
    res.status(500).json({ error: "Failed to fetch officers" });
  }
}

// PUT /api/users/:id/toggle  (admin only)
export async function toggleUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Prevent admin from deactivating themselves
  if (parseInt(id) === req.user!.id) {
    res.status(400).json({ error: "You cannot deactivate your own account" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE users SET active = NOT active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, department, active`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Toggle user error:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
}
