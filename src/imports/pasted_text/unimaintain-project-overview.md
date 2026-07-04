1. Introduction and Problem Statement
On a modern university campus, managing facilities like dorms, lecture halls, computer labs, and office spaces is a huge task. Currently, the university relies on manual ways to report facilities issues, including phone calls, paper forms, WhatsApp messages, and walk-ins to the maintenance office. 

This setup has created several major problems:
Things Get Lost: WhatsApp messages are easily buried, and paper slips get misplaced. Without a central database, requests frequently fall through the cracks.
Long Delays: It takes a long time to write a complaint from a student to the right maintenance officer. There is no clear way to see what issues are urgent.
No Accountability: Administrators cannot track which technician has been assigned to a job, how long they took to fix it, or whether the work was actually completed to a good standard.
Frustrated Users:  Students and staff submit issues but have no idea if anyone is working on them. They receive no feedback unless they follow up in person.

To solve this, we developed UniMaintain, a web portal designed to make reporting and resolving campus maintenance requests simple, transparent, and organized.





2. System Objectives
The goal of this project is to replace the old manual system with an easy-to-use digital platform:
Intuitive Reporting: Give students and staff a clean interface to report faults (like plumbing, electricity, or internet issues) with details, location, and photos.
Role-Based Workflows: Ensure that students, maintenance technicians, and administrators see dashboards customized to their specific jobs.
Fast Task Assignment: Let administrators see new issues immediately and assign them to the right officers with a few clicks.
Full Transparency:Maintain an audit log for every request so anyone can check its history (e.g., when it was submitted, who was assigned, and when work started).
Performance Tracking: Provide dashboards with chart visualizations so administrators can easily spot recurring system faults and track resolution times.











3. Requirement Analysis
The platform is designed around three distinct user roles with specific workflows:
Functional Requirements
 User Authentication: Everyone must be able to create an account and sign in securely. The system uses their login credentials to identify their role (Student, Officer, or Admin).
 Student/Staff Workflow: Submit maintenance complaints by filling out a form specifying the title, description, category (e.g., HVAC, plumbing, internet), priority level, location, and uploading photos.
View a list of their own submitted requests and monitor their live status.
View notifications when their tickets are updated or resolved.
Maintenance Officer Workflow:
View a list of tasks assigned to them.
Update the status of their assigned tasks (e.g., mark a ticket as "In Progress" when starting work, and "Resolved" when finished).
Administrator Workflow:
View a dashboard showing statistics (e.g., total open tickets, issues sorted by priority, and categories).
Assign unassigned tickets to specific officers.
Toggle user account statuses (activating or deactivating them).
Export the requests table data to a CSV spreadsheet.



 Non-Functional Requirements
Security:  Passwords must be hashed. API endpoints must require authentication so users cannot access administrative data or edit tickets belonging to others.
Responsiveness: The UI must adapt to mobile phones, tablets, and desktop computers so students can file reports on the go.
Speed: The app should load fast and make background API calls without forcing full page refreshes.















4. Technologies Used
Frontend: Built using React  and TypeScript  for a fast, component-driven user interface. Styling is written using Tailwind CSS (v4) for clean layouts. State management and routing are handled on the client side, while icons are rendered using Lucide React and charts are built with Recharts.
Backend: Developed with Node.js and the Express framework in TypeScript. It provides a RESTful API containing authenticated endpoints protected by JWT session validation middleware. File uploads are handled via Multer.
Database: Uses a PostgreSQL  relational database (hosted on Supabase). We chose a relational database because the system relies on structured relationships:
Users to Requests: One-to-many relationship (a user submits many requests; an officer is assigned many requests).
Requests to Audit Logs: One-to-many relationship (each request has a detailed timeline of events).
Requests to Attachments: One-to-many relationship (each request can have multiple uploaded images).








5. API Documentation
The backend exposes a structured JSON API. The main endpoints are summarized below:
Authentication (`/api/auth`)
 `POST /api/auth/register` — Creates a new account.
`POST /api/auth/login` — Verifies credentials and returns a JWT session token.
`GET /api/auth/me` — Fetches current user profile.
Maintenance Requests (`/api/requests`)
`GET /api/requests` — Fetches requests. (Students see only theirs, officers see assigned tasks, admins see all).
`POST /api/requests` — Submits a new ticket with optional file uploads.
 `GET /api/requests/:id` — Returns full details, attachments, and audit logs of a ticket.
 `PUT /api/requests/:id/status` — Updates status (officers can set "In Progress/Resolved", admins can "Close/Revert").
 `PUT /api/requests/:id/assign` — *(Admin Only)* Assigns a ticket to an officer.
 `GET /api/requests/stats` — *(Admin Only)* Fetches totals for charts.

Notifications (`/api/notifications`)
 `GET /api/notifications` — Lists current notifications.
 `PUT /api/notifications/:id/read` — Marks a notification as read.


6. Screenshots of Major Interfaces
Dashboard Page:
  [Insert Admin Dashboard screenshot here: Show the dashboard metrics cards, the Recharts status pie chart, and category bar chart.
Request Submission Form:*
  [Insert New Request modal/page screenshot here: Show the form fields for Title, Category, Priority, Location, Description, and the file upload button.]
Admin Request Management Interface:
  [Insert Admin Requests List screenshot here: Show the requests data table, filter dropdowns, and the "Assign Officer" action dropdown panel.]
Login & Demo Access Screen:
  [Insert Login Screen screenshot here: Show the credentials form alongside the "Demo Access" quick-login cards.]









7. Testing Evidence
We set up automated testing for both frontend components and backend API endpoints using Vitest.
 Frontend Tests
Tests simulate rendering the React DOM in a virtual browser context (`jsdom`). We mocked the charting library and local storage to prevent errors:
Command: `pnpm test`
Test Case Results:
Verified that the Login screen renders text inputs and buttons.
Verified navigating to the registration screen.
Tested mock logins for Student, Officer, and Admin users to confirm dashboards load role-specific views.
Output:
  ```text
  RUN  v4.1.9 /Users/user/campus-maintenance
  ✓ src/app/App.test.tsx (6 tests) 357ms
  Test Files  1 passed (1)
  Tests       6 passed (6)
  ```
 Backend API Tests
Tests run against the Express app instance using `supertest`. We mocked database queries by checking SQL keywords to prevent tests from needing a live network connection:
Command: `pnpm --filter unimaintain-backend test`
Test Case Results:
 Verified that POST `/api/auth/register` creates new users and handles duplicate emails (409 Conflict).
 Tested POST `/api/auth/login` for correct password validation and active account status check.
Verified role restrictions (RBAC) by confirming students get blocked (403 Forbidden) from hitting admin statistics and officer assignment routes.
Output:
  ```text
  RUN  v4.1.9 /Users/user/campus-maintenance/backend
  ✓ src/test/requests.test.ts (6 tests) 45ms
  ✓ src/test/auth.test.ts (5 tests) 611ms
  Test Files  2 passed (2)
  Tests       11 passed (11)







8. Deployment Information
Frontend Hosting:  Configured to be built statically into HTML/JS bundles. In production mode, the Express backend automatically serves these files, meaning the entire app runs on a single host.
Backend Hosting: Deployed inside a Docker container.
Live Deployment URL: `[Enter your live URL here, e.g., https://unimaintain-app.onrender.com]`
Database Hosting: Hosted on Supabase using their cloud PostgreSQL database cluster.
Docker Deploy Command:
  ```bash
  docker-compose up --build
  ```
  *(This spins up the web server on port 5001 and local Postgres DB on port 5432.)










9. Challenges Encountered and Solutions
 Monorepo Testing Environment Conflicts
  Hurdle:When running tests for the backend, Vitest recursively checked parent directories and tried to load the root's `vite.config.ts` (which required browser-specific setup like `jsdom`). This crashed the Node.js tests.
  Solution: Created a dedicated `backend/vite.config.ts` config and added `include` paths to restrict test folders, separating frontend browser tests from backend API tests.
Address in Use Port Conflicts
  Hurdle: During testing, importing our main application file would trigger the Express server to call `app.listen()` on port 5001, conflicting with existing processes or other concurrent test files.
  Solution:*Wrapped the server listen block in a conditional check: `if (process.env.NODE_ENV !== "test")`, preventing the server from starting a network listener during tests.
Testing Without Live Database
  Hurdle: We needed to verify backend controllers, but using a live database would slow down tests and fail in environments without database credentials.
  Solution: Mocked the database module using Vitest spies. We wrote a mock database client that inspects incoming SQL text strings and returns appropriate mock records (e.g., returning mock request lists when it detects query keywords).






10. Conclusion
The developed Campus Maintenance Request System successfully solves the problem of manual maintenance handling. By providing customized views for students, maintenance technicians, and administrators, the system ensures that issues are reported easily, assigned transparently, and resolved accountably. 

Potential Future Improvements:
Real-time WebSockets: Implement WebSockets to allow instant push notifications when ticket statuses change.
 Email Alerts: Connect the notification system to an SMTP email server (like Nodemailer) so users receive direct emails when their complaints are resolved.
QR Codes: Place QR codes on classroom doors and equipment. Scanning the code would automatically open the request form with the room or asset details filled in.


