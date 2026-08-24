const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'student_system.db');
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

// Initialize Tables & Indexes
async function initDb() {
  try {
    await dbRun('PRAGMA foreign_keys = ON');

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

      CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
      CREATE INDEX IF NOT EXISTS idx_students_registration ON students(registration_id);
      CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
    `);
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
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
  generateRegistrationId
};
