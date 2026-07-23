import { Router } from "express";
import {
  getAllRequests, getRequestById, createRequest,
  updateStatus, assignOfficer, getStats,
} from "../controllers/requestController";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/requests/stats:
 *   get:
 *     tags: [Requests]
 *     summary: Get summary statistics (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:      { type: integer }
 *                 byStatus:   { type: array, items: { type: object } }
 *                 byCategory: { type: array, items: { type: object } }
 *                 byPriority: { type: array, items: { type: object } }
 */
router.get("/stats", authorize("admin"), getStats);

/**
 * @openapi
 * /api/requests:
 *   get:
 *     tags: [Requests]
 *     summary: List maintenance requests (filtered by role)
 *     description: |
 *       - **Student/Staff** — sees only their own requests
 *       - **Officer** — sees only requests assigned to them
 *       - **Admin** — sees all requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, assigned, in_progress, resolved, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [electricity, plumbing, furniture, internet, hvac, other] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title or request ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests: { type: array, items: { $ref: '#/components/schemas/ServiceRequest' } }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pages:    { type: integer }
 */
router.get("/", getAllRequests);

/**
 * @openapi
 * /api/requests/{id}:
 *   get:
 *     tags: [Requests]
 *     summary: Get a single request with full audit log
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "MR-2026-007" }
 *     responses:
 *       200:
 *         description: Request detail with audit trail and attachments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request:
 *                   allOf:
 *                     - { $ref: '#/components/schemas/ServiceRequest' }
 *                     - type: object
 *                       properties:
 *                         audit:       { type: array, items: { $ref: '#/components/schemas/AuditEntry' } }
 *                         attachments: { type: array, items: { type: object } }
 *       403: { description: Access denied }
 *       404: { description: Request not found }
 */
router.get("/:id", getRequestById);

/**
 * @openapi
 * /api/requests:
 *   post:
 *     tags: [Requests]
 *     summary: Submit a new maintenance request
 *     description: Students and staff only. Supports file attachments (images/PDF, max 5 MB each, up to 5 files).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, category, location]
 *             properties:
 *               title:       { type: string, example: "Broken projector in Lab 3" }
 *               description: { type: string }
 *               category:    { type: string, enum: [electricity, plumbing, furniture, internet, hvac, other] }
 *               priority:    { type: string, enum: [low, medium, high, urgent], default: medium }
 *               location:    { type: string, example: "Engineering Block A — Lab 304" }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request: { $ref: '#/components/schemas/ServiceRequest' }
 */
router.post("/", upload.array("attachments", 5) as any, createRequest);

/**
 * @openapi
 * /api/requests/{id}/status:
 *   put:
 *     tags: [Requests]
 *     summary: Update request status
 *     description: |
 *       - **Officer** can move to: `in_progress`, `resolved`
 *       - **Admin** can move to: `closed`, `pending`
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [in_progress, resolved, closed, pending] }
 *               note:   { type: string, example: "Replaced faulty circuit breaker." }
 *     responses:
 *       200:
 *         description: Updated request
 *       400: { description: Invalid status transition for role }
 *       404: { description: Request not found }
 */
router.put("/:id/status", authorize("student", "staff", "officer", "admin"), updateStatus);

/**
 * @openapi
 * /api/requests/{id}/assign:
 *   put:
 *     tags: [Requests]
 *     summary: Assign a maintenance officer to a request (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [officerId]
 *             properties:
 *               officerId: { type: integer, example: 5 }
 *     responses:
 *       200:
 *         description: Officer assigned — request status moves to "assigned"
 *       404: { description: Officer or request not found }
 */
router.put("/:id/assign", authorize("admin"), assignOfficer);

export default router;
