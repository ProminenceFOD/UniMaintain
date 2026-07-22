import { Pool } from "pg";

declare const jest: any;

// Define global jest if running outside of Jest runner (e.g. in ts-node-dev)
if (typeof (global as any).jest === "undefined") {
  (global as any).jest = {
    fn: (impl?: any) => {
      const mockFn: any = (...args: any[]) => {
        mockFn.mock.calls.push(args);
        return impl ? impl(...args) : undefined;
      };
      mockFn.mock = { calls: [] };
      mockFn.mockResolvedValue = (val: any) => {
        return (global as any).jest.fn(() => Promise.resolve(val));
      };
      return mockFn;
    }
  };
}

// Mock database storage
const mockUsers: any[] = [
  {
    id: 1,
    name: "Prominence Damilola",
    email: "p.damilola@university.edu",
    password: "$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq", // password123
    role: "student",
    department: "Computer Science",
    active: true,
  },
  {
    id: 2,
    name: "Damilola Ogunlade",
    email: "d.ogunlade@admin.university.edu",
    password: "$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq",
    role: "admin",
    department: "Facilities Management",
    active: true,
  },
  {
    id: 3,
    name: "Ademola Moyinoluwa",
    email: "m.ogundipe@maintenance.edu",
    password: "$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq",
    role: "officer",
    department: "Electrical Systems",
    active: true,
  },
  {
    id: 4,
    name: "Janet Folakemi",
    email: "j.folakemi@university.edu",
    password: "$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq",
    role: "staff",
    department: "Registry",
    active: true,
  },
];

const mockRequests: any[] = [
  {
    id: "MR-2026-015", title: "Ceiling fan making loud grinding noise — Staff Office 204",
    description: "The ceiling fan in Staff Office Room 204 has been producing a loud grinding noise for two days. It is extremely disruptive during meetings and phone calls.",
    category_id: 5, category_slug: "hvac", category_name: "HVAC", priority: "medium", status: "pending",
    location: "Faculty of Sciences Block — Staff Office 204",
    submitted_by_id: 4, submitted_by_name: "Janet Folakemi", submitted_by_email: "j.folakemi@university.edu",
    assigned_to_id: null, assigned_to_name: null, has_attachment: false,
    created_at: new Date("2026-06-19T16:00:00Z"), updated_at: new Date("2026-06-19T16:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-014", title: "Ethernet ports dead — Library Study Pod 4",
    description: "All ethernet wall ports in Study Pod 4 of the Main Library are providing no connectivity.",
    category_id: 4, category_slug: "internet", category_name: "Internet", priority: "low", status: "pending",
    location: "Main Library — Study Pod 4",
    submitted_by_id: 2, submitted_by_name: "Marcus Johnson", submitted_by_email: "m.johnson@university.edu",
    assigned_to_id: null, assigned_to_name: null, has_attachment: false,
    created_at: new Date("2026-06-19T14:00:00Z"), updated_at: new Date("2026-06-19T14:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-013", title: "Wi-Fi access point offline — Library Level 2",
    description: "The Wi-Fi access point covering Level 2 of the Main Library (AP-LIB-L2-03) has been offline for 2 days.",
    category_id: 4, category_slug: "internet", category_name: "Internet", priority: "high", status: "pending",
    location: "Main Library — Level 2",
    submitted_by_id: 1, submitted_by_name: "Prominence Damilola", submitted_by_email: "p.damilola@university.edu",
    assigned_to_id: null, assigned_to_name: null, has_attachment: false,
    created_at: new Date("2026-06-19T11:00:00Z"), updated_at: new Date("2026-06-19T11:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-012", title: "Damaged floor tiles creating trip hazard — Faculty Corridor",
    description: "Several floor tiles in the main corridor outside the Faculty of Sciences staff room are cracked and raised at the edges, creating a trip hazard.",
    category_id: 6, category_slug: "other", category_name: "Other", priority: "high", status: "resolved",
    location: "Faculty of Sciences Block — Main Corridor, Floor 2",
    submitted_by_id: 4, submitted_by_name: "Janet Folakemi", submitted_by_email: "j.folakemi@university.edu",
    assigned_to_id: 5, assigned_to_name: "Tom Brennan", has_attachment: true,
    created_at: new Date("2026-06-19T10:00:00Z"), updated_at: new Date("2026-06-19T14:30:00Z"), resolved_at: new Date("2026-06-19T14:30:00Z"),
  },
  {
    id: "MR-2026-011", title: "HVAC not cooling — Lecture Hall A",
    description: "The air conditioning system in Lecture Hall A is running but producing no cool air. Room temperature consistently exceeds 28°C during lectures with 150+ students present.",
    category_id: 5, category_slug: "hvac", category_name: "HVAC", priority: "high", status: "pending",
    location: "Main Building — Lecture Hall A",
    submitted_by_id: 4, submitted_by_name: "Aiden Walsh", submitted_by_email: "a.walsh@university.edu",
    assigned_to_id: null, assigned_to_name: null, has_attachment: false,
    created_at: new Date("2026-06-19T08:30:00Z"), updated_at: new Date("2026-06-19T08:30:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-010", title: "Broken window blind — Faculty of Sciences Staff Office",
    description: "The window blind in the staff office on the 3rd floor (Room 312) is broken — the cord has snapped and the blind is stuck in a fully raised position.",
    category_id: 3, category_slug: "furniture", category_name: "Furniture", priority: "low", status: "assigned",
    location: "Faculty of Sciences Block — Staff Office 312, Floor 3",
    submitted_by_id: 4, submitted_by_name: "Janet Folakemi", submitted_by_email: "j.folakemi@university.edu",
    assigned_to_id: 5, assigned_to_name: "Tom Brennan", has_attachment: false,
    created_at: new Date("2026-06-19T07:00:00Z"), updated_at: new Date("2026-06-19T08:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-009", title: "Faulty light switch — Faculty of Sciences Meeting Room",
    description: "The light switch in the Faculty of Sciences meeting room (Room 204) is sparking when toggled and intermittently fails. This is a safety hazard.",
    category_id: 1, category_slug: "electricity", category_name: "Electricity", priority: "high", status: "assigned",
    location: "Faculty of Sciences Block — Meeting Room 204",
    submitted_by_id: 4, submitted_by_name: "Janet Folakemi", submitted_by_email: "j.folakemi@university.edu",
    assigned_to_id: 3, assigned_to_name: "Ademola Moyinoluwa", has_attachment: false,
    created_at: new Date("2026-06-18T15:30:00Z"), updated_at: new Date("2026-06-18T16:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-008", title: "Poor ventilation — Staff Office Block 2, Floor 3",
    description: "The ventilation in the staff offices on Floor 3 of Office Block 2 has been inadequate for the past week, affecting staff productivity.",
    category_id: 5, category_slug: "hvac", category_name: "HVAC", priority: "medium", status: "pending",
    location: "Office Block 2 — Floor 3, Staff Offices",
    submitted_by_id: 4, submitted_by_name: "Janet Folakemi", submitted_by_email: "j.folakemi@university.edu",
    assigned_to_id: null, assigned_to_name: null, has_attachment: false,
    created_at: new Date("2026-06-18T09:15:00Z"), updated_at: new Date("2026-06-18T09:15:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-007", title: "Leaking supply pipe under sink — Block B Restroom",
    description: "A persistent leak from the main supply pipe under sink #2 in the ground-floor male restroom of Block B. Water is pooling on the floor creating a significant slip hazard.",
    category_id: 2, category_slug: "plumbing", category_name: "Plumbing", priority: "urgent", status: "in_progress",
    location: "Block B — Ground Floor, Male Restroom",
    submitted_by_id: 2, submitted_by_name: "Marcus Johnson", submitted_by_email: "m.johnson@university.edu",
    assigned_to_id: 4, assigned_to_name: "Diana Osei", has_attachment: false,
    created_at: new Date("2026-06-17T07:45:00Z"), updated_at: new Date("2026-06-17T10:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-006", title: "Cracked window pane — Seminar Room 2",
    description: "The large south-facing window in Seminar Room 2 has a significant crack running across the lower pane. This is a safety hazard, particularly during windy conditions.",
    category_id: 6, category_slug: "other", category_name: "Other", priority: "high", status: "in_progress",
    location: "Humanities Block — Seminar Room 2",
    submitted_by_id: 3, submitted_by_name: "Priya Patel", submitted_by_email: "p.patel@university.edu",
    assigned_to_id: 5, assigned_to_name: "Tom Brennan", has_attachment: true,
    created_at: new Date("2026-06-14T09:00:00Z"), updated_at: new Date("2026-06-16T11:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-005", title: "Broken chair and damaged tables — Seminar Room 5",
    description: "One chair has a completely broken leg and two tables have severely gouged, unstable surfaces in Seminar Room 5.",
    category_id: 3, category_slug: "furniture", category_name: "Furniture", priority: "medium", status: "assigned",
    location: "Humanities Block — Seminar Room 5",
    submitted_by_id: 3, submitted_by_name: "Priya Patel", submitted_by_email: "p.patel@university.edu",
    assigned_to_id: 5, assigned_to_name: "Tom Brennan", has_attachment: true,
    created_at: new Date("2026-06-12T14:20:00Z"), updated_at: new Date("2026-06-13T09:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-004", title: "Projector lamp end-of-life — Tutorial Room 12",
    description: "The projector in Tutorial Room 12 displays a lamp warning and produces a dim, unusable image.",
    category_id: 6, category_slug: "other", category_name: "Other", priority: "medium", status: "assigned",
    location: "Engineering Block B — Tutorial Room 12",
    submitted_by_id: 4, submitted_by_name: "Aiden Walsh", submitted_by_email: "a.walsh@university.edu",
    assigned_to_id: 5, assigned_to_name: "Tom Brennan", has_attachment: false,
    created_at: new Date("2026-06-09T13:00:00Z"), updated_at: new Date("2026-06-10T09:00:00Z"), resolved_at: null,
  },
  {
    id: "MR-2026-003", title: "Blocked drains — Science Block Women's Restroom",
    description: "All 3 sinks in the women's restroom on Floor 2 of the Science Block have severely slow or completely blocked drains.",
    category_id: 2, category_slug: "plumbing", category_name: "Plumbing", priority: "medium", status: "resolved",
    location: "Science Block — Floor 2, Women's Restroom",
    submitted_by_id: 3, submitted_by_name: "Priya Patel", submitted_by_email: "p.patel@university.edu",
    assigned_to_id: 4, assigned_to_name: "Diana Osei", has_attachment: false,
    created_at: new Date("2026-06-05T10:00:00Z"), updated_at: new Date("2026-06-07T14:00:00Z"), resolved_at: new Date("2026-06-07T14:00:00Z"),
  },
  {
    id: "MR-2026-002", title: "Power outlets non-functional in Computer Lab 3",
    description: "Three power outlets on the east wall of Computer Lab 3 have been non-functional since Monday, affecting students' ability to use desktop workstations.",
    category_id: 1, category_slug: "electricity", category_name: "Electricity", priority: "high", status: "resolved",
    location: "Engineering Block A — Lab 304",
    submitted_by_id: 1, submitted_by_name: "Prominence Damilola", submitted_by_email: "p.damilola@university.edu",
    assigned_to_id: 3, assigned_to_name: "Ademola Moyinoluwa", has_attachment: true,
    created_at: new Date("2026-06-02T09:15:00Z"), updated_at: new Date("2026-06-04T14:30:00Z"), resolved_at: new Date("2026-06-04T14:30:00Z"),
  },
  {
    id: "MR-2026-001", title: "Flickering and failed lights — Block C Corridor",
    description: "Fluorescent lights in the main corridor of Block C near the student lounge have been flickering intermittently for a week. Three fixtures have gone completely dark.",
    category_id: 1, category_slug: "electricity", category_name: "Electricity", priority: "medium", status: "closed",
    location: "Block C — Main Corridor",
    submitted_by_id: 2, submitted_by_name: "Marcus Johnson", submitted_by_email: "m.johnson@university.edu",
    assigned_to_id: 3, assigned_to_name: "Ademola Moyinoluwa", has_attachment: false,
    created_at: new Date("2026-06-01T16:00:00Z"), updated_at: new Date("2026-06-04T12:00:00Z"), resolved_at: new Date("2026-06-03T15:00:00Z"),
  },
];

const mockAuditLogs: any[] = [
  { id: 1, request_id: "MR-2026-001", action: "Request Submitted", performed_by: 1, performed_by_name: "Prominence Damilola", details: "Three power outlets non-functional.", created_at: new Date("2026-06-02T09:15:00Z") },
  { id: 2, request_id: "MR-2026-001", action: "Assigned to Officer", performed_by: 5, performed_by_name: "Damilola Ogunlade", details: "Assigned to Ademola Moyinoluwa.", created_at: new Date("2026-06-03T08:05:00Z") },
  { id: 3, request_id: "MR-2026-001", action: "Work Started", performed_by: 3, performed_by_name: "Ademola Moyinoluwa", details: "Circuit breaker inspection.", created_at: new Date("2026-06-04T10:20:00Z") },
  { id: 4, request_id: "MR-2026-001", action: "Resolved", performed_by: 3, performed_by_name: "Ademola Moyinoluwa", details: "Circuit breaker replaced and tested.", created_at: new Date("2026-06-05T14:30:00Z") },
  { id: 5, request_id: "MR-2026-002", action: "Request Submitted", performed_by: 4, performed_by_name: "Janet Folakemi", details: "Leaking supply pipe under sink.", created_at: new Date("2026-06-10T07:45:00Z") },
  { id: 6, request_id: "MR-2026-002", action: "Assigned to Officer", performed_by: 5, performed_by_name: "Damilola Ogunlade", details: "Assigned to Ademola Moyinoluwa.", created_at: new Date("2026-06-10T08:30:00Z") },
  { id: 7, request_id: "MR-2026-002", action: "Work Started", performed_by: 3, performed_by_name: "Ademola Moyinoluwa", details: "Repair underway.", created_at: new Date("2026-06-10T10:00:00Z") },
];

const mockAttachments: any[] = [];

const pool = {
  query: jest.fn((sql: string, params: any[] = []) => {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();

    // ─── AUTH ENDPOINTS ───
    if (normalizedSql.includes("SELECT id FROM users WHERE email = $1")) {
      const email = params[0];
      const match = mockUsers.find((u) => u.email === email);
      return Promise.resolve({ rows: match ? [{ id: match.id }] : [] });
    }

    if (normalizedSql.includes("INSERT INTO users")) {
      const [name, email, password, role, department] = params;
      const newUser = {
        id: mockUsers.length + 1,
        name,
        email,
        password,
        role: role || "student",
        department: department || "",
        active: true,
        created_at: new Date(),
      };
      mockUsers.push(newUser);
      const { password: _pw, ...userWithoutPassword } = newUser;
      return Promise.resolve({ rows: [userWithoutPassword] });
    }

    if (normalizedSql.includes("SELECT id, name, email, password, role, department, active FROM users WHERE email = $1")) {
      const email = params[0];
      const match = mockUsers.find((u) => u.email === email);
      return Promise.resolve({ rows: match ? [match] : [] });
    }

    if (normalizedSql.includes("SELECT id, name, email, role, department, active, created_at FROM users WHERE id = $1")) {
      const id = params[0];
      const match = mockUsers.find((u) => u.id === id);
      return Promise.resolve({ rows: match ? [match] : [] });
    }

    // ─── REQUEST ENDPOINTS ───
    if (normalizedSql.includes("SELECT id FROM categories WHERE slug = $1")) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }

    if (normalizedSql.includes("SELECT generate_request_id() AS id")) {
      return Promise.resolve({ rows: [{ id: `MR-2026-${String(mockRequests.length + 1).padStart(3, "0")}` }] });
    }

    if (normalizedSql.includes("INSERT INTO service_requests")) {
      const [id, title, description, category_id, priority, location, submitted_by, has_attachment] = params;
      const creator = mockUsers.find((u) => u.id === submitted_by);
      const newReq = {
        id,
        title,
        description,
        category_id,
        category_slug: "electricity",
        category_name: "Electricity",
        priority,
        status: "pending",
        location,
        submitted_by_id: submitted_by,
        submitted_by_name: creator ? creator.name : "Test User",
        submitted_by_email: creator ? creator.email : "test@test.com",
        submitted_by_role: creator ? creator.role : "student",
        assigned_to_id: null,
        assigned_to_name: null,
        has_attachment: !!has_attachment,
        created_at: new Date(),
        updated_at: new Date(),
        resolved_at: null,
      };
      mockRequests.push(newReq);
      return Promise.resolve({ rows: [newReq] });
    }

    if (normalizedSql.includes("SELECT id FROM users WHERE role = 'admin'")) {
      const admins = mockUsers.filter((u) => u.role === "admin");
      return Promise.resolve({ rows: admins });
    }

    if (normalizedSql.includes("INSERT INTO notifications")) {
      return Promise.resolve({ rows: [] });
    }

    if (normalizedSql.includes("INSERT INTO attachments")) {
      const [request_id, filename, original_name, mime_type, size_bytes] = params;
      const newAttach = {
        id: mockAttachments.length + 1,
        request_id,
        filename,
        original_name,
        mime_type,
        size_bytes,
        created_at: new Date(),
      };
      mockAttachments.push(newAttach);
      return Promise.resolve({ rows: [newAttach] });
    }

    // COUNT QUERY for GET /api/requests
    if (normalizedSql.includes("SELECT COUNT(*)")) {
      let filtered = [...mockRequests];
      // Simulate role-based filtering checks inside the query
      if (normalizedSql.includes("submitted_by =")) {
        const userId = params[0];
        filtered = filtered.filter((r) => r.submitted_by_id === userId);
      } else if (normalizedSql.includes("assigned_to =")) {
        const officerId = params[0];
        filtered = filtered.filter((r) => r.assigned_to_id === officerId);
      }
      if (normalizedSql.includes("status =")) {
        // status is usually at index 1 or 0 depending on role filter
        const statusVal = params[params.length - 1]; // status is added last or second last
        if (typeof statusVal === "string" && ["pending", "in_progress", "resolved", "closed"].includes(statusVal)) {
          filtered = filtered.filter((r) => r.status === statusVal);
        }
      }
      return Promise.resolve({ rows: [{ count: String(filtered.length) }] });
    }

    // LIST QUERY for GET /api/requests
    if (normalizedSql.includes("SELECT sr.id") || normalizedSql.includes("SELECT *") || normalizedSql.includes("REQUEST_FIELDS")) {
      // If it's querying a single request by ID
      if (normalizedSql.includes("WHERE sr.id = $1") || normalizedSql.includes("WHERE id = $1")) {
        const reqId = params[0];
        const match = mockRequests.find((r) => r.id === reqId);
        // Map db columns to match requested alias structure
        if (match) {
          const dbRow = {
            id: match.id,
            title: match.title,
            description: match.description,
            priority: match.priority,
            status: match.status,
            location: match.location,
            submitted_by_id: match.submitted_by_id,
            submitted_by_name: match.submitted_by_name,
            submitted_by_email: match.submitted_by_email,
            assigned_to_id: match.assigned_to_id,
            assigned_to_name: match.assigned_to_name,
            has_attachment: match.has_attachment,
            category_slug: match.category_slug,
            category_name: match.category_name,
            created_at: match.created_at,
            updated_at: match.updated_at,
            resolved_at: match.resolved_at,
          };
          return Promise.resolve({ rows: [dbRow] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Otherwise it's the list query
      let filtered = [...mockRequests];
      if (normalizedSql.includes("submitted_by =")) {
        const userId = params[0];
        filtered = filtered.filter((r) => r.submitted_by_id === userId);
      } else if (normalizedSql.includes("assigned_to =")) {
        const officerId = params[0];
        filtered = filtered.filter((r) => r.assigned_to_id === officerId);
      }
      if (normalizedSql.includes("status =")) {
        const statusVal = params[params.length - 1];
        if (typeof statusVal === "string" && ["pending", "in_progress", "resolved", "closed"].includes(statusVal)) {
          filtered = filtered.filter((r) => r.status === statusVal);
        }
      }

      // Map rows for the controller which expects alias fields
      const rows = filtered.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        location: r.location,
        submitted_by_id: r.submitted_by_id,
        submitted_by_name: r.submitted_by_name,
        submitted_by_email: r.submitted_by_email,
        assigned_to_id: r.assigned_to_id,
        assigned_to_name: r.assigned_to_name,
        has_attachment: r.has_attachment,
        category_slug: r.category_slug,
        category_name: r.category_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        resolved_at: r.resolved_at,
      }));

      return Promise.resolve({ rows });
    }

    // ─── AUDIT LOGS ───
    if (normalizedSql.includes("INSERT INTO audit_logs")) {
      const [request_id, action, performed_by, details] = params;
      const performer = mockUsers.find((u) => u.id === performed_by);
      const newEntry = {
        id: mockAuditLogs.length + 1,
        request_id,
        action,
        performed_by,
        performed_by_name: performer ? performer.name : "Admin",
        details,
        created_at: new Date(),
      };
      mockAuditLogs.push(newEntry);
      return Promise.resolve({ rows: [newEntry] });
    }

    if (normalizedSql.includes("FROM audit_logs")) {
      const reqId = params[0];
      let filtered = mockAuditLogs.filter((a) => a.request_id === reqId);
      const hasSubmission = filtered.some((a) => a.action === "Request Submitted");
      if (!hasSubmission) {
        const req = mockRequests.find((r) => r.id === reqId);
        if (req) {
          filtered = [
            {
              id: `init-${reqId}`,
              request_id: reqId,
              action: "Request Submitted",
              performed_by: req.submitted_by_id,
              performed_by_name: req.submitted_by_name || "Submitter",
              details: req.description || "Submitted via portal.",
              created_at: req.created_at || new Date(),
            },
            ...filtered,
          ];
        }
      }
      return Promise.resolve({ rows: filtered });
    }

    // ─── ATTACHMENTS ───
    if (normalizedSql.includes("FROM attachments")) {
      const reqId = params[0];
      const filtered = mockAttachments.filter((a) => a.request_id === reqId);
      return Promise.resolve({ rows: filtered });
    }

    // ─── STATS ───
    if (normalizedSql.includes("SELECT COUNT(*) FROM service_requests")) {
      return Promise.resolve({ rows: [{ count: String(mockRequests.length) }] });
    }
    if (normalizedSql.includes("SELECT status, COUNT(*)")) {
      return Promise.resolve({
        rows: [
          { status: "pending", count: "0" },
          { status: "in_progress", count: "1" },
          { status: "resolved", count: "1" },
        ],
      });
    }
    if (normalizedSql.includes("SELECT c.slug, c.name, COUNT")) {
      return Promise.resolve({
        rows: [
          { slug: "electricity", name: "Electricity", count: "1" },
          { slug: "plumbing", name: "Plumbing", count: "1" },
        ],
      });
    }
    if (normalizedSql.includes("SELECT priority, COUNT(*)")) {
      return Promise.resolve({
        rows: [
          { priority: "high", count: "1" },
          { priority: "urgent", count: "1" },
        ],
      });
    }

    // ─── UPDATE REQUEST STATUS / ASSIGNMENT ───
    if (normalizedSql.includes("UPDATE service_requests")) {
      const reqId = params[params.length - 1];
      const match = mockRequests.find((r) => r.id === reqId);
      if (match) {
        if (normalizedSql.includes("assigned_to =")) {
          const officerId = params[0];
          const officer = mockUsers.find((u) => u.id === officerId);
          match.assigned_to_id = officerId;
          match.assigned_to_name = officer ? officer.name : "Officer";
          match.status = "assigned";
        }
        if (normalizedSql.includes("status = $1") || normalizedSql.includes("status = $2")) {
          const newStatus = params.find(p => typeof p === "string" && ["pending", "assigned", "in_progress", "resolved", "closed", "cancelled"].includes(p));
          if (newStatus) {
            match.status = newStatus;
            if (newStatus === "resolved") {
              match.resolved_at = new Date();
            }
          }
        }
        match.updated_at = new Date();
        return Promise.resolve({ rows: [match] });
      }
    }

    // Default fallback
    return Promise.resolve({ rows: [] });
  }),
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  }),
};

export default pool;
