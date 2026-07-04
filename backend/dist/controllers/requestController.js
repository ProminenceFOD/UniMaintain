"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRequests = getAllRequests;
exports.getRequestById = getRequestById;
exports.createRequest = createRequest;
exports.updateStatus = updateStatus;
exports.assignOfficer = assignOfficer;
exports.getStats = getStats;
const database_1 = __importDefault(require("../config/database"));
// Helper: emit socket event if io is attached to req
function emit(req, event, data) {
    const io = req.io;
    if (io)
        io.emit(event, data);
}
// ─── HELPERS ──────────────────────────────────────────────────────────────────
const REQUEST_FIELDS = `
  sr.id, sr.title, sr.description, sr.priority, sr.status, sr.location,
  sr.has_attachment, sr.created_at, sr.updated_at, sr.resolved_at,
  c.slug AS category, c.name AS category_name,
  u.id AS submitted_by_id, u.name AS submitted_by_name,
  o.id AS assigned_to_id, o.name AS assigned_to_name
`;
const REQUEST_JOINS = `
  FROM service_requests sr
  LEFT JOIN categories c  ON sr.category_id = c.id
  LEFT JOIN users u       ON sr.submitted_by = u.id
  LEFT JOIN users o       ON sr.assigned_to  = o.id
`;
function formatRequest(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        categoryName: row.category_name,
        priority: row.priority,
        status: row.status,
        location: row.location,
        hasAttachment: row.has_attachment,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
        submittedBy: row.submitted_by_id,
        submittedByName: row.submitted_by_name,
        assignedTo: row.assigned_to_id,
        assignedToName: row.assigned_to_name,
    };
}
async function addAuditLog(requestId, action, performedBy, details) {
    await database_1.default.query(`INSERT INTO audit_logs (request_id, action, performed_by, details) VALUES ($1, $2, $3, $4)`, [requestId, action, performedBy, details]);
}
async function createNotification(userId, title, message, requestId) {
    await database_1.default.query(`INSERT INTO notifications (user_id, title, message, request_id) VALUES ($1, $2, $3, $4)`, [userId, title, message, requestId]);
}
// ─── GET ALL ──────────────────────────────────────────────────────────────────
// GET /api/requests
async function getAllRequests(req, res) {
    const { status, category, priority, search, page = "1", limit = "10" } = req.query;
    const user = req.user;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    try {
        const conditions = [];
        const values = [];
        let idx = 1;
        // Role-based filtering
        if (user.role === "student") {
            conditions.push(`sr.submitted_by = $${idx++}`);
            values.push(user.id);
        }
        else if (user.role === "officer") {
            conditions.push(`sr.assigned_to = $${idx++}`);
            values.push(user.id);
        }
        if (status) {
            conditions.push(`sr.status = $${idx++}`);
            values.push(status);
        }
        if (category) {
            conditions.push(`c.slug = $${idx++}`);
            values.push(category);
        }
        if (priority) {
            conditions.push(`sr.priority = $${idx++}`);
            values.push(priority);
        }
        if (search) {
            conditions.push(`(sr.title ILIKE $${idx} OR sr.id ILIKE $${idx})`);
            values.push(`%${search}%`);
            idx++;
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const countResult = await database_1.default.query(`SELECT COUNT(*) ${REQUEST_JOINS} ${where}`, values);
        const total = parseInt(countResult.rows[0].count);
        const dataResult = await database_1.default.query(`SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} ${where}
       ORDER BY sr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, [...values, limit, offset]);
        res.json({
            requests: dataResult.rows.map(formatRequest),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    }
    catch (err) {
        console.error("Get requests error:", err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
}
// GET /api/requests/:id
async function getRequestById(req, res) {
    const { id } = req.params;
    const user = req.user;
    try {
        const result = await database_1.default.query(`SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Request not found" });
            return;
        }
        const row = result.rows[0];
        // Students can only see their own requests
        if (user.role === "student" && row.submitted_by_id !== user.id) {
            res.status(403).json({ error: "Access denied" });
            return;
        }
        // Fetch audit log
        const auditResult = await database_1.default.query(`SELECT al.id, al.action, al.details, al.created_at, u.name AS performed_by_name
       FROM audit_logs al
       JOIN users u ON al.performed_by = u.id
       WHERE al.request_id = $1
       ORDER BY al.created_at ASC`, [id]);
        // Fetch attachments
        const attachResult = await database_1.default.query(`SELECT id, original_name, mime_type, size_bytes, created_at FROM attachments WHERE request_id = $1`, [id]);
        res.json({
            request: {
                ...formatRequest(row),
                audit: auditResult.rows.map(a => ({
                    id: a.id,
                    action: a.action,
                    details: a.details,
                    timestamp: a.created_at,
                    performedByName: a.performed_by_name,
                })),
                attachments: attachResult.rows,
            },
        });
    }
    catch (err) {
        console.error("Get request error:", err);
        res.status(500).json({ error: "Failed to fetch request" });
    }
}
// ─── CREATE ───────────────────────────────────────────────────────────────────
// POST /api/requests
async function createRequest(req, res) {
    const { title, description, category, priority, location } = req.body;
    const user = req.user;
    const hasAttachment = !!(req.files && req.files.length > 0);
    try {
        // Get category id
        const catResult = await database_1.default.query("SELECT id FROM categories WHERE slug = $1", [category]);
        if (catResult.rows.length === 0) {
            res.status(400).json({ error: "Invalid category" });
            return;
        }
        // Generate request ID
        const idResult = await database_1.default.query("SELECT generate_request_id() AS id");
        const requestId = idResult.rows[0].id;
        await database_1.default.query(`INSERT INTO service_requests (id, title, description, category_id, priority, location, submitted_by, has_attachment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [requestId, title, description, catResult.rows[0].id, priority || "medium", location, user.id, hasAttachment]);
        // Save attachments metadata
        if (hasAttachment && req.files) {
            const files = req.files;
            for (const file of files) {
                await database_1.default.query(`INSERT INTO attachments (request_id, filename, original_name, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5)`, [requestId, file.filename, file.originalname, file.mimetype, file.size]);
            }
        }
        await addAuditLog(requestId, "Request Submitted", user.id, `Submitted via portal${hasAttachment ? " with attachments." : "."}`);
        // Notify all admins
        const admins = await database_1.default.query("SELECT id FROM users WHERE role = 'admin' AND active = TRUE");
        for (const admin of admins.rows) {
            await createNotification(admin.id, priority === "urgent" ? "New Urgent Request" : "New Request", `${requestId}: ${title}`, requestId);
        }
        // Notify submitter
        await createNotification(user.id, "Request Submitted", `${requestId}: Your request has been received and is pending review.`, requestId);
        // Fetch and return the created request
        const created = await database_1.default.query(`SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [requestId]);
        const formatted = formatRequest(created.rows[0]);
        emit(req, "request:new", formatted);
        res.status(201).json({ request: formatted });
    }
    catch (err) {
        console.error("Create request error:", err);
        res.status(500).json({ error: "Failed to create request" });
    }
}
// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
// PUT /api/requests/:id/status
async function updateStatus(req, res) {
    const { id } = req.params;
    const { status, note } = req.body;
    const user = req.user;
    const validTransitions = {
        student: ["cancelled"],
        staff: ["cancelled"],
        officer: ["in_progress", "resolved"],
        admin: ["closed", "pending", "cancelled"],
    };
    if (!validTransitions[user.role]?.includes(status)) {
        res.status(400).json({ error: "Invalid status transition for your role" });
        return;
    }
    try {
        const existing = await database_1.default.query("SELECT * FROM service_requests WHERE id = $1", [id]);
        if (existing.rows.length === 0) {
            res.status(404).json({ error: "Request not found" });
            return;
        }
        const resolvedAt = status === "resolved" ? "NOW()" : "resolved_at";
        await database_1.default.query(`UPDATE service_requests
       SET status = $1, updated_at = NOW() ${status === "resolved" ? ", resolved_at = NOW()" : ""}
       WHERE id = $2`, [status, id]);
        const actionMap = {
            in_progress: "Work Started",
            resolved: "Resolved",
            closed: "Closed",
            pending: "Reverted to Pending",
        };
        await addAuditLog(id, actionMap[status], user.id, note || `Status updated to ${status.replace("_", " ")}.`);
        // Notify request submitter
        const req2 = existing.rows[0];
        if (req2.submitted_by !== user.id) {
            await createNotification(req2.submitted_by, "Request Updated", `${id}: Status changed to ${status.replace("_", " ")}.`, id);
        }
        const updated = await database_1.default.query(`SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [id]);
        const formatted = formatRequest(updated.rows[0]);
        emit(req, "request:updated", formatted);
        res.json({ request: formatted });
    }
    catch (err) {
        console.error("Update status error:", err);
        res.status(500).json({ error: "Failed to update status" });
    }
}
// ─── ASSIGN OFFICER ───────────────────────────────────────────────────────────
// PUT /api/requests/:id/assign
async function assignOfficer(req, res) {
    const { id } = req.params;
    const { officerId } = req.body;
    const user = req.user;
    try {
        const officerResult = await database_1.default.query("SELECT id, name, department FROM users WHERE id = $1 AND role = 'officer'", [officerId]);
        if (officerResult.rows.length === 0) {
            res.status(404).json({ error: "Officer not found" });
            return;
        }
        const officer = officerResult.rows[0];
        await database_1.default.query(`UPDATE service_requests SET assigned_to = $1, status = 'assigned', updated_at = NOW() WHERE id = $2`, [officerId, id]);
        await addAuditLog(id, "Assigned to Officer", user.id, `Assigned to ${officer.name} (${officer.department}).`);
        // Notify officer
        await createNotification(officerId, "New Assignment", `${id}: A new maintenance task has been assigned to you.`, id);
        // Notify submitter
        const reqResult = await database_1.default.query("SELECT submitted_by FROM service_requests WHERE id = $1", [id]);
        if (reqResult.rows[0]?.submitted_by !== user.id) {
            await createNotification(reqResult.rows[0].submitted_by, "Request Assigned", `${id}: Your request has been assigned to ${officer.name}.`, id);
        }
        const updated = await database_1.default.query(`SELECT ${REQUEST_FIELDS} ${REQUEST_JOINS} WHERE sr.id = $1`, [id]);
        const formatted = formatRequest(updated.rows[0]);
        emit(req, "request:assigned", formatted);
        res.json({ request: formatted });
    }
    catch (err) {
        console.error("Assign officer error:", err);
        res.status(500).json({ error: "Failed to assign officer" });
    }
}
// ─── STATS ────────────────────────────────────────────────────────────────────
// GET /api/requests/stats  (admin)
async function getStats(req, res) {
    try {
        const [total, byStatus, byCategory, byPriority] = await Promise.all([
            database_1.default.query("SELECT COUNT(*) FROM service_requests"),
            database_1.default.query("SELECT status, COUNT(*) FROM service_requests GROUP BY status"),
            database_1.default.query(`SELECT c.slug, c.name, COUNT(sr.id) AS count
                  FROM categories c LEFT JOIN service_requests sr ON sr.category_id = c.id
                  GROUP BY c.slug, c.name ORDER BY count DESC`),
            database_1.default.query("SELECT priority, COUNT(*) FROM service_requests GROUP BY priority"),
        ]);
        res.json({
            total: parseInt(total.rows[0].count),
            byStatus: byStatus.rows,
            byCategory: byCategory.rows,
            byPriority: byPriority.rows,
        });
    }
    catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
}
