# UniMaintain — University Maintenance Request Management System

A full-stack web application for submitting and managing campus facility maintenance requests. Built for the **Advanced Web Application Development** course.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vanilla CSS · Vite |
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) · bcryptjs |
| File Uploads | Multer |
| API Docs | Swagger / OpenAPI 3.0 |

---

## Features

- **Role-based dashboards** — Student, Staff, Maintenance Officer, Administrator
- **JWT authentication** — secure login, register, session persistence
- **Request lifecycle** — submit → assign → in progress → resolved → closed
- **Full audit trail** — every status change is logged with timestamp and actor
- **File attachments** — images and PDFs (max 5 MB, up to 5 per request)
- **In-app notifications** — click-through to the relevant request
- **Search, filter & pagination** — by status, category, priority, keyword
- **Reports page** — day / month / year / custom date range filtering + CSV export
- **Analytics** — category breakdown, status distribution, officer workload
- **User management** — invite, edit, activate/deactivate users
- **API documentation** — Swagger UI at `/api/docs`
- **Mobile responsive** — collapsible sidebar, bottom-sheet modals

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Student** | Submit requests, track own requests, acknowledge resolution |
| **Staff** | Same as Student (university staff member) |
| **Maintenance Officer** | View assigned tasks, update status (start / resolve) |
| **Administrator** | Full access — assign officers, manage users, view all requests, reports |

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Yarn ≥ 1.22

---

## Setup — Backend

### 1. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unimaintain
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 2. Create the database

```bash
psql -U postgres -c "CREATE DATABASE unimaintain;"
```

### 3. Run schema and seed data

```bash
psql -U postgres -d unimaintain -f backend/db/schema.sql
psql -U postgres -d unimaintain -f backend/db/seed.sql
```

### 4. Install dependencies and start

```bash
cd backend

yarn install

yarn dev
```

The API will be available at **http://localhost:5000**

---

## Setup — Frontend

```bash
# From the project root

yarn install

yarn dev
```

The app will be available at **http://localhost:5173**

---

## Demo Accounts

All seeded accounts use the password: **`password123`**

| Name | Email | Role |
|------|-------|------|
| Damilola Ogunlade | d.ogunlade@admin.university.edu | Administrator |
| Ademola Moyinoluwa | m.ogundipe@maintenance.edu | Maintenance Officer |
| Diana Osei | d.osei@maintenance.edu | Maintenance Officer |
| Tom Brennan | t.brennan@maintenance.edu | Maintenance Officer |
| Prominence Damilola | p.damilola@university.edu | Student |
| Janet Folakemi | j.folakemi@university.edu | Staff |

> **Tip:** Use the **Demo Access** buttons on the login page to sign in instantly without typing credentials.

---

## User Testing Guide

To test the core features of UniMaintain, follow this step-by-step lifecycle walkthrough using the seeded demo accounts:

### Scenario 1: Complete Request Lifecycle
1. **Submit a Request (Student / Staff):**
   - Log in as **Prominence Damilola** (Student) using the "Demo Student" button.
   - Click **Submit Request** on the dashboard.
   - Fill out the form (e.g., *Title: "AC Leaking in Room 204"*, *Category: "HVAC"*, *Priority: "Medium"*). Optionally attach an image/PDF.
   - Click **Submit**. You will see it listed on your dashboard under **Pending**.
   - Log out.

2. **Assign a Maintenance Officer (Admin):**
   - Log in as **Damilola Ogunlade** (Admin) using the "Demo Admin" button.
   - You will see the new pending request on the administrator dashboard.
   - Click on the request to view its details and audit trail.
   - Under **Assign Officer**, select **Ademola Moyinoluwa** (or another officer) and click **Assign**. The status changes to **Assigned**.
   - Log out.

3. **Perform Work & Resolve (Maintenance Officer):**
   - Log in as **Ademola Moyinoluwa** (Maintenance Officer) using the "Demo Officer" button.
   - The request will appear in your **Assigned Tasks** list.
   - Click the request and click **Start Work** (status changes to **In Progress**).
   - Once completed, click **Mark as Resolved**, enter a resolution note (e.g., *"Replaced drain pipe"*), and submit.
   - Log out.

4. **Acknowledge and Close (Student / Staff):**
   - Log in as **Prominence Damilola** (Student) again.
   - Click the **Notification bell** in the header to see the update, then click it to go to the request.
   - Review the resolution notes and click **Close Request** to finalize.

---

### Scenario 2: Reports & CSV Export
1. Log in as **Damilola Ogunlade** (Admin).
2. Click **Reports** in the navigation bar.
3. Use the filter controls to filter requests by status, priority, or category.
4. Click **Export to CSV** to download the spreadsheet of the filtered requests.

---

### Scenario 3: Admin User Management
1. Log in as **Damilola Ogunlade** (Admin).
2. Click **Users** in the navigation bar to see all university staff, students, and maintenance officers.
3. Use the toggle switch next to any user to **deactivate** or **activate** their account access.

---

## API Documentation

With the backend running, visit:

```
http://localhost:5000/api/docs
```

Swagger UI provides interactive documentation for all endpoints. You can:
- Authenticate with a JWT token
- Try every endpoint directly in the browser
- Download the OpenAPI spec at `/api/docs.json`

### Key endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/requests` | List requests (role-filtered) |
| POST | `/api/requests` | Submit a new request |
| GET | `/api/requests/:id` | Get request with audit log |
| PUT | `/api/requests/:id/status` | Update request status |
| PUT | `/api/requests/:id/assign` | Assign officer (admin) |
| GET | `/api/requests/stats` | Analytics stats (admin) |
| GET | `/api/users` | List all users (admin) |
| PUT | `/api/users/:id/toggle` | Activate/deactivate user |
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/read-all` | Mark all as read |

---

## Project Structure

```
├── src/                    # React frontend
│   ├── app/App.tsx         # Main application component
│   ├── lib/api.ts          # API client (typed fetch wrapper)
│   └── styles/             # Theme tokens and fonts
│
├── backend/
│   ├── src/
│   │   ├── config/         # Database + Swagger config
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, file upload
│   │   └── routes/         # Express routes with OpenAPI annotations
│   ├── db/
│   │   ├── schema.sql      # Database schema + indexes
│   │   └── seed.sql        # Demo users and requests
│   └── uploads/            # Uploaded attachments (gitignored)
│
└── README.md
```

---

## Advanced Features Implemented

1. **JWT Authentication** — bcrypt password hashing, signed tokens, role-based middleware
2. **File Uploads** — Multer, type validation, 5 MB size limit, stored in `/uploads`
3. **In-app Notifications** — per-user, click-through navigation, mark as read / mark all
4. **Search, Filter & Pagination** — backend-side filtering with query params
5. **Audit Trail** — immutable log of every action on every request
6. **Data Export** — CSV export of filtered requests from the Reports page
7. **API Documentation** — full Swagger/OpenAPI 3.0 spec with interactive UI
8. **Real-time UI** — immediate optimistic updates on status changes and assignments

---

## Author

**Damilola Ogunlade**  
Advanced Web Application Development · 2026
