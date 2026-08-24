# Entity-Relationship (ER) Diagram

**System:** Student Registration System  
**University:** University Of Liberal Arts Bangladesh (ULAB)

---

## 🖼️ High-Resolution ER Diagram Picture

![ULAB Student Registration System ER Diagram](file:///d:/web%20project/1st/docs/er_diagram.jpg)

*(The diagram image file is saved at [`docs/er_diagram.jpg`](file:///d:/web%20project/1st/docs/er_diagram.jpg))*

---

## 📐 Graphical Mermaid ER Diagram

```mermaid
erDiagram
    STUDENTS ||--o{ STATUS_HISTORY : "has audit history logs"

    STUDENTS {
        int id PK "INTEGER AUTOINCREMENT"
        string registration_id UK "VARCHAR(20) UNIQUE (e.g. REG1001)"
        string first_name "VARCHAR(50)"
        string last_name "VARCHAR(50)"
        string email UK "VARCHAR(100) UNIQUE"
        string phone UK "VARCHAR(15) UNIQUE (11 digits)"
        date date_of_birth "DATE (Min age 16)"
        string gender "VARCHAR(10) (Male/Female/Other)"
        string address "TEXT (Max 255 chars)"
        string course_name "VARCHAR(100) (CSE/SE/DSAI/EEE/BBA/MSJ)"
        string status "VARCHAR(20) (Submitted/Approved/Rejected)"
        datetime created_at "TIMESTAMP"
        datetime updated_at "TIMESTAMP"
    }

    STATUS_HISTORY {
        int id PK "INTEGER AUTOINCREMENT"
        int student_id FK "INTEGER (Foreign Key -> STUDENTS.id)"
        string old_status "VARCHAR(20)"
        string new_status "VARCHAR(20)"
        string remarks "TEXT"
        datetime updated_at "TIMESTAMP"
    }
```

---

## 📊 Structural Entity Relationship Layout

```text
+------------------------------------+           +------------------------------------+
|             STUDENTS               |           |           STATUS_HISTORY           |
+------------------------------------+           +------------------------------------+
| PK  id INTEGER AUTOINCREMENT       | 1       N | PK  id INTEGER AUTOINCREMENT       |
| UK  registration_id VARCHAR(20)    |<----------| FK  student_id INTEGER             |
|     first_name VARCHAR(50)         |           |     old_status VARCHAR(20)         |
|     last_name VARCHAR(50)          |           |     new_status VARCHAR(20)         |
| UK  email VARCHAR(100)             |           |     remarks TEXT                   |
| UK  phone VARCHAR(15)              |           |     updated_at TIMESTAMP           |
|     date_of_birth DATE             |           +------------------------------------+
|     gender VARCHAR(10)             |
|     address TEXT                   |
|     course_name VARCHAR(100)       |
|     status VARCHAR(20)             |
|     created_at TIMESTAMP           |
|     updated_at TIMESTAMP           |
+------------------------------------+
```

---

## 🔗 Relationship Cardinality & Business Rules

1. **One-to-Many Relationship (1 : N):**
   - Each `STUDENTS` record can have **multiple** entries in the `STATUS_HISTORY` table tracking every status transition (e.g. `N/A -> Submitted`, `Submitted -> Approved`).
   - Each `STATUS_HISTORY` entry belongs strictly to **one** student via the Foreign Key `student_id` referencing `students(id)`.

2. **Cascading Rule:**
   - `ON DELETE CASCADE`: If a student record is deleted, all corresponding status history logs are automatically purged.
