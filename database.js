const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'student_system.db');
const db = new sqlite3.Database(dbPath);

// Promisified Database Helper Methods
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbExec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Helper to extract department code from course_name string
function extractDepartment(courseName = '') {
  const upper = (courseName || '').toUpperCase();
  if (upper.includes('COMPUTER SCIENCE') || upper.includes('CSE')) return 'CSE';
  if (upper.includes('SOFTWARE ENGINEERING') || upper.includes('SE')) return 'SE';
  if (upper.includes('DATA SCIENCE') || upper.includes('DSAI')) return 'DSAI';
  if (upper.includes('ELECTRICAL') || upper.includes('EEE')) return 'EEE';
  if (upper.includes('BUSINESS') || upper.includes('BBA')) return 'BBA';
  if (upper.includes('MEDIA') || upper.includes('JOURNALISM') || upper.includes('MSJ')) return 'MSJ';
  return 'CSE';
}

// Initialize Tables & Indexes
async function initDb() {
  try {
    await dbRun('PRAGMA foreign_keys = ON');
    await dbRun('PRAGMA journal_mode = WAL');

    await dbExec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        date_of_birth TEXT NOT NULL,
        gender TEXT NOT NULL,
        address TEXT NOT NULL,
        course_name TEXT NOT NULL,
        department TEXT,
        semester TEXT DEFAULT 'Spring',
        academic_year TEXT DEFAULT '2026',
        password TEXT,
        is_password_changed INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Submitted',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        old_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        remarks TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT UNIQUE NOT NULL,
        course_title TEXT NOT NULL,
        credit_hours REAL NOT NULL DEFAULT 3.0,
        department TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offered_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        department TEXT NOT NULL,
        semester TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        is_open INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE (course_id, department, semester, academic_year)
      );

      CREATE TABLE IF NOT EXISTS course_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        semester TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        total_credits REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Completed',
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE (student_id, semester, academic_year)
      );

      CREATE TABLE IF NOT EXISTS course_registration_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        FOREIGN KEY (registration_id) REFERENCES course_registrations(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE (registration_id, course_id)
      );

      CREATE TABLE IF NOT EXISTS semester_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        registration_id INTEGER,
        semester TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        total_credits REAL NOT NULL DEFAULT 0,
        rate_per_credit REAL NOT NULL DEFAULT 5000.0,
        gross_amount REAL NOT NULL DEFAULT 0,
        discount_percentage REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        net_amount REAL NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'Unpaid',
        paid_at DATETIME,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (registration_id) REFERENCES course_registrations(id) ON DELETE CASCADE,
        UNIQUE (student_id, semester, academic_year)
      );

      CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
      CREATE INDEX IF NOT EXISTS idx_students_registration ON students(registration_id);
      CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
      CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department);
      CREATE INDEX IF NOT EXISTS idx_offered_dept_sem ON offered_courses(department, semester, academic_year);
      CREATE INDEX IF NOT EXISTS idx_bills_student ON semester_bills(student_id);
      CREATE INDEX IF NOT EXISTS idx_bills_status ON semester_bills(payment_status);
      CREATE INDEX IF NOT EXISTS idx_bills_term ON semester_bills(semester, academic_year);
    `);

    // Column Migrations for existing database instances
    const columns = await dbAll("PRAGMA table_info(students)");
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('password')) {
      await dbRun("ALTER TABLE students ADD COLUMN password TEXT");
    }
    if (!colNames.includes('is_password_changed')) {
      await dbRun("ALTER TABLE students ADD COLUMN is_password_changed INTEGER DEFAULT 0");
    }
    if (!colNames.includes('department')) {
      await dbRun("ALTER TABLE students ADD COLUMN department TEXT");
    }
    if (!colNames.includes('semester')) {
      await dbRun("ALTER TABLE students ADD COLUMN semester TEXT DEFAULT 'Spring'");
    }
    if (!colNames.includes('academic_year')) {
      await dbRun("ALTER TABLE students ADD COLUMN academic_year TEXT DEFAULT '2026'");
    }

    // Populate department and password for existing students
    const existingStudents = await dbAll("SELECT id, registration_id, course_name, department, password, status FROM students");
    for (const s of existingStudents) {
      const dept = s.department || extractDepartment(s.course_name);
      // If approved and no password, assign registration_id as default password
      const pwd = s.password || (s.status === 'Approved' ? s.registration_id : null);
      await dbRun("UPDATE students SET department = ?, password = COALESCE(password, ?) WHERE id = ?", [dept, pwd, s.id]);
    }

    // Pre-seed Course Catalog
    await seedCourseCatalog();

    // Auto-generate semester bills for existing course registrations
    const existingRegistrations = await dbAll(`
      SELECT cr.* 
      FROM course_registrations cr
      LEFT JOIN semester_bills sb ON cr.student_id = sb.student_id AND cr.semester = sb.semester AND cr.academic_year = sb.academic_year
      WHERE sb.id IS NULL
    `);

    for (const reg of existingRegistrations) {
      const credits = reg.total_credits || 0;
      const rate = 5000.0;
      const gross = credits * rate;
      const discount = 0;
      const net = gross;
      await dbRun(`
        INSERT OR IGNORE INTO semester_bills 
        (student_id, registration_id, semester, academic_year, total_credits, rate_per_credit, gross_amount, discount_percentage, discount_amount, net_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'Unpaid')
      `, [reg.student_id, reg.id, reg.semester, reg.academic_year, credits, rate, gross, net]);
    }

  } catch (err) {
    console.error('Failed to initialize database tables:', err);
  }
}

async function seedCourseCatalog() {
  const existingCount = await dbGet('SELECT COUNT(*) as c FROM courses');
  if (existingCount && existingCount.c > 0) {
    return;
  }

  const courseList = [
    // CSE
    { code: 'CSE101', title: 'Structured Programming Language', credits: 3.0, dept: 'CSE', desc: 'Core C/C++ programming concepts and problem solving.' },
    { code: 'CSE102', title: 'Structured Programming Lab', credits: 1.5, dept: 'CSE', desc: 'Hands-on programming laboratory.' },
    { code: 'CSE201', title: 'Discrete Mathematics', credits: 3.0, dept: 'CSE', desc: 'Set theory, logic, graphs, and combinatorics.' },
    { code: 'CSE203', title: 'Data Structures', credits: 3.0, dept: 'CSE', desc: 'Arrays, linked lists, trees, and hashing algorithms.' },
    { code: 'CSE204', title: 'Data Structures Lab', credits: 1.5, dept: 'CSE', desc: 'Implementation of data structures in code.' },
    { code: 'CSE301', title: 'Database Management Systems', credits: 3.0, dept: 'CSE', desc: 'Relational design, SQL, normalization, and indexing.' },
    { code: 'CSE305', title: 'Algorithms Analysis & Design', credits: 3.0, dept: 'CSE', desc: 'Sorting, divide-and-conquer, greedy, dynamic programming.' },

    // SE
    { code: 'SE101', title: 'Introduction to Software Engineering', credits: 3.0, dept: 'SE', desc: 'Software development lifecycle and methodologies.' },
    { code: 'SE201', title: 'Object-Oriented Design & Patterns', credits: 3.0, dept: 'SE', desc: 'Design principles, SOLID, and structural design patterns.' },
    { code: 'SE301', title: 'Software Testing & Quality Assurance', credits: 3.0, dept: 'SE', desc: 'Unit testing, TDD, and test automation frameworks.' },

    // DSAI
    { code: 'DSAI101', title: 'Foundations of Artificial Intelligence', credits: 3.0, dept: 'DSAI', desc: 'State space search, heuristics, logic, and agents.' },
    { code: 'DSAI201', title: 'Data Mining & Machine Learning', credits: 3.0, dept: 'DSAI', desc: 'Supervised and unsupervised learning techniques.' },
    { code: 'DSAI301', title: 'Deep Learning & Neural Networks', credits: 3.0, dept: 'DSAI', desc: 'CNNs, RNNs, Transformers, and PyTorch.' },

    // EEE
    { code: 'EEE101', title: 'Electrical Circuits I', credits: 3.0, dept: 'EEE', desc: 'DC network theorems, nodal and mesh analysis.' },
    { code: 'EEE102', title: 'Electrical Circuits Lab', credits: 1.5, dept: 'EEE', desc: 'Circuit measurement and verification lab.' },
    { code: 'EEE201', title: 'Electronic Devices & Circuits', credits: 3.0, dept: 'EEE', desc: 'Diodes, BJTs, MOSFETs, and amplifier stages.' },
    { code: 'EEE301', title: 'Signals and Systems', credits: 3.0, dept: 'EEE', desc: 'Continuous and discrete time signal analysis.' },

    // BBA
    { code: 'BBA101', title: 'Principles of Management', credits: 3.0, dept: 'BBA', desc: 'Organizational behavior, leadership, and management.' },
    { code: 'BBA102', title: 'Principles of Marketing', credits: 3.0, dept: 'BBA', desc: 'Consumer behavior, marketing mix, and branding.' },
    { code: 'BBA201', title: 'Financial Accounting', credits: 3.0, dept: 'BBA', desc: 'Financial statements, double-entry ledger, and auditing.' },
    { code: 'BBA205', title: 'Business Communication', credits: 3.0, dept: 'BBA', desc: 'Corporate reports, presentations, and technical writing.' },

    // MSJ
    { code: 'MSJ101', title: 'Introduction to Mass Communication', credits: 3.0, dept: 'MSJ', desc: 'Mass communication models, media ethics, and news theory.' },
    { code: 'MSJ201', title: 'News Reporting & Editing', credits: 3.0, dept: 'MSJ', desc: 'Investigative reporting, print media, and editorial craft.' },
    { code: 'MSJ301', title: 'Digital Media Production', credits: 3.0, dept: 'MSJ', desc: 'Multimedia journalism, podcasting, and video production.' }
  ];

  for (const c of courseList) {
    await dbRun(
      'INSERT INTO courses (course_code, course_title, credit_hours, department, description) VALUES (?, ?, ?, ?, ?)',
      [c.code, c.title, c.credits, c.dept, c.desc]
    );
  }

  // Pre-seed default Spring 2026 offerings for all courses
  const allCourses = await dbAll('SELECT id, department FROM courses');
  for (const c of allCourses) {
    await dbRun(
      'INSERT OR IGNORE INTO offered_courses (course_id, department, semester, academic_year, is_open) VALUES (?, ?, ?, ?, 1)',
      [c.id, c.department, 'Spring', '2026']
    );
  }
}

initDb();

/**
 * Generate next unique Registration ID (e.g. REG1001, REG1002...)
 */
async function generateRegistrationId() {
  const row = await dbGet('SELECT MAX(id) as max_id FROM students');
  const nextNumber = (row && row.max_id) ? 1000 + row.max_id + 1 : 1001;
  return `REG${nextNumber}`;
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  dbExec,
  generateRegistrationId,
  extractDepartment
};
