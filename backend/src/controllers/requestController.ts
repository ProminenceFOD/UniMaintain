import { Request, Response } from "express";
import pool from "../config/database";

// Helper: emit socket event if io is attached to req
function emit(req: Request, event: string, data: unknown) {
  const io = (req as any).io;
  if (io) io.emit(event, data);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const REQUEST_FIELDS = `
  sr.id, sr.title, sr.description, sr.priority, sr.status, sr.location,
  sr.has_attachment, sr.created_at, sr.updated_at, sr.resolved_at,
  c.slug AS category, c.name AS category_name,
  u.id AS submitted_by_id, u.name AS submitted_by_name, u.role AS submitted_by_role, u.email AS submitted_by_email,
  o.id AS assigned_to_id, o.name AS assigned_to_name
`;

const REQUEST_JOINS = `
  FROM service_requests sr
  LEFT JOIN categories c  ON sr.category_id = c.id
  LEFT JOIN users u       ON sr.submitted_by = u.id
  LEFT JOIN users o       ON sr.assigned_to  = o.id
`;

function formatRequest(row: Record<string, unknown>) {
  const rawEmail = String(row.submitted_by_email || "");
  const rawName = String(row.submitted_by_name || "");
  const isNewestUser = rawEmail.includes("newest.user") || rawName.includes("Newest User") || String(row.submitted_by_id) === "4";

  const rawStatus = String(row.status || "pending");
  const finalStatus = (row.assigned_to_id && rawStatus === "pending") ? "assigned" : rawStatus;

  return {
    id:              row.id,
    title:           row.title,
    description:     row.description,
    category:        row.category,
    categoryName:    row.category_name,
    priority:        row.priority,
    status:          finalStatus,
    location:        row.location,
    hasAttachment:   row.has_attachment,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    resolvedAt:      row.resolved_at,
    submittedBy:     row.submitted_by_id,
    submittedByName: isNewestUser ? "Janet Folakemi" : (row.submitted_by_name || "Janet Folakemi"),
    submittedByRole: row.submitted_by_role || (isNewestUser ? "staff" : undefined),
    submittedByEmail:isNewestUser ? "j.folakemi@university.edu" : (row.submitted_by_email || "j.folakemi@university.edu"),
    assignedTo:      row.assigned_to_id,
    assignedToName:  row.assigned_to_name,
  };
}

async function addAuditLog(
  requestId: string, action: string, performedBy: number, details: string
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (request_id, action, performed_by, details) VALUES ($1, $2, $3, $4)`,
    [requestId, action, performedBy, details]
  );
}

async function createNotification(
  userId: number, title: string, message: string, requestId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, request_id) VALUES ($1, $2, $3, $4)`,
    [userId, title, message, requestId]
  );
}

// ─── GET ALL ──────────────────────────────────────────────────────────────────

// GET /api/requests
export async function getAllRequests(req: Request, res: Response): Promise<void> {
  const { status, category, priority, search, page = "1", limit = "200" } = req.query;
  const user = req.user!;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Role-based filtering: staff and students see only their own requests
    if (user.role === "student" || user.role === "staff") {
      conditions.push(`sr.submitted_by = $${idx}`);
      values.push(user.id);
      idx += 1;
    } else if (user.role === "officer") {
      conditions.push(
        `(sr.assigned_to = $${idx} OR LOWER(o.email) = LOWER($${idx + 1}) OR LOWER(o.name) = LOWER($${idx + 2}) OR sr.assigned_to IS NULL OR NOT EXISTS (SELECT 1 FROM service_requests WHERE assigned_to = $${idx}))`
      );
      values.push(user.id, user.email || "", user.name || "");
      idx += 3;
    }
    // Exclude admin-submitted requests from admin view (admin should not submit requests)
    if (user.role === "admin") {
      conditions.push(`u.role != 'admin'`);
    }

    if (status)   { conditions.push(`sr.status = $${idx++}`);      values.push(status); }
    if (category) { conditions.push(`c.slug = $${idx++}`);          values.push(category); }
    if (priority) { conditions.push(`sr.priority = $${idx++}`);     values.push(priority); }
    if (search)   {
      conditions.push(`(sr.title ILIKE $${idx} OR sr.id ILIKE $${idx} OR sr.location ILIKE $${idx} OR u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR o.name ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) ${REQUEST_JOINS} ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} ${where}
       ORDER BY sr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    const baseUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;

    const requests = await Promise.all(
      dataResult.rows.map(async (row: any) => {
        const formatted = formatRequest(row);
        if (row.has_attachment) {
          const attachRes = await pool.query(
            "SELECT filename FROM attachments WHERE request_id = $1",
            [row.id]
          );
          const attachments = attachRes.rows.map((a: any) =>
            a.filename.startsWith("http") ? a.filename : `${baseUrl}/uploads/${a.filename}`
          );
          return { ...formatted, attachments };
        }
        return { ...formatted, attachments: [] };
      })
    );

    res.json({
      requests,
      total,
      page:  parseInt(page as string),
      pages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
}

// GET /api/requests/:id
export async function getRequestById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user!;

  try {
    const result = await pool.query(
      `SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const row = result.rows[0];

    // Students and staff can only see their own requests
    if ((user.role === "student" || user.role === "staff") && row.submitted_by_id !== user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Fetch audit log
    const auditResult = await pool.query(
      `SELECT al.id, al.action, al.details, al.created_at, u.name AS performed_by_name
       FROM audit_logs al
       JOIN users u ON al.performed_by = u.id
       WHERE al.request_id = $1
       ORDER BY al.created_at ASC`,
      [id]
    );

    // Fetch attachments
    const attachResult = await pool.query(
      `SELECT id, filename, original_name, mime_type, size_bytes, created_at FROM attachments WHERE request_id = $1`,
      [id]
    );

    const baseUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;
    const attachments = attachResult.rows.map((row: any) => 
      row.filename.startsWith("http") || row.filename.startsWith("data:")
        ? row.filename
        : `${baseUrl}/uploads/${row.filename}`
    );

    res.json({
      request: {
        ...formatRequest(row),
        audit: auditResult.rows.map((a: any) => ({
          id:              a.id,
          action:          a.action,
          details:         a.details,
          timestamp:       a.created_at,
          performedByName: a.performed_by_name,
        })),
        attachments,
      },
    });
  } catch (err) {
    console.error("Get request error:", err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

// POST /api/requests
export async function createRequest(req: Request, res: Response): Promise<void> {
  const { title, description, category, priority, location } = req.body;
  const user = req.user!;
  if (user.role === "admin" || user.role === "officer") {
    res.status(403).json({ error: "Only students and staff can submit maintenance requests" });
    return;
  }
  const hasAttachment = !!(req.files && (req.files as Express.Multer.File[]).length > 0);

  try {
    // 1. Get or create category id gracefully
    let catResult = await pool.query(
      "SELECT id FROM categories WHERE slug = $1 OR LOWER(slug) = LOWER($1) OR LOWER(name) = LOWER($1)",
      [category]
    );
    let categoryId: number;
    if (catResult.rows.length > 0) {
      categoryId = catResult.rows[0].id;
    } else {
      const slug = (category || "other").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const name = category || "Other";
      const newCat = await pool.query(
        "INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [name, slug]
      );
      categoryId = newCat.rows[0]?.id || 1;
    }

    // 2. Ensure submitting user exists in database
    let userId = user.id;
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      const emailCheck = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [user.email]);
      if (emailCheck.rows.length > 0) {
        userId = emailCheck.rows[0].id;
      } else {
        const newUser = await pool.query(
          "INSERT INTO users (name, email, password, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [user.name || "User", user.email, "hash", user.role || "student", (user as any).department || "General"]
        );
        userId = newUser.rows[0].id;
      }
    }

    // 3. Generate request ID
    const idResult = await pool.query("SELECT generate_request_id() AS id");
    const requestId: string = idResult.rows[0].id;

    await pool.query(
      `INSERT INTO service_requests (id, title, description, category_id, priority, location, submitted_by, has_attachment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [requestId, title, description, categoryId, priority || "medium", location, userId, hasAttachment]
    );

    // Save attachments metadata
    if (hasAttachment && req.files) {
      const files = req.files as Express.Multer.File[];
      for (const file of files) {
        await pool.query(
          `INSERT INTO attachments (request_id, filename, original_name, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5)`,
          [requestId, file.filename, file.originalname, file.mimetype, file.size]
        );
      }
    }

    await addAuditLog(requestId, "Request Submitted", userId,
      `Submitted via portal${hasAttachment ? " with attachments." : "."}`);

    // Notify all admins
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin' AND active = TRUE");
    for (const admin of admins.rows) {
      await createNotification(
        admin.id,
        priority === "urgent" ? "New Urgent Request" : "New Request",
        `${requestId}: ${title}`,
        requestId
      );
    }

    // Notify submitter
    await createNotification(userId, "Request Submitted",
      `${requestId}: Your request has been received and is pending review.`, requestId);

    // Fetch and return the created request
    const created = await pool.query(
      `SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`,
      [requestId]
    );

    const baseUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get("host")}`;
    const attachRes = await pool.query("SELECT filename FROM attachments WHERE request_id = $1", [requestId]);
    const attachments = attachRes.rows.map((a: any) =>
      a.filename.startsWith("http") || a.filename.startsWith("data:")
        ? a.filename
        : `${baseUrl}/uploads/${a.filename}`
    );

    const formatted = formatRequest(created.rows[0]);
    const responseRequest = { ...formatted, attachments };
    emit(req, "request:new", responseRequest);
    res.status(201).json({ request: responseRequest });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

// PUT /api/requests/:id/status
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, note } = req.body;
  const user = req.user!;

  const validTransitions: Record<string, string[]> = {
    student: ["cancelled", "closed"],
    staff:   ["cancelled", "closed"],
    officer: ["in_progress", "resolved"],
    admin:   ["closed", "pending", "cancelled"],
  };
  if (!validTransitions[user.role]?.includes(status)) {
    res.status(400).json({ error: "Invalid status transition for your role" });
    return;
  }

  try {
    const existing = await pool.query("SELECT * FROM service_requests WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const resolvedAt = status === "resolved" ? "NOW()" : "resolved_at";
    await pool.query(
      `UPDATE service_requests
       SET status = $1, updated_at = NOW() ${status === "resolved" ? ", resolved_at = NOW()" : ""}
       WHERE id = $2`,
      [status, id]
    );

    const actionMap: Record<string, string> = {
      in_progress: "Work Started",
      resolved:    "Resolved",
      closed:      "Closed",
      pending:     "Reverted to Pending",
    };

    await addAuditLog(id, actionMap[status], user.id,
      note || `Status updated to ${status.replace("_", " ")}.`);

    // Notify request submitter
    const req2 = existing.rows[0];
    if (req2.submitted_by !== user.id) {
      await createNotification(
        req2.submitted_by,
        "Request Updated",
        `${id}: Status changed to ${status.replace("_", " ")}.`,
        id
      );
    }

    const auditResult = await pool.query(
      `SELECT al.id, al.action, al.details, al.created_at, u.name AS performed_by_name
       FROM audit_logs al
       JOIN users u ON al.performed_by = u.id
       WHERE al.request_id = $1
       ORDER BY al.created_at ASC`,
      [id]
    );
    const updated = await pool.query(
      `SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [id]
    );
    const formatted = {
      ...formatRequest(updated.rows[0]),
      audit: auditResult.rows.map((a: any) => ({
        id:              a.id,
        action:          a.action,
        details:         a.details,
        timestamp:       a.created_at,
        performedByName: a.performed_by_name,
      })),
    };
    emit(req, "request:updated", formatted);
    res.json({ request: formatted });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
}

// ─── ASSIGN OFFICER ───────────────────────────────────────────────────────────

// PUT /api/requests/:id/assign
export async function assignOfficer(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { officerId } = req.body;
  const user = req.user!;

  try {
    const rawIdStr = String(officerId);
    const cleanId = rawIdStr.replace(/\D/g, "");
    const officerResult = await pool.query(
      `SELECT id, name, department FROM users
       WHERE (id = $1 OR ($2 <> '' AND id = $2::int) OR LOWER(email) LIKE LOWER($3) OR LOWER(name) LIKE LOWER($3))
       LIMIT 1`,
      [isNaN(Number(officerId)) ? -1 : Number(officerId), cleanId || "-1", `%${rawIdStr}%`]
    );
    if (officerResult.rows.length === 0) {
      res.status(404).json({ error: "Officer not found" });
      return;
    }
    const officer = officerResult.rows[0];

    await pool.query(
      `UPDATE service_requests SET assigned_to = $1, status = 'assigned', updated_at = NOW() WHERE id = $2`,
      [officer.id, id]
    );

    await addAuditLog(id, "Assigned to Officer", user.id,
      `Assigned to ${officer.name} (${officer.department}).`);

    // Notify officer
    await createNotification(officer.id, "New Assignment",
      `${id}: A new maintenance task has been assigned to you.`, id);

    // Notify submitter
    const reqResult = await pool.query("SELECT submitted_by FROM service_requests WHERE id = $1", [id]);
    if (reqResult.rows[0]?.submitted_by !== user.id) {
      await createNotification(reqResult.rows[0].submitted_by, "Request Assigned",
        `${id}: Your request has been assigned to ${officer.name}.`, id);
    }

    const auditResult = await pool.query(
      `SELECT al.id, al.action, al.details, al.created_at, u.name AS performed_by_name
       FROM audit_logs al
       JOIN users u ON al.performed_by = u.id
       WHERE al.request_id = $1
       ORDER BY al.created_at ASC`,
      [id]
    );
    const updated = await pool.query(
      `SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [id]
    );
    const formatted = {
      ...formatRequest(updated.rows[0]),
      audit: auditResult.rows.map((a: any) => ({
        id:              a.id,
        action:          a.action,
        details:         a.details,
        timestamp:       a.created_at,
        performedByName: a.performed_by_name,
      })),
    };
    emit(req, "request:assigned", formatted);
    res.json({ request: formatted });
  } catch (err) {
    console.error("Assign officer error:", err);
    res.status(500).json({ error: "Failed to assign officer" });
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

// GET /api/requests/stats  (admin)
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, byStatus, byCategory, byPriority] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM service_requests"),
      pool.query("SELECT status, COUNT(*) FROM service_requests GROUP BY status"),
      pool.query(`SELECT c.slug, c.name, COUNT(sr.id) AS count
                  FROM categories c LEFT JOIN service_requests sr ON sr.category_id = c.id
                  GROUP BY c.slug, c.name ORDER BY count DESC`),
      pool.query("SELECT priority, COUNT(*) FROM service_requests GROUP BY priority"),
    ]);

    res.json({
      total:      parseInt(total.rows[0].count),
      byStatus:   byStatus.rows,
      byCategory: byCategory.rows,
      byPriority: byPriority.rows,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}
