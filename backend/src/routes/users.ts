import { Router } from "express";
import { getAllUsers, getOfficers, toggleUserStatus } from "../controllers/userController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

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
router.get("/", authorize("admin"), getAllUsers);

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
router.get("/officers", authorize("admin"), getOfficers);

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
router.put("/:id/toggle", authorize("admin"), toggleUserStatus);

export default router;
