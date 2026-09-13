# Student Registration System (Student Project)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A production-ready enterprise **Student Registration & Admission Portal** featuring Node.js, Express.js, SQLite, strict validation middleware (`express-validator`), status transition workflow engine, Admin authentication system, AI-powered admission assistant (Groq API), interactive Swagger API documentation, and a responsive Tailwind CSS portal.

**Institution:** University Of Liberal Arts Bangladesh (ULAB)

---

## 🌟 Key Features

- **Self-Service Registration:** Students submit admission details with real-time validation.
- **Track Application Status:** Students can enter their sequential Registration ID (`REG1001`) on the home page to immediately check real-time approval status and remarks.
- **System-Generated Unique ID:** Auto-generates sequential registration IDs (e.g. `REG1001`, `REG1002`).
- **🤖 Groq AI Admission Assistant:** Integrated chatbot on the homepage grounded with official ULAB admission knowledge, requirements, and course details.
- **Strict Input Validation Engine:**
  - `first_name` & `last_name`: Required, 2-50 characters, alphabets and spaces only.
  - `email`: Required, unique, valid email format.
  - `phone`: Required, unique, exact 11 digits (e.g., `01712345678`).
  - `date_of_birth`: Required, past date, **minimum age requirement is 16 years**.
  - `gender`: Required (`Male`, `Female`, `Other`).
  - `address`: Required, max 255 characters.
  - `course_name`: Required dropdown (`CSE`, `SE`, `DSAI`, `EEE`, `BBA`, `MSJ`).
- **🔐 Dedicated Admin Authentication:**
  - **Admin Username:** `spetrum` (or `admin`)
  - **Admin Password:** `admin123`
- **Workflow State Machine:**
  - `Submitted` &rarr; `Approved` OR `Submitted` &rarr; `Rejected`.
  - **Rule:** Applications marked `Approved` or `Rejected` are locked and CANNOT be reverted to `Submitted` or re-processed.
- **Audit Log History:** Tracks all status changes with timestamps, old/new status, and admin remarks in a `status_history` table.
- **Interactive Swagger UI:** Live interactive API documentation at `/api-docs`.

---

## 📂 Project Structure

```
├── config/
│   └── swagger.js              # OpenAPI 3.0 specification & Swagger UI
├── controllers/
│   ├── adminController.js      # Admin authentication handler
│   ├── aiController.js         # Groq AI chat completion handler
│   └── studentController.js    # Student CRUD & workflow state machine
├── docs/
│   ├── api_documentation.md    # Full API Markdown specification
│   ├── database/schema.sql     # SQLite DDL Schema Script
│   ├── er_diagram.md           # Database Architecture ER Diagram
│   └── postman_collection.json # Importable Postman v2.1 Collection
├── middlewares/
│   ├── authMiddleware.js       # Admin Bearer token validation
│   └── validationMiddleware.js # Express-validator rules
├── public/                     # Static frontend client files
│   ├── admin-login.html        # Administrator sign-in portal
│   ├── dashboard.html          # Admin management dashboard with pagination
│   ├── index.html              # University landing page with AI Chat & Status Lookup
│   └── register.html           # Student self-service registration form
├── routes/
│   ├── adminRoutes.js
│   ├── aiRoutes.js
│   └── studentRoutes.js
├── scripts/
│   └── verify_api.js           # Automated end-to-end test suite
├── .env.example
├── database.js                 # SQLite database connection & migrations
├── package.json
├── render.yaml                 # Render Blueprint cloud deployment configuration
└── server.js                   # Main Express application entry point
```

---

## 🚀 Quick Start Guide (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/Diganto002/student-project.git
cd student-project
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
PORT=3000
```

### 3. Start Server
```bash
npm start
```

- **Home Portal:** [http://localhost:3000](http://localhost:3000)
- **Student Form:** [http://localhost:3000/register.html](http://localhost:3000/register.html)
- **Admin Login:** [http://localhost:3000/admin-login.html](http://localhost:3000/admin-login.html)
- **Interactive Swagger API Docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 🧪 Automated Test Suite

Run the automated test suite to verify health, authentication, input validation, state transitions, duplicate prevention, and AI chat:
```bash
node scripts/verify_api.js
```

---

## ☁️ Deploy Online to Render

This project includes a **`render.yaml`** configuration for 1-click cloud deployment.

### Method 1: Using Render Blueprint (Recommended)
1. Push this repository to GitHub (`Diganto002/student-project`).
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your GitHub repository `student-project`.
5. Under Environment Variables, enter your `GROQ_API_KEY`.
6. Click **Apply**. Render will automatically build (`npm install`) and start (`npm start`) your web service with a free SSL certificate!

### Method 2: Manual Web Service Setup
1. On Render, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. In **Environment Variables**, add:
   - `GROQ_API_KEY`: *(your Groq API key)*
   - `GROQ_MODEL`: `openai/gpt-oss-20b`
   - `NODE_VERSION`: `20.18.0`
5. Click **Create Web Service**. Your app will be live within 2 minutes!

---

## 👤 Author & Credentials
- **University:** University Of Liberal Arts Bangladesh (ULAB)
- **Admin Credentials:** Username: `spetrum` (or `admin`) | Password: `admin123`
- **Developer:** mhdiganto (mhdiganto@gmail.com)
- **License:** ISC
