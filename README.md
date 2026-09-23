# Student Registration & Academic Management System

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A production-ready enterprise **Student Admission, Academic Advising & Semester Billing Portal** featuring Node.js, Express.js, SQLite, strict validation middleware (`express-validator`), workflow state machine engine, dual role authentication (Admin & Student Self-Service), AI-powered admission assistant (DeepSeek & Groq API), comprehensive course advising with credit limits, automated tuition fee assessment (5,000 BDT/credit), individual scholarship discounts (0-100%), official printable invoices with verified stamps, and a responsive Tailwind CSS interface with premium dual light/dark themes.

**Institution:** University Of Liberal Arts Bangladesh (ULAB)

---

## 🌟 Key Features

### 1. 🎓 Student Self-Service & Academic Portal
- **Admission Application:** Online submission with real-time validation and tracking ID generation (`REG1001`).
- **Application Status Tracker:** Check admission review progress directly on homepage using Registration ID.
- **Student Authentication:** Secure JWT-based student login with first-time password reset security.
- **Course Advising & Enrollment:** Enrolled students select offered courses within department credit hour caps (max 15.0 credits).
- **Official Advising Slip:** Real-time generation of printable semester registration slips.

### 2. 💳 Tuition & Semester Billing System
- **Automated Fee Assessment:** Automatic bill generation at **৳5,000 / Credit Hour** upon course enrollment.
- **Waiver & Scholarship Engine:** Admin can grant individual discounts (**0%, 20%, 40%, 50%, 100%** or custom %) with dynamic net tuition recalculation.
- **Payment Lifecycle Management:** Admin records payment status (`Paid` with timestamp or `Unpaid`).
- **Real-Time Student Billing Dashboard:** Live financial metrics, credit breakdown, payment instructions, and official printable fee invoice with verified stamps.

### 3. 🛡️ Admin Control Center
- **Admission Management:** Review applications, approve/reject with permanent workflow state locking.
- **Course Catalog Management:** Add/edit offered departmental courses and credit limits.
- **Tuition & Revenue Analytics:** Gross billed revenue, collected amount, outstanding dues, and waiver aggregations.
- **Interactive Modals & Search:** Instant search by student ID, name, email, department, and payment filters.

### 4. 🎨 Elevated UI/UX & Atmospheric Light Theme
- **Balanced Light Mode:** Solved washed-out stark white appearance with soft atmospheric ambient radial gradients (`#f1f4f9` canvas), elevated card shadows, and defined borders.
- **Color-Coded Pastel Badges:** Distinct icon anchors for statuses (Indigo, Amber, Emerald, Rose, Purple).
- **Seamless Dark Mode:** Full high-contrast dark theme with persistent theme toggling.

### 5. 🤖 AI Admission Assistant & Developer Tools
- **Dual AI Model Switcher:** Real-time switching between **DeepSeek-v4-flash** (AgentRouter) and **Groq** on the homepage.
- **Interactive Swagger Documentation:** Live interactive API explorer at `/api-docs`.
- **System Documentation:** Complete database ER diagrams, use-case diagrams, DFDs, and Postman collections in `/docs`.

---

## 📂 Project Structure

```
├── config/
│   └── swagger.js              # OpenAPI 3.0 specification & Swagger UI
├── controllers/
│   ├── adminController.js      # Admin authentication & billing management
│   ├── aiController.js         # DeepSeek & Groq AI chat completion handlers
│   └── studentController.js    # Student CRUD, course enrollment & billing
├── docs/
│   ├── api_documentation.md    # Full API Markdown specification
│   ├── database/schema.sql     # SQLite DDL Schema Script
│   ├── er_diagram.svg          # Database Architecture ER Diagram
│   ├── system_diagrams.md      # Full Class, DFD, Use Case & ER Diagrams
│   └── use_case_diagram.svg    # System Use-Case Diagram
├── middlewares/
│   ├── authMiddleware.js       # Admin & Student Bearer token validation
│   └── validationMiddleware.js # Express-validator rules
├── public/                     # Static frontend client files
│   ├── admin-login.html        # Administrator sign-in portal
│   ├── dashboard.html          # Admin management dashboard
│   ├── index.html              # University landing page with AI Chat & Status Lookup
│   ├── register.html           # Student self-service registration form
│   ├── student-dashboard.html  # Student academic & billing dashboard
│   └── student-login.html      # Student self-service login portal
├── routes/
│   ├── adminRoutes.js          # Admin endpoints & billing routes
│   ├── aiRoutes.js             # AI assistant endpoints
│   └── studentRoutes.js        # Student self-service & billing routes
├── scripts/
│   ├── verify_api.js           # Automated admission & API test suite
│   └── verify_billing.js       # Automated billing & discount test suite
├── .env.example
├── database.js                 # SQLite connection, schema & auto-migrations
├── package.json
├── render.yaml                 # Render Blueprint cloud deployment configuration
└── server.js                   # Main Express application entry point
```

---

## 🚀 Quick Start Guide (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/Diganto002/Student_web_app.git
cd Student_web_app
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=3001
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# DeepSeek (AgentRouter)
AGENTROUTER_API_BASE=https://agentrouter.org/
AGENTROUTER_API_KEY=your_agentrouter_key_here
AGENTROUTER_MODEL=deepseek-v4-flash
```

### 3. Start Server
```bash
npm start
```

- **Home Portal:** [http://localhost:3001](http://localhost:3001)
- **Student Admission Form:** [http://localhost:3001/register.html](http://localhost:3001/register.html)
- **Student Portal Login:** [http://localhost:3001/student-login.html](http://localhost:3001/student-login.html)
- **Admin Login:** [http://localhost:3001/admin-login.html](http://localhost:3001/admin-login.html)
- **Interactive Swagger API Docs:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

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
