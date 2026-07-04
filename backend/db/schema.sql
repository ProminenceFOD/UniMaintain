-- UniMaintain Database Schema
-- Run: psql -U postgres -d unimaintain -f db/schema.sql

-- Drop existing tables (for clean reset)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('student', 'staff', 'officer', 'admin')),
  department  VARCHAR(255),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  slug  VARCHAR(100) UNIQUE NOT NULL
);

-- ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────
CREATE TABLE service_requests (
  id              VARCHAR(20) PRIMARY KEY,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  category_id     INTEGER REFERENCES categories(id),
  priority        VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled')),
  location        VARCHAR(500),
  submitted_by    INTEGER NOT NULL REFERENCES users(id),
  assigned_to     INTEGER REFERENCES users(id),
  has_attachment  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  resolved_at     TIMESTAMP
);

-- Auto-generate request IDs: MR-2026-001
CREATE SEQUENCE request_seq START 1;

CREATE OR REPLACE FUNCTION generate_request_id() RETURNS VARCHAR AS $$
BEGIN
  RETURN 'MR-2026-' || LPAD(nextval('request_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id           SERIAL PRIMARY KEY,
  request_id   VARCHAR(20) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  action       VARCHAR(255) NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  details      TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  request_id  VARCHAR(20) REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── ATTACHMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE attachments (
  id            SERIAL PRIMARY KEY,
  request_id    VARCHAR(20) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  size_bytes    INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_requests_submitted_by ON service_requests(submitted_by);
CREATE INDEX idx_requests_assigned_to  ON service_requests(assigned_to);
CREATE INDEX idx_requests_status       ON service_requests(status);
CREATE INDEX idx_audit_request_id      ON audit_logs(request_id);
CREATE INDEX idx_notifications_user    ON notifications(user_id);
