# System Architecture & Design Diagrams
**Project:** Student Registration & Admission Management System  
**Institution:** University of Liberal Arts Bangladesh (ULAB)  
**Stack:** Node.js, Express.js, SQLite (WAL mode), Tailwind CSS, Vanilla JS, DeepSeek-v4-flash, Groq API  

---

## 📑 Table of Contents
1. [Use Case Diagram](#1-use-case-diagram)
2. [Class Diagram (Architecture & Object Models)](#2-class-diagram)
3. [Data Flow Diagram - Level 0 (Context Diagram)](#3-data-flow-diagram-level-0-context-diagram)
4. [Data Flow Diagram - Level 1 (Detailed Subsystems)](#4-data-flow-diagram-level-1-detailed-processes)
5. [Entity-Relationship (ER) Diagram](#5-entity-relationship-er-diagram)
6. [Application State Machine Diagram](#6-application-state-machine-diagram)

---

## 1. Use Case Diagram

The Use Case Diagram captures the interactions between external actors (**Applicant / Student**, **Approved Student**, **Admissions Administrator**, and **External AI Gateway**) and the core subsystems of the ULAB portal.

### Visual Diagram:
![Use Case Diagram](images/use_case_diagram.jpg)
*(High-definition vector version available at [`docs/use_case_diagram.svg`](file:///d:/web%20project/1st/docs/use_case_diagram.svg))*

```mermaid
flowchart TD
    %% Actors
    Applicant(("🧑 Applicant / Public"))
    ApprovedStudent(("🎓 Approved Student"))
    Admin(("🔐 Admissions Admin"))
    AiService(("🤖 AI LLM Gateway<br/>(DeepSeek / Groq)"))

    %% Subsystem Boundary
    subgraph SystemBoundary ["ULAB Student Registration & Academic Portal"]
        %% Public Admission Use Cases
        UC1(["Submit Online Admission Application"])
        UC2(["Validate Input Data<br/>(Age >= 16, 11-digit Phone, Unique Email)"])
        UC3(["Track Application Status by REG ID"])
        UC4(["Inquire with AI Admissions Bot"])

        %% Student Portal & Advising Use Cases
        UC5(["Student Portal Login<br/>(Verified Approved Status)"])
        UC6(["Mandatory Initial Password Change"])
        UC7(["View Student Profile & Details"])
        UC8(["Register Semester Courses"])
        UC9(["Enforce Credit Limit<br/>(Max 15.0 Credits)"])
        UC10(["Generate & Print Advising Slip"])

        %% Admin Management Use Cases
        UC11(["Authenticate Admin<br/>(Bearer Token Issuance)"])
        UC12(["View Dashboard & Metrics"])
        UC13(["Approve Application<br/>(Auto-Generate Credentials)"])
        UC14(["Reject Application<br/>(Add Admin Remarks)"])
        UC15(["Manage Approved Students Roster"])
        UC16(["Manage University Course Catalog"])
        UC17(["Assign Department Course Offerings"])
        UC18(["Toggle Course Offering Availability"])
    end

    %% Applicant Relationships
    Applicant --> UC1
    Applicant --> UC3
    Applicant --> UC4

    %% Approved Student Relationships
    ApprovedStudent --> UC5
    ApprovedStudent --> UC7
    ApprovedStudent --> UC8
    ApprovedStudent --> UC10

    %% Admin Relationships
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
    Admin --> UC17
    Admin --> UC18

    %% Include Relationships
    UC1 -.->|<<include>>| UC2
    UC5 -.->|<<include>>| UC6
    UC8 -.->|<<include>>| UC9

    %% AI Service Relationships
    UC4 <--> AiService
```

---

## 2. Class Diagram

The Class Diagram illustrates the structural blueprint of the system, including API controllers, middleware functions, database helpers, entities, and relationships.

```mermaid
classDiagram
    direction TB

    class StudentController {
        +createStudent(req: Request, res: Response): Promise~void~
        +getStudents(req: Request, res: Response): Promise~void~
        +getStudentById(req: Request, res: Response): Promise~void~
        +approveStudent(req: Request, res: Response): Promise~void~
        +rejectStudent(req: Request, res: Response): Promise~void~
    }

    class AdminController {
        +adminLogin(req: Request, res: Response): void
    }

    class AiController {
        -SYSTEM_PROMPT: String
        -stripThinkingTags(text: String): String
        -callGroq(model: String): Promise~Response~
        -callAgentRouter(model: String): Promise~Response~
        +chatWithAi(req: Request, res: Response): Promise~void~
    }

    class DatabaseService {
        -db: Database
        +initDb(): Promise~void~
        +dbRun(sql: String, params: Array): Promise~Object~
        +dbGet(sql: String, params: Array): Promise~Object~
        +dbAll(sql: String, params: Array): Promise~Array~
        +dbExec(sql: String): Promise~void~
        +generateRegistrationId(): Promise~String~
    }

    class ValidationMiddleware {
        +validateStudentRegistration: Array~ValidationChain~
        +validateAiChatRequest: Array~ValidationChain~
    }

    class AuthMiddleware {
        +ADMIN_TOKEN: String
        +verifyAdminToken(req: Request, res: Response, next: NextFunction): void
    }

    class Student {
        +id: Integer [PK]
        +registration_id: String [UK]
        +first_name: String
        +last_name: String
        +email: String [UK]
        +phone: String [UK]
        +date_of_birth: Date
        +gender: String
        +address: String
        +course_name: String
        +status: ApplicationStatus
        +created_at: DateTime
        +updated_at: DateTime
    }

    class StatusHistory {
        +id: Integer [PK]
        +student_id: Integer [FK]
        +old_status: String
        +new_status: String
        +remarks: String
        +updated_at: DateTime
    }

    class ApplicationStatus {
        <<enumeration>>
        SUBMITTED
        APPROVED
        REJECTED
    }

    class AiProvider {
        <<enumeration>>
        DEEPSEEK_V4_FLASH
        GROQ
    }

    %% Associations & Dependencies
    StudentController ..> ValidationMiddleware : uses
    StudentController ..> AuthMiddleware : authorized by
    StudentController --> DatabaseService : queries / updates
    StudentController ..> Student : manages
    StudentController ..> StatusHistory : logs
    AdminController ..> AuthMiddleware : generates token
    AiController ..> ValidationMiddleware : uses
    AiController ..> AiProvider : routes to

    Student "1" *-- "many" StatusHistory : has audit history
    Student --> ApplicationStatus : current state
```

---

## 3. Data Flow Diagram: Level 0 (Context Diagram)

The Context Diagram defines the external boundaries, environmental entities, and high-level input/output data flows interacting with the admission system.

```mermaid
flowchart TD
    Student["🧑 Applicant / Student"]
    Admin["🔐 Admissions Administrator"]
    System(("0.0<br/>ULAB Student Registration<br/>& Admission System"))
    AiGateway["🌐 External AI Gateway<br/>(AgentRouter / Groq Cloud)"]

    %% Student Data Flows
    Student -->|1. Registration Form Data (Demographics, Program)| System
    Student -->|2. Status Lookup Request (REG ID)| System
    Student -->|3. AI Admission Inquiry (Question + Selected Model)| System

    System -->|4. Confirmation with Generated Registration ID| Student
    System -->|5. Real-Time Application Status & Audit History| Student
    System -->|6. AI Grounded Answer & Guidance| Student

    %% Admin Data Flows
    Admin -->|7. Admin Credentials (spetrum / admin123)| System
    Admin -->|8. Query / Filter Parameters (Status, Search, Page)| System
    Admin -->|9. Status Decision (Approve / Reject + Remarks)| System

    System -->|10. Authentication Bearer Token| Admin
    System -->|11. Paginated Student Records & Metric Stats| Admin
    System -->|12. Action Confirmation & Updated Audit Log| Admin

    %% AI Gateway Data Flows
    System -->|13. Prompt Payload (System Context + Messages)| AiGateway
    AiGateway -->|14. Completion Response / Reasoning| System
```

---

## 4. Data Flow Diagram: Level 1 (Detailed Processes)

Level 1 breaks down the main system into specific sub-processes and data stores.

```mermaid
flowchart TD
    subgraph ExternalEntities ["External Entities"]
        Student["🧑 Applicant / Student"]
        Admin["🔐 Admissions Admin"]
        AiProvider["🌐 AI Cloud APIs<br/>(AgentRouter / Groq)"]
    end

    subgraph Processes ["Application Processes"]
        P1["1.0 Validate Registration Input<br/>(Age, Phone, Format)"]
        P2["2.0 Generate ID & Persist Record<br/>(REG10XX, Default Submitted)"]
        P3["3.0 Track Application & Fetch History"]
        P4["4.0 Authenticate Admin & Issue Token"]
        P5["5.0 Manage Applications & Dashboard Stats<br/>(Filter, Search, Paginate)"]
        P6["6.0 Process Status Decision<br/>(Verify Submitted & Lock State)"]
        P7["7.0 AI Admission Assistant<br/>(Route to DeepSeek / Groq)"]
    end

    subgraph DataStores ["Data Stores (SQLite)"]
        D1[("D1: Students Table")]
        D2[("D2: Status History Table")]
    end

    %% Process 1 & 2
    Student -->|Submit Details| P1
    P1 -->|Validated Data| P2
    P2 -->|Save New Student| D1
    P2 -->|Log Initial Status: Submitted| D2
    P2 -->|Registration Success + REG ID| Student

    %% Process 3
    Student -->|Lookup REG ID| P3
    P3 -->|Query Record| D1
    P3 -->|Query Timeline| D2
    P3 -->|Status Details & Audit Log| Student

    %% Process 4
    Admin -->|Credentials| P4
    P4 -->|Bearer Token| Admin

    %% Process 5
    Admin -->|Search & Filter Query| P5
    P5 -->|Read Students & Counts| D1
    P5 -->|Student List & Live Stats| Admin

    %% Process 6
    Admin -->|Bearer Token + Decision + Remarks| P6
    P6 -->|Check Current Status| D1
    P6 -->|Update Status: Approved/Rejected| D1
    P6 -->|Append Audit Entry| D2
    P6 -->|Decision Confirmation| Admin

    %% Process 7
    Student -->|Chat Question + Model Choice| P7
    P7 -->|Request Completion| AiProvider
    AiProvider -->|Raw Completion| P7
    P7 -->|Sanitized Admission Guidance| Student
```

---

## 5. Entity-Relationship (ER) Diagram

Detailed database structure depicting primary keys, unique constraints, foreign keys, and indexes across all 6 relational tables.

### Visual Diagram:
![Entity-Relationship Diagram](images/er_diagram.jpg)
*(High-definition vector version available at [`docs/er_diagram.svg`](file:///d:/web%20project/1st/docs/er_diagram.svg))*

```mermaid
erDiagram
    STUDENTS ||--o{ STATUS_HISTORY : "tracks audit transitions (1 : N)"
    STUDENTS ||--o{ COURSE_REGISTRATIONS : "submits term advisings (1 : N)"
    COURSES ||--o{ OFFERED_COURSES : "offered in terms (1 : N)"
    COURSE_REGISTRATIONS ||--|{ COURSE_REGISTRATION_ITEMS : "contains enrolled subjects (1 : N)"
    COURSES ||--o{ COURSE_REGISTRATION_ITEMS : "registered as items (1 : N)"

    STUDENTS {
        int id PK "INTEGER AUTOINCREMENT"
        string registration_id UK "VARCHAR(20) UNIQUE (e.g. REG1001)"
        string first_name "VARCHAR(50) NOT NULL"
        string last_name "VARCHAR(50) NOT NULL"
        string email UK "VARCHAR(100) UNIQUE NOT NULL"
        string phone UK "VARCHAR(15) UNIQUE NOT NULL (11 Digits)"
        date date_of_birth "DATE NOT NULL (Age >= 16)"
        string gender "VARCHAR(10) NOT NULL (Male/Female/Other)"
        string address "TEXT NOT NULL"
        string course_name "VARCHAR(100) NOT NULL"
        string department "VARCHAR(20) (CSE/SE/DSAI/EEE/BBA/MSJ)"
        string semester "VARCHAR(20) DEFAULT 'Spring'"
        string academic_year "VARCHAR(10) DEFAULT '2026'"
        string password "TEXT (Initial=Student ID)"
        int is_password_changed "INTEGER DEFAULT 0"
        string status "VARCHAR(20) NOT NULL DEFAULT 'Submitted'"
        datetime created_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }

    STATUS_HISTORY {
        int id PK "INTEGER AUTOINCREMENT"
        int student_id FK "INTEGER NOT NULL (REFERENCES students(id) ON DELETE CASCADE)"
        string old_status "VARCHAR(20) NOT NULL"
        string new_status "VARCHAR(20) NOT NULL"
        string remarks "TEXT"
        datetime updated_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }

    COURSES {
        int id PK "INTEGER AUTOINCREMENT"
        string course_code UK "VARCHAR(20) UNIQUE (e.g. CSE 101)"
        string course_title "VARCHAR(100) NOT NULL"
        real credit_hours "REAL NOT NULL DEFAULT 3.0"
        string department "VARCHAR(20) NOT NULL"
        string description "TEXT"
        datetime created_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }

    OFFERED_COURSES {
        int id PK "INTEGER AUTOINCREMENT"
        int course_id FK "INTEGER NOT NULL (REFERENCES courses(id) ON DELETE CASCADE)"
        string department "VARCHAR(20) NOT NULL"
        string semester "VARCHAR(20) NOT NULL"
        string academic_year "VARCHAR(10) NOT NULL"
        int is_open "INTEGER NOT NULL DEFAULT 1"
        datetime created_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }

    COURSE_REGISTRATIONS {
        int id PK "INTEGER AUTOINCREMENT"
        int student_id FK "INTEGER NOT NULL (REFERENCES students(id) ON DELETE CASCADE)"
        string semester "VARCHAR(20) NOT NULL"
        string academic_year "VARCHAR(10) NOT NULL"
        real total_credits "REAL NOT NULL DEFAULT 0.0"
        string status "VARCHAR(20) NOT NULL DEFAULT 'Completed'"
        datetime registered_at "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }

    COURSE_REGISTRATION_ITEMS {
        int id PK "INTEGER AUTOINCREMENT"
        int registration_id FK "INTEGER NOT NULL (REFERENCES course_registrations(id) ON DELETE CASCADE)"
        int course_id FK "INTEGER NOT NULL (REFERENCES courses(id) ON DELETE CASCADE)"
    }
```

### Database Constraints & Rules
1. **Primary & Foreign Keys:**
   * `students.id` is the primary key for enrolled students.
   * `status_history.student_id` references `students.id` with `ON DELETE CASCADE`.
   * `offered_courses.course_id` references `courses.id` with `ON DELETE CASCADE`.
   * `course_registrations.student_id` references `students.id` with `ON DELETE CASCADE`.
   * `course_registration_items.registration_id` references `course_registrations.id` with `ON DELETE CASCADE`.
   * `course_registration_items.course_id` references `courses.id` with `ON DELETE CASCADE`.
2. **Unique Constraints:**
   * `students.registration_id`, `students.email`, `students.phone`
   * `courses.course_code`
   * `offered_courses(course_id, department, semester, academic_year)`
   * `course_registrations(student_id, semester, academic_year)` (blocks duplicate advising in same semester)
   * `course_registration_items(registration_id, course_id)`
3. **Indexes Created:**
   * `idx_students_status` on `students(status)`
   * `idx_students_registration` on `students(registration_id)`
   * `idx_students_email` on `students(email)`
   * `idx_courses_dept` on `courses(department)`
   * `idx_offered_dept_sem` on `offered_courses(department, semester, academic_year)`

---

## 6. Application State Machine Diagram

The state machine demonstrates the irreversible lifecycle workflow of an application.

```mermaid
stateDiagram-v2
    [*] --> Submitted : Student Completes Registration Form (Auto ID generated)
    
    state "Submitted (Active Review)" as Submitted
    state "Approved (Finalized)" as Approved
    state "Rejected (Finalized)" as Rejected

    Submitted --> Approved : Admin Approves (Requires Bearer Token + Optional Remarks)
    Submitted --> Rejected : Admin Rejects (Requires Bearer Token + Optional Remarks)

    Approved --> [*] : Locked (State Reversion Blocked with 400 Bad Request)
    Rejected --> [*] : Locked (State Reversion Blocked with 400 Bad Request)

    note right of Approved
        Once Approved, the decision is permanent.
        Status cannot be modified back to Submitted or Rejected.
    end note

    note right of Rejected
        Once Rejected, the decision is permanent.
        Status cannot be modified back to Submitted or Approved.
    end note
```
