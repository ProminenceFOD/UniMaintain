-- UniMaintain Seed Data
-- Run AFTER schema.sql: psql -U postgres -d unimaintain -f db/seed.sql
-- Passwords are bcrypt hashes of "password123"

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
INSERT INTO categories (name, slug) VALUES
  ('Electricity', 'electricity'),
  ('Plumbing',    'plumbing'),
  ('Furniture',   'furniture'),
  ('Internet',    'internet'),
  ('HVAC',        'hvac'),
  ('Other',       'other');

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- bcrypt hash of "password123" (saltRounds=10)
INSERT INTO users (name, email, password, role, department, created_at) VALUES
  -- Admins first
  ('Damilola Ogunlade',    'd.ogunlade@admin.university.edu',  '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'admin',    'Facilities Management',   '2026-06-01'),
  ('James Liu',            'j.liu@admin.university.edu',       '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'admin',    'IT Administration',       '2026-06-01'),
  -- Officers next
  ('Ademola Moyinoluwa',   'm.ogundipe@maintenance.edu',       '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'officer',  'Electrical Systems',      '2026-06-02'),
  ('Diana Osei',           'd.osei@maintenance.edu',           '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'officer',  'Plumbing & Civil',        '2026-06-03'),
  ('Tom Brennan',          't.brennan@maintenance.edu',        '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'officer',  'General Maintenance',     '2026-06-04'),
  -- Students last
  ('Prominence Damilola',  'p.damilola@university.edu',        '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'student',  'Computer Science',        '2026-06-10'),
  ('Marcus Johnson',       'm.johnson@university.edu',         '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'student',  'Mechanical Engineering',  '2026-06-12'),
  ('Priya Patel',          'p.patel@university.edu',           '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'student',  'Business Administration', '2026-06-14'),
  ('Aiden Walsh',          'a.walsh@university.edu',           '$2a$10$bBFttzsstcSH4/d5lZyAPeopyLjKbc0eBugjZqpmS1B58ncPZLUsq', 'student',  'Architecture',            '2026-06-16');

-- ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────
INSERT INTO service_requests (id, title, description, category_id, priority, status, location, submitted_by, assigned_to, has_attachment, created_at, updated_at, resolved_at) VALUES
  ('MR-2026-001', 'Power outlets non-functional in Computer Lab 3',
   'Three power outlets on the east wall of Computer Lab 3 have been non-functional since Monday, affecting students during scheduled lab sessions.',
   1, 'high', 'resolved', 'Engineering Block A — Lab 304', 1, 5, TRUE,
   '2026-06-02 09:15:00', '2026-06-05 14:30:00', '2026-06-05 14:30:00'),

  ('MR-2026-002', 'Leaking supply pipe under sink — Block B Restroom',
   'A persistent leak from the main supply pipe under sink #2 in the ground-floor male restroom. Water is pooling, creating a slip hazard.',
   2, 'urgent', 'in_progress', 'Block B — Ground Floor, Male Restroom', 2, 6, FALSE,
   '2026-06-10 07:45:00', '2026-06-10 10:00:00', NULL),

  ('MR-2026-003', 'Broken chair and damaged tables — Seminar Room 5',
   'One chair has a completely broken leg and two tables have severely damaged surfaces. Safety concern for students using this room.',
   3, 'medium', 'assigned', 'Humanities Block — Seminar Room 5', 3, 7, TRUE,
   '2026-06-04 14:20:00', '2026-06-05 09:00:00', NULL),

  ('MR-2026-004', 'Wi-Fi access point offline — Library Level 2',
   'The Wi-Fi access point covering Level 2 of the Main Library (AP-LIB-L2-03) has been offline for 2 days.',
   4, 'high', 'pending', 'Main Library — Level 2', 1, NULL, FALSE,
   '2026-06-19 11:00:00', '2026-06-19 11:00:00', NULL),

  ('MR-2026-005', 'HVAC not cooling — Lecture Hall A',
   'Air conditioning system is running but not cooling. Room temperature exceeds 28°C with 150+ students present.',
   5, 'high', 'pending', 'Main Building — Lecture Hall A', 4, NULL, FALSE,
   '2026-06-19 08:30:00', '2026-06-19 08:30:00', NULL),

  ('MR-2026-006', 'Flickering and failed lights — Block C Corridor',
   'Fluorescent lights in the main corridor have been flickering for a week. Three fixtures have gone completely dark.',
   1, 'medium', 'closed', 'Block C — Main Corridor', 2, 5, FALSE,
   '2026-06-08 16:00:00', '2026-06-14 12:00:00', '2026-06-13 15:00:00'),

  ('MR-2026-007', 'Blocked drains — Science Block Women''s Restroom',
   'All 3 sinks in the women''s restroom on Floor 2 have severely blocked drains, causing water to back up.',
   2, 'medium', 'resolved', 'Science Block — Floor 2, Women''s Restroom', 3, 6, FALSE,
   '2026-06-14 10:00:00', '2026-06-02 14:00:00', '2026-06-02 14:00:00'),

  ('MR-2026-008', 'Projector lamp end-of-life — Tutorial Room 12',
   'Projector displays a lamp warning and produces a dim, unusable image. Lamp requires replacement.',
   6, 'medium', 'assigned', 'Engineering Block B — Tutorial Room 12', 4, 7, FALSE,
   '2026-06-05 13:00:00', '2026-06-10 09:00:00', NULL),

  ('MR-2026-009', 'Ethernet ports dead — Library Study Pod 4',
   'All ethernet wall ports in Study Pod 4 are providing no connectivity.',
   4, 'low', 'pending', 'Main Library — Study Pod 4', 2, NULL, FALSE,
   '2026-06-19 14:00:00', '2026-06-19 14:00:00', NULL),

  ('MR-2026-010', 'Cracked window pane — Seminar Room 2',
   'The large south-facing window has a significant crack. Safety hazard during windy conditions.',
   6, 'high', 'in_progress', 'Humanities Block — Seminar Room 2', 3, 7, TRUE,
   '2026-06-03 09:00:00', '2026-06-05 11:00:00', NULL);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
INSERT INTO audit_logs (request_id, action, performed_by, details, created_at) VALUES
  ('MR-2026-001', 'Request Submitted',  1, 'Submitted with 2 photo attachments showing affected outlets.',           '2026-06-02 09:15:00'),
  ('MR-2026-001', 'Priority Upgraded',  8, 'Priority raised from Medium to High — active lab sessions impacted.',   '2026-06-03 08:00:00'),
  ('MR-2026-001', 'Assigned to Officer',8, 'Assigned to Ademola Moyinoluwa (Electrical Systems).',                  '2026-06-03 08:05:00'),
  ('MR-2026-001', 'Work Started',       5, 'Faulty circuit breaker identified — replacement parts ordered.',         '2026-06-04 10:20:00'),
  ('MR-2026-001', 'Resolved',           5, 'Circuit breaker replaced. All 3 outlets confirmed operational.',         '2026-06-05 14:30:00'),

  ('MR-2026-002', 'Request Submitted',  2, 'Urgent: active leak with water pooling. Slip hazard reported.',          '2026-06-10 07:45:00'),
  ('MR-2026-002', 'Assigned to Officer',8, 'Escalated and assigned to Diana Osei (Plumbing & Civil) immediately.',  '2026-06-10 08:30:00'),
  ('MR-2026-002', 'Work Started',       6, 'Water supply isolated. Wet floor signage placed. Repair underway.',      '2026-06-10 10:00:00'),

  ('MR-2026-003', 'Request Submitted',  3, 'Submitted with photos of broken chair and damaged table surfaces.',      '2026-06-04 14:20:00'),
  ('MR-2026-003', 'Assigned to Officer',8, 'Assigned to Tom Brennan (General Maintenance).',                        '2026-06-05 09:00:00'),

  ('MR-2026-004', 'Request Submitted',  1, 'Offline AP identified: AP-LIB-L2-03. Affects entire Level 2 zone.',     '2026-06-19 11:00:00'),
  ('MR-2026-005', 'Request Submitted',  4, 'HVAC running but not cooling. 150+ students affected per lecture.',      '2026-06-19 08:30:00'),

  ('MR-2026-006', 'Request Submitted',  2, 'Flickering lights and 3 dead fixtures in main corridor.',               '2026-06-08 16:00:00'),
  ('MR-2026-006', 'Assigned to Officer',8, 'Assigned to Ademola Moyinoluwa.',                                       '2026-06-09 09:00:00'),
  ('MR-2026-006', 'Work Started',       5, 'Inspecting ballasts and wiring throughout the corridor.',               '2026-06-11 11:00:00'),
  ('MR-2026-006', 'Resolved',           5, 'All faulty fixtures replaced. Corridor fully lit and tested.',          '2026-06-13 15:00:00'),
  ('MR-2026-006', 'Closed',             8, 'Resolution confirmed on site. Request closed.',                         '2026-06-14 12:00:00'),

  ('MR-2026-007', 'Request Submitted',  3, 'All 3 sinks blocked, water backing up into basin.',                     '2026-06-14 10:00:00'),
  ('MR-2026-007', 'Assigned to Officer',8, 'Assigned to Diana Osei.',                                              '2026-06-15 08:00:00'),
  ('MR-2026-007', 'Resolved',           6, 'Drains cleared. Heavy grease removed from all 3 sink traps.',           '2026-06-02 14:00:00'),

  ('MR-2026-008', 'Request Submitted',  4, 'Lamp warning active. Image barely visible, unusable for lectures.',     '2026-06-05 13:00:00'),
  ('MR-2026-008', 'Assigned to Officer',8, 'Assigned to Tom Brennan for lamp replacement.',                         '2026-06-10 09:00:00'),

  ('MR-2026-009', 'Request Submitted',  2, 'All 4 ethernet ports dead. Tested with multiple cables.',               '2026-06-19 14:00:00'),

  ('MR-2026-010', 'Request Submitted',  3, 'Large crack in window pane. Safety risk flagged.',                      '2026-06-03 09:00:00'),
  ('MR-2026-010', 'Priority Upgraded',  8, 'Elevated to High due to structural safety concern.',                    '2026-06-04 08:00:00'),
  ('MR-2026-010', 'Assigned to Officer',8, 'Assigned to Tom Brennan.',                                             '2026-06-04 08:05:00'),
  ('MR-2026-010', 'Work Started',       7, 'Temporary protective film applied. Replacement glass on order.',         '2026-06-05 11:00:00');

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, title, message, read, request_id, created_at) VALUES
  (1, 'Request Resolved',     'MR-2026-001: Power outlets repaired by Ademola Moyinoluwa.', FALSE, 'MR-2026-001', '2026-06-05 14:35:00'),
  (1, 'Request Received',     'MR-2026-004: Your Wi-Fi request is under review.',           TRUE,  'MR-2026-004', '2026-06-19 11:05:00'),
  (2, 'Request Assigned',     'MR-2026-002: Diana Osei has been assigned your request.',    FALSE, 'MR-2026-002', '2026-06-10 08:35:00'),
  (5, 'New Assignment',       'MR-2026-001: Power outlet fault assigned to you.',           TRUE,  'MR-2026-001', '2026-06-03 08:10:00'),
  (6, 'New Assignment',       'MR-2026-002: Urgent — leaking pipe assigned to you.',        FALSE, 'MR-2026-002', '2026-06-10 08:35:00'),
  (7, 'New Assignment',       'MR-2026-003: Furniture repair in Seminar Room 5.',           FALSE, 'MR-2026-003', '2026-06-05 09:05:00'),
  (8, 'New Urgent Request',   'MR-2026-002: Leaking pipe — immediate attention required.',  FALSE, 'MR-2026-002', '2026-06-10 07:50:00'),
  (8, 'High Priority Request','MR-2026-005: HVAC failure in Lecture Hall A.',               FALSE, 'MR-2026-005', '2026-06-19 08:35:00');

-- Update sequence so new requests continue from 11
SELECT setval('request_seq', 10);
