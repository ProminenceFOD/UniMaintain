"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all registered users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *       403: { description: Admin access required }
 */
router.get("/", (0, auth_1.authorize)("admin"), userController_1.getAllUsers);
/**
 * @openapi
 * /api/users/officers:
 *   get:
 *     tags: [Users]
 *     summary: List active maintenance officers (admin only)
 *     description: Used to populate the assign-officer dropdown.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active officers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 officers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer }
 *                       name:       { type: string }
 *                       email:      { type: string }
 *                       department: { type: string }
 */
router.get("/officers", (0, auth_1.authorize)("admin"), userController_1.getOfficers);
/**
 * @openapi
 * /api/users/{id}/toggle:
 *   put:
 *     tags: [Users]
 *     summary: Activate or deactivate a user account (admin only)
 *     description: Toggles the `active` field. Deactivated users cannot log in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Cannot deactivate your own account }
 *       404: { description: User not found }
 */
router.put("/:id/toggle", (0, auth_1.authorize)("admin"), userController_1.toggleUserStatus);
exports.default = router;
