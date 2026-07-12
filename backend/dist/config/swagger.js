"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSwaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const createSwaggerOptions = (apiUrl) => ({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "UniMaintain API",
            version: "1.0.0",
            description: `
## University Maintenance Request Management System

REST API for managing campus maintenance complaints and service requests.

### Roles
| Role | Description |
|------|-------------|
| **student** | Submit and track their own requests |
| **staff** | University staff — same permissions as student |
| **officer** | Handle and resolve assigned maintenance tasks |
| **admin** | Full access — manage users and oversee all requests |

### Authentication
All protected endpoints require a **Bearer JWT token** in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <token>
\`\`\`
Obtain a token via \`POST /api/auth/login\` or \`POST /api/auth/register\`.

### Demo credentials
| Email | Password | Role |
|-------|----------|------|
| d.ogunlade@admin.university.edu | password123 | Admin |
| m.ogundipe@maintenance.edu | password123 | Officer |
| p.damilola@university.edu | password123 | Student |
| j.folakemi@university.edu | password123 | Staff |
      `,
            contact: {
                name: "Damilola Ogunlade",
                email: "d.ogunlade@admin.university.edu",
            },
            license: { name: "MIT" },
        },
        servers: process.env.NODE_ENV === "production"
            ? [{ url: apiUrl, description: "Current API server" }]
            : [
                { url: apiUrl, description: "Current API server" },
                { url: "http://localhost:5000", description: "Local development server" },
            ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT token obtained from /api/auth/login",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "Prominence Damilola" },
                        email: { type: "string", example: "p.damilola@university.edu" },
                        role: { type: "string", enum: ["student", "staff", "officer", "admin"] },
                        department: { type: "string", example: "Computer Science" },
                        active: { type: "boolean", example: true },
                        created_at: { type: "string", format: "date-time" },
                    },
                },
                ServiceRequest: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "MR-2026-016" },
                        title: { type: "string", example: "Broken projector in Lab 3" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["electricity", "plumbing", "furniture", "internet", "hvac", "other"] },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        status: { type: "string", enum: ["pending", "assigned", "in_progress", "resolved", "closed"] },
                        location: { type: "string", example: "Engineering Block A — Lab 304" },
                        submittedBy: { type: "integer" },
                        submittedByName: { type: "string" },
                        assignedTo: { type: "integer", nullable: true },
                        assignedToName: { type: "string", nullable: true },
                        hasAttachment: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                        resolvedAt: { type: "string", format: "date-time", nullable: true },
                    },
                },
                AuditEntry: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        action: { type: "string", example: "Assigned to Officer" },
                        performedByName: { type: "string", example: "Damilola Ogunlade" },
                        details: { type: "string" },
                        timestamp: { type: "string", format: "date-time" },
                    },
                },
                Notification: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        title: { type: "string" },
                        message: { type: "string" },
                        read: { type: "boolean" },
                        request_id: { type: "string", nullable: true },
                        created_at: { type: "string", format: "date-time" },
                    },
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                        user: { $ref: "#/components/schemas/User" },
                    },
                },
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string", example: "Invalid email or password" },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: "Auth", description: "Registration, login, and session management" },
            { name: "Requests", description: "Maintenance request CRUD and workflow" },
            { name: "Users", description: "User management (admin only)" },
            { name: "Notifications", description: "In-app notification management" },
        ],
    },
    apis: [process.env.NODE_ENV === "production" ? "./src/routes/*.js" : "./src/routes/*.ts"],
});
const getSwaggerSpec = (apiUrl) => (0, swagger_jsdoc_1.default)(createSwaggerOptions(apiUrl));
exports.getSwaggerSpec = getSwaggerSpec;
