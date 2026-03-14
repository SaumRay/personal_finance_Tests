# 💰 Personal Finance Copilot

> A production-grade, full-stack AI-powered personal finance platform — upload bank statements, analyse spending, detect anomalies, forecast savings, chat with an AI finance assistant, and download professional reports.

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [How to Run the App](#-how-to-run-the-app)
- [Testing](#-testing)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Test Coverage Summary](#-test-coverage-summary)
- [CSV Format](#-csv-format)
- [Category Detection](#-category-detection)

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework — SPA with hooks |
| Vite | 5.4.10 | Build tool & dev server |
| CSS | Custom | Styling — no external UI library |
| Fetch API | Native | HTTP requests to FastAPI backend |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.5 | REST API framework |
| Uvicorn | 0.32.1 | ASGI server |
| SQLAlchemy | 2.0.36 | ORM — database models & queries |
| Pydantic | Built-in | Request/response validation |
| python-jose | 3.3.0 | JWT token creation & verification |
| passlib + bcrypt | 1.7.4 / 4.0.1 | Password hashing |
| pandas | 2.2.3 | CSV parsing & financial calculations |
| ReportLab | 4.2.5 | PDF report generation |
| email-validator | 2.2.0 | Email format validation |

### Database

| Technology | Details |
|---|---|
| SQLite | Default local database (`finance_copilot.db`) |
| SQLAlchemy ORM | Models: `User`, `Transaction`, `UserSettings` |
| Storage | User-scoped — each user sees only their own data |

### AI / LLM

| Technology | Details |
|---|---|
| Ollama | Local LLM runtime — no API key needed |
| Default Model | `llama3.2:3b` |
| Usage | Finance Q&A, AI insights, PDF report advice |
| Fallback | App works fully without Ollama (AI sections show unavailable) |

### Testing

| Technology | Version | Purpose |
|---|---|---|
| Playwright | Latest | End-to-end browser automation |
| @playwright/test | Latest | Test runner + assertions |
| dotenv | 16+ | Load `.env.test` credentials securely |
| GitHub Actions | — | CI/CD — runs all 130 tests on every push/PR |

---

## 📁 Project Structure

```
personal-finance-copilot-main/
│
├── 📁 src/                              ← Python FastAPI Backend
│   ├── api.py                           ← App entry point + public routes
│   ├── auth.py                          ← JWT auth, bcrypt, token logic
│   ├── user_api.py                      ← All /auth & /user routes + PDF/CSV generation
│   ├── finance_engine.py                ← Analytics: summary, categories, anomalies, forecast
│   ├── llm_ollama.py                    ← Ollama LLM integration (AI advice + Q&A)
│   ├── models.py                        ← SQLAlchemy models: User, Transaction, UserSettings
│   ├── db.py                            ← Database connection + session factory
│   ├── analyze_csv.py                   ← Standalone CSV analysis utilities
│   └── mcp_server.py                    ← MCP server for AI tool-calling workflows
│
├── 📁 frontend/                         ← React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx                      ← Entire frontend (auth, dashboard, AI chat)
│   │   ├── main.jsx                     ← React entry point
│   │   └── styles.css                   ← All styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── 📁 data/                             ← Sample Data
│   ├── demo_upload_transactions.csv     ← Demo CSV for testing uploads
│   ├── demo_upload_statement_text.txt   ← Demo text statement
│   └── sample_bank_statement.csv        ← Sample bank data
│
├── 📁 tests/                            ← Playwright Test Suite
│   ├── helpers.js                       ← Shared utilities, login helpers, seed data
│   ├── auth.spec.js                     ← Authentication tests (14 cases)
│   ├── upload.spec.js                   ← Upload tests (14 cases)
│   ├── dashboard.spec.js                ← Dashboard tests (22 cases)
│   ├── settings.spec.js                 ← Settings & reports tests (15 cases)
│   ├── ai-chat.spec.js                  ← AI chat tests (17 cases)
│   ├── api.spec.js                      ← API endpoint tests (18 cases)
│   └── extended-coverage.spec.js        ← Extended edge case tests (30 cases)
│
├── 📁 .github/
│   └── workflows/
│       └── playwright-tests.yml         ← GitHub Actions CI/CD workflow
│
├── playwright.config.js                 ← Playwright configuration
├── .env.test                            ← Test credentials (gitignored — never commit)
├── .env.test.example                    ← Safe template for new contributors
├── package.json                         ← Root package (Playwright)
├── requirements.txt                     ← Python dependencies
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Register / Login | Secure JWT authentication with bcrypt password hashing |
| 📊 Home Dashboard | Summary cards, category charts, monthly trends, top expenses |
| 📁 CSV Upload | Upload bank statement CSVs — auto-parsed into transactions |
| 📝 Text Upload | Paste raw OCR/copied bank statement text — AI parser structures it |
| 🔍 Period Filter | Filter all dashboard data by month/year or all-time |
| ⚠️ Anomaly Detection | Median-based algorithm flags unusually high transactions |
| 📈 Forecast | Predicts next month income/expense/savings based on latest month |
| 🎯 Savings Plan | Sets target savings and suggests per-category spending cuts |
| 💬 AI Chat | Chat with Ollama LLM about spending, budgets, and strategy |
| 🤖 AI Insights | Auto-generates finance advice based on your transaction data |
| 📄 PDF Report | Downloads full styled PDF with all analytics + AI advice |
| 📥 CSV Export | Downloads all transactions as a CSV file |
| ⚙️ Settings | Save income growth %, target savings, Ollama model preference |
| 🗑️ Clear History | Wipe all transaction data for the logged-in user |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                React Frontend (Vite)                │
│              http://localhost:5173                  │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │  Auth Page   │  │      Home Dashboard           │ │
│  │  Register    │  │  Summary │ Charts │ Upload    │ │
│  │  Login       │  │  Filters │ Reports│ Settings  │ │
│  └──────────────┘  └──────────────────────────────┘ │
│                    ┌──────────────────────────────┐  │
│                    │      AI Feature Page          │  │
│                    │  Chat with Finance Assistant  │  │
│                    └──────────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ REST API (fetch + JWT Bearer)
                         ▼
┌─────────────────────────────────────────────────────┐
│                FastAPI Backend                      │
│              http://127.0.0.1:8000                  │
│  ┌──────────┐ ┌───────────┐ ┌─────────────────────┐ │
│  │   Auth   │ │   User    │ │   Finance Engine     │ │
│  │/register │ │ /upload   │ │ summary │ categories │ │
│  │ /login   │ │/transactions│ │anomalies│ forecast  │ │
│  └──────────┘ └───────────┘ └─────────────────────┘ │
│  ┌────────────────────┐  ┌──────────────────────┐   │
│  │    LLM (Ollama)    │  │   Report Generator   │   │
│  │ /ai-ask            │  │ /reports/summary.pdf  │   │
│  │ /ai-insight        │  │ /reports/transactions │   │
│  └────────────────────┘  └──────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ SQLAlchemy ORM
                         ▼
┌─────────────────────────────────────────────────────┐
│                 SQLite Database                     │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  users   │  │transactions │  │ user_settings │  │
│  └──────────┘  └─────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────┘
                         │ (optional)
                         ▼
┌─────────────────────────────────────────────────────┐
│                Ollama (Optional)                    │
│            http://localhost:11434                   │
│              Model: llama3.2:3b                     │
└─────────────────────────────────────────────────────┘
```

---

## 📡 API Reference

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | ❌ | Returns `{"status": "ok"}` |

### Authentication

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | ❌ | `{email, password, full_name}` | Register new user |
| POST | `/auth/login` | ❌ | `form: username, password` | Login — returns JWT token |

### User — Transactions

| Method | Endpoint | Auth | Params | Description |
|---|---|---|---|---|
| GET | `/user/transactions` | ✅ | `?limit=200` | Get all transactions |
| POST | `/user/upload-csv` | ✅ | `file: multipart CSV` | Upload bank CSV |
| POST | `/user/upload-text` | ✅ | `{text: string}` | Upload statement text |
| DELETE | `/user/transactions` | ✅ | — | Clear all transactions |

### User — Analytics

| Method | Endpoint | Auth | Params | Description |
|---|---|---|---|---|
| GET | `/user/summary` | ✅ | — | Total in / out / net savings |
| GET | `/user/categories` | ✅ | — | Spending breakdown by category |
| GET | `/user/monthly` | ✅ | — | Monthly income vs expense |
| GET | `/user/top-expenses` | ✅ | `?limit=5` | Top N highest expenses |
| GET | `/user/anomalies` | ✅ | `?multiplier=2.0` | Unusually high transactions |
| GET | `/user/forecast` | ✅ | `?income_growth_pct=0` | Next month prediction |
| GET | `/user/savings-plan` | ✅ | `?target_savings=50000` | Per-category cut suggestions |

### User — AI

| Method | Endpoint | Auth | Params | Description |
|---|---|---|---|---|
| GET | `/user/ai-insight` | ✅ | `?model=llama3.2:3b` | Auto-generate finance advice |
| GET | `/user/ai-ask` | ✅ | `?question=...&model=...` | Ask custom finance question |

### User — Reports & Settings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/me` | ✅ | Get current user info |
| GET | `/user/settings` | ✅ | Get saved settings |
| PUT | `/user/settings` | ✅ | Update settings |
| GET | `/user/reports/transactions.csv` | ✅ | Download transactions as CSV |
| GET | `/user/reports/summary.pdf` | ✅ | Download full PDF report |

> ✅ Auth = requires `Authorization: Bearer <token>` header

---

## 🗄 Database Schema

### users

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, index | Auto-increment user ID |
| email | String(255) | Unique, index | User email address |
| full_name | String(255) | — | Display name |
| hashed_password | String(255) | — | bcrypt hashed password |
| created_at | DateTime | Default: now | Registration timestamp |

### transactions

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK | Auto-increment |
| user_id | Integer | FK → users.id | Owner of transaction |
| date_text | String(20) | — | Transaction date string |
| description | Text | — | Transaction description |
| debit | Float | Default: 0.0 | Amount debited (₹) |
| credit | Float | Default: 0.0 | Amount credited (₹) |
| balance | Float | Default: 0.0 | Running balance (₹) |
| transaction_type | String(20) | — | DEBIT / CREDIT |
| reference | String(255) | — | Transaction reference ID |
| source_type | String(50) | Default: csv | csv / text |
| created_at | DateTime | Default: now | Upload timestamp |

### user_settings

| Column | Type | Default | Description |
|---|---|---|---|
| id | Integer | PK | Auto-increment |
| user_id | Integer | FK → users.id (unique) | Owner |
| default_target_savings | Float | 50000.0 | Target savings amount (₹) |
| default_income_growth_pct | Float | 5.0 | Income growth % for forecast |
| ollama_model | String(100) | llama3.2:3b | Selected Ollama model |
| updated_at | DateTime | now | Last updated timestamp |

---

## 🚀 How to Run the App

### Prerequisites

| Requirement | Version | Check Command |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |
| Ollama | Latest (optional) | `ollama --version` |

### Step 1 — Clone

```bash
git clone https://github.com/YOUR_USERNAME/personal-finance-copilot.git
cd personal-finance-copilot
```

### Step 2 — Backend

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate

# Install & run
pip install -r requirements.txt
uvicorn src.api:app --reload
```

| URL | Description |
|---|---|
| `http://127.0.0.1:8000` | Backend base URL |
| `http://127.0.0.1:8000/health` | Health check |
| `http://127.0.0.1:8000/docs` | Swagger API docs |

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Step 4 — AI (Optional)

```bash
ollama serve
ollama pull llama3.2:3b
```

### Step 5 — Quick Demo

| Step | Action |
|---|---|
| 1 | Open `http://localhost:5173` |
| 2 | Register a new account |
| 3 | Login with your credentials |
| 4 | Upload `data/demo_upload_transactions.csv` |
| 5 | Or paste from `data/demo_upload_statement_text.txt` |
| 6 | View dashboard — summary, charts, anomalies, forecast |
| 7 | Set target savings → view savings plan |
| 8 | Go to AI Feature tab → ask finance questions |
| 9 | Download CSV or Full PDF Report |

---

## 🧪 Testing

### Setup

```bash
# From project root
npm install
npx playwright install chromium
```

### Configure Credentials

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:

```env
TEST_EMAIL=your_registered_email@gmail.com
TEST_PASSWORD=your_password
TEST_REGISTER_EMAIL=newuser_playwright@example.com
TEST_REGISTER_PASSWORD=TestPass@1234
TEST_REGISTER_NAME=Playwright Tester
FRONTEND_URL=http://localhost:5173
API_URL=http://127.0.0.1:8000
```

> ⚠️ Make sure backend and frontend are running before executing tests!

### Run Commands

| Command | Description |
|---|---|
| `npx playwright test` | Run all 130 tests |
| `npx playwright test tests/auth.spec.js` | Auth tests only |
| `npx playwright test tests/api.spec.js` | API tests only |
| `npx playwright test tests/extended-coverage.spec.js` | Extended edge cases |
| `npx playwright test --headed` | Run with visible browser |
| `npx playwright test --debug` | Step-by-step debug mode |
| `npx playwright test --grep "TC_AUTH"` | Run tests matching pattern |
| `npx playwright show-report` | Open HTML report |

### Test Helpers (`tests/helpers.js`)

| Helper | Type | Description |
|---|---|---|
| `loginViaUI(page)` | UI | Logs in through browser — tests auth flow |
| `loginViaAPI(request)` | API | Gets JWT token directly — faster for non-auth tests |
| `seedTransactionsViaAPI(request, token)` | API | Uploads 10 demo transactions before test |
| `TEST_USER` | Const | Credentials from `.env.test` |
| `NEW_USER` | Const | Random email generated per run for registration tests |
| `BASE_URL` | Const | `http://localhost:5173` |
| `API_URL` | Const | `http://127.0.0.1:8000` |

---

## ⚙️ CI/CD Pipeline

### Trigger Conditions

| Trigger | Runs On |
|---|---|
| Push to `main` | ✅ Full test suite |
| Push to `develop` | ✅ Full test suite |
| Pull Request to `main` | ✅ Full test suite + PR comment |
| Manual (`workflow_dispatch`) | ✅ On demand from Actions tab |

### Pipeline Steps

| Step | Action |
|---|---|
| 1 | Checkout repository |
| 2 | Setup Python 3.11 + cache pip |
| 3 | `pip install -r requirements.txt` |
| 4 | Setup Node.js 20 + cache npm |
| 5 | `npm ci` (frontend + root) |
| 6 | `npx playwright install chromium` |
| 7 | Create `.env.test` from GitHub Secrets |
| 8 | Start FastAPI backend (`uvicorn`) |
| 9 | Health check loop — waits until backend ready |
| 10 | Register test user via API |
| 11 | Build Vite frontend → start preview server |
| 12 | Wait until frontend ready on `:5173` |
| 13 | `npx playwright test` — all 130 tests |
| 14 | Upload HTML report as downloadable artifact |
| 15 | Post test summary to GitHub Actions tab |

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions:**

| Secret Name | Value |
|---|---|
| `TEST_EMAIL` | Your test user email |
| `TEST_PASSWORD` | Your test user password |
| `TEST_REGISTER_PASSWORD` | Password for registration tests |

### Artifacts

| Artifact | Retention | Contents |
|---|---|---|
| `playwright-report-{run_id}` | 30 days | Full HTML report with screenshots & traces |
| `test-results-{run_id}` | 7 days | Raw test result files |

---

## 🧪 Test Coverage Summary

### Overall

| Metric | Value |
|---|---|
| Total Test Cases | 130 |
| Test Files | 7 |
| Browser | Chromium |
| UI Tests | 72 |
| API Tests | 58 |
| Pass Rate | 100% ✅ |

### By File

| File | Cases | Features Covered |
|---|---|---|
| `auth.spec.js` | 14 | Register, Login, Logout, validation, show/hide password |
| `upload.spec.js` | 14 | CSV upload, text upload, wrong format, API auth |
| `dashboard.spec.js` | 22 | Empty state, charts, filters, anomalies, API boundaries |
| `settings.spec.js` | 15 | Save settings, persistence, clear history, PDF/CSV reports |
| `ai-chat.spec.js` | 17 | Chat UI, send/receive, typing indicator, tab navigation |
| `api.spec.js` | 18 | All FastAPI endpoints, boundary values, JWT validation |
| `extended-coverage.spec.js` | 30 | File types, download content, AI guards, session limits |

### Edge Cases

| Category | What's Tested |
|---|---|
| Auth | Wrong password, wrong email, short password, duplicate email |
| CSV | PDF/TXT as CSV, empty CSV, missing columns, 500 rows, special chars |
| Text Upload | Malformed text, parsing tips shown, empty textarea disabled |
| Dashboard | Zero data state, invalid multiplier, boundary query params |
| Reports | Download triggered, filename correct, CSV content, PDF magic bytes |
| AI Chat | Empty question, 1000-char query, SQL injection, XSS injection |
| Non-Finance | Jokes, recipes, political queries — no crash, graceful handling |
| Session | 5 consecutive messages, tab switch persistence, rapid API calls |

---

## 📦 CSV Format Reference

### Supported Columns

| Column | Required | Accepted Aliases |
|---|---|---|
| `date` | ✅ | `txn date`, `transaction date` |
| `description` | ✅ | `narration`, `remarks` |
| `debit` | ✅ | `withdrawal` |
| `credit` | ✅ | `deposit` |
| `balance` | ❌ | — |
| `transaction_type` | ❌ | `txn type` |
| `reference` | ❌ | `ref` |

### Sample

```csv
date,description,debit,credit,balance,transaction_type,reference
01/02/2026,UPI SWIGGY FOOD,450.00,0.00,12500.00,DEBIT,TXN001
05/02/2026,SALARY CREDIT,0.00,50000.00,60700.00,CREDIT,TXN003
15/02/2026,RENT PAYMENT,18000.00,0.00,38750.00,DEBIT,TXN007
```

---

## 🏷 Category Detection

| Category | Trigger Keywords |
|---|---|
| Food | swiggy, restaurant, coffee, grocery, bigbasket |
| Transport | uber, fuel, metro, bus, taxi |
| Utilities | electricity, internet, mobile, bill, recharge |
| Shopping | amazon, shopping, flipkart |
| Entertainment | movie, bookmyshow, netflix, spotify |
| Housing | rent |
| Investment | sip, mutual fund, investment |
| Health | pharmacy, medical, hospital |
| Cash | atm, cash withdrawal |
| Other | Everything else |

---

*Built by Saumarghya Ray — Full stack · AI powered · 130 tests · CI/CD ready*
