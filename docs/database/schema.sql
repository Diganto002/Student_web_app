-- ============================================================
-- Student Registration System - Database DDL Schema Script
-- Database Engine: SQLite3
-- University Of Liberal Arts Bangladesh (ULAB)
-- ============================================================

-- Enable Foreign Keys Enforcement
PRAGMA foreign_keys = ON;

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
  address TEXT NOT NULL,
  course_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Approved', 'Rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Status History Audit Table
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  remarks TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_registration ON students(registration_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
