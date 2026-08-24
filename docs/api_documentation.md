# API Documentation - Student Registration System

**University:** University Of Liberal Arts Bangladesh (ULAB)  
**Base URL:** `http://localhost:3000`  
**Live Swagger UI:** `http://localhost:3000/api-docs`

---

## 🔐 1. Admin Authentication Endpoint

### `POST /admin/login`
Authenticates administrative staff and returns a Bearer Authorization Token.

- **Request Headers:**
  `Content-Type: application/json`

- **Request Body:**
  ```json
  {
    "username": "spetrum",
    "password": "admin123"
  }
  ```

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin authentication successful!",
    "token": "admin-token-spetrum-authenticated-2026",
    "admin": {
      "username": "spetrum",
      "role": "Administrator"
    }
  }
  ```

- **Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "message": "Invalid admin username or password."
  }
  ```

---

## 📝 2. Student Registration Endpoints

### `POST /students`
Submit a new student application for ULAB admission.

- **Request Body Example 1 (Mh Diganto):**
  ```json
  {
    "first_name": "Mh",
    "last_name": "Diganto",
    "email": "mhdiganto@gmail.com",
    "phone": "01712345678",
    "date_of_birth": "2002-10-14",
    "gender": "Male",
    "address": "Mohammadpur, Dhaka",
    "course_name": "Computer Science & Engineering (CSE)"
  }
  ```

- **Request Body Example 2 (Mostagir Hossain):**
  ```json
  {
    "first_name": "Mostagir",
    "last_name": "Hossain",
    "email": "mhdiganto002@gmail.com",
    "phone": "01912345678",
    "date_of_birth": "2000-10-13",
    "gender": "Male",
    "address": "Bogura",
    "course_name": "Software Engineering (SE)"
  }
  ```

- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Student registration submitted successfully!",
    "data": {
      "id": 1,
      "registration_id": "REG1001",
      "first_name": "Mh",
      "last_name": "Diganto",
      "email": "mhdiganto@gmail.com",
      "phone": "01712345678",
      "date_of_birth": "2002-10-14",
      "gender": "Male",
      "address": "Mohammadpur, Dhaka",
      "course_name": "Computer Science & Engineering (CSE)",
      "status": "Submitted",
      "created_at": "2026-08-12T13:50:00.000Z",
      "updated_at": "2026-08-12T13:50:00.000Z"
    }
  }
  ```

- **Response (400 Bad Request - Underage / Invalid Format):**
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "date_of_birth",
        "message": "Minimum age must be 16 years"
      }
    ]
  }
  ```

- **Response (409 Conflict - Duplicate Email/Phone):**
  ```json
  {
    "success": false,
    "message": "A student with this email address already exists."
  }
  ```

---

### `GET /students`
Retrieve list of applications with search, status filtering, and pagination.

- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10)
  - `search` (string, optional) - e.g. `Diganto`, `01712345678`, `REG1001`
  - `status` (string, optional) - `All`, `Submitted`, `Approved`, `Rejected`

- **Request URL Example:**
  `GET http://localhost:3000/students?page=1&limit=10&search=&status=All`

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 5,
        "registration_id": "REG1005",
        "first_name": "Tanvir",
        "last_name": "Ahmed",
        "email": "tanvir.ahmed@gmail.com",
        "phone": "01512345678",
        "date_of_birth": "1999-12-01",
        "gender": "Male",
        "address": "Mirpur, Dhaka",
        "course_name": "Media Studies & Journalism (MSJ)",
        "status": "Submitted"
      },
      {
        "id": 4,
        "registration_id": "REG1004",
        "first_name": "Ayesha",
        "last_name": "Rahman",
        "email": "ayesha.rahman@gmail.com",
        "phone": "01612345678",
        "date_of_birth": "2003-08-15",
        "gender": "Female",
        "address": "Dhanmondi, Dhaka",
        "course_name": "Bachelor of Business Administration (BBA)",
        "status": "Submitted"
      },
      {
        "id": 3,
        "registration_id": "REG1003",
        "first_name": "Mahmudul",
        "last_name": "Hasan",
        "email": "mahmudul.hasan@gmail.com",
        "phone": "01812345678",
        "date_of_birth": "2001-05-20",
        "gender": "Male",
        "address": "Uttara, Dhaka",
        "course_name": "Data Science & Artificial Intelligence (DSAI)",
        "status": "Rejected"
      },
      {
        "id": 2,
        "registration_id": "REG1002",
        "first_name": "Mostagir",
        "last_name": "Hossain",
        "email": "mhdiganto002@gmail.com",
        "phone": "01912345678",
        "date_of_birth": "2000-10-13",
        "gender": "Male",
        "address": "Bogura",
        "course_name": "Software Engineering (SE)",
        "status": "Approved"
      },
      {
        "id": 1,
        "registration_id": "REG1001",
        "first_name": "Mh",
        "last_name": "Diganto",
        "email": "mhdiganto@gmail.com",
        "phone": "01712345678",
        "date_of_birth": "2002-10-14",
        "gender": "Male",
        "address": "Mohammadpur, Dhaka",
        "course_name": "Computer Science & Engineering (CSE)",
        "status": "Approved"
      }
    ],
    "stats": {
      "total": 5,
      "submitted": 2,
      "approved": 2,
      "rejected": 1
    },
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

---

### `GET /students/:id`
Fetch single student record by primary key or Registration ID (`REG1001`) with full audit history timeline.

- **Request URL:** `GET http://localhost:3000/students/REG1001`

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "registration_id": "REG1001",
      "first_name": "Mh",
      "last_name": "Diganto",
      "email": "mhdiganto@gmail.com",
      "phone": "01712345678",
      "date_of_birth": "2002-10-14",
      "gender": "Male",
      "address": "Mohammadpur, Dhaka",
      "course_name": "Computer Science & Engineering (CSE)",
      "status": "Approved",
      "history": [
        {
          "id": 2,
          "student_id": 1,
          "old_status": "Submitted",
          "new_status": "Approved",
          "remarks": "HSC & Academic Transcripts verified by Admin spetrum.",
          "updated_at": "2026-08-12T13:51:00.000Z"
        },
        {
          "id": 1,
          "student_id": 1,
          "old_status": "N/A",
          "new_status": "Submitted",
          "remarks": "Application submitted by student",
          "updated_at": "2026-08-12T13:50:00.000Z"
        }
      ]
    }
  }
  ```

---

## 🛡️ 3. Admin Status Workflow Endpoints

### `PUT /students/:id/approve`
Approve a submitted student application. Requires Admin Bearer Header.

- **Headers:**
  `Authorization: Bearer admin-token-spetrum-authenticated-2026`

- **Request Body:**
  ```json
  {
    "remarks": "Verified certificates and approved by Admin spetrum."
  }
  ```

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Registration REG1004 approved successfully!",
    "data": { ... }
  }
  ```

- **Response (400 Bad Request - Workflow Lock):**
  ```json
  {
    "success": false,
    "message": "Action denied. Application is already 'Approved' and cannot be changed back or modified."
  }
  ```

---

### `PUT /students/:id/reject`
Reject a submitted student application. Requires Admin Bearer Header.

- **Headers:**
  `Authorization: Bearer admin-token-spetrum-authenticated-2026`

- **Request Body:**
  ```json
  {
    "remarks": "Prerequisite document criteria not met."
  }
  ```

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Registration REG1005 rejected.",
    "data": { ... }
  }
  ```
