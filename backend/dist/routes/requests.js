"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestController_1 = require("../controllers/requestController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
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
router.get("/stats", (0, auth_1.authorize)("admin"), requestController_1.getStats);
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
router.get("/", requestController_1.getAllRequests);
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
router.get("/:id", requestController_1.getRequestById);
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
router.post("/", upload_1.upload.array("attachments", 5), requestController_1.createRequest);
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
router.put("/:id/status", (0, auth_1.authorize)("student", "staff", "officer", "admin"), requestController_1.updateStatus);
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
router.put("/:id/assign", (0, auth_1.authorize)("admin"), requestController_1.assignOfficer);
exports.default = router;
