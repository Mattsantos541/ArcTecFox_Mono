# agents.md – ArcTecFox Autonomous Engineer Guide

> This file orients autonomous agents (e.g. Codex) and developers to effectively build, modify, and reason about the ArcTecFox codebase.

---

## 1. 🛰️ Project Overview

**Name:** ArcTecFox  
**Mission:** Revolutionize preventive maintenance (PM) planning through AI-powered tools for asset-heavy, regulated industries.

**Primary Users:**

- Maintenance managers
- Facility operators
- Reliability engineers
- Industries: healthcare, manufacturing, energy, oil & gas

**Core Use Cases:**

- PM plan generation
- Asset tracking
- Schedule visualization
- CMMS syncing (eMaint, IBM Maximo, Fiix)
- Predictive analytics (future phase)

**Current Phase:**  
MVP (auth, dashboard, asset management, PM generation, scheduling, Supabase backend)

---

## 2. 🛠️ Tech Stack Summary

| Layer            | Tech/Tooling                                                             | Notes |
| ---------------- | ------------------------------------------------------------------------ | ----- |
| **Frontend**     | Next.js (Pages Router), TailwindCSS, DaisyUI, React Hook Form, Zod       |       |
| **Backend**      | FastAPI, Python, OpenAI API (MVP), future: local models (Mistral, LLaMA) |       |
| **Database**     | Supabase (PostgreSQL), RLS via `company_id`, `user_id`                   |       |
| **AI/ML**        | OpenAI GPT-4, plans for Mistral, LLaMA 3, XGBoost, Prophet               |       |
| **Auth**         | Supabase Auth (email/password, org mapping)                              |       |
| **DevOps**       | Vercel (frontend), Render (initial backend), AWS/cloud-agnostic future   |       |
| **Monitoring**   | Planned: Sentry, Supabase logs, feedback via `pm_feedback` table         |       |
| **CMMS Targets** | eMaint, IBM Maximo, Fiix (Phase 2 integrations)                          |       |

---

## 3. 🧮 Supabase Schema (Summary)

ArcTecFox uses Supabase + PostgreSQL with **Row Level Security (RLS)**. All data is segmented by `company_id` or `user_id`.

### 🔑 Core Tables

| Table              | Purpose                                               | Key Fields / Notes                                             |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| `users`            | User profiles linked to Supabase Auth                 | `id`, `company_id`, `email`                                    |
| `companies`        | Tenant orgs                                           | `id`, `name`, `industry`, `company_size`                       |
| `locations`        | Physical sites within companies                       | `id`, `company_id`, `name`, `address`                          |
| `assets`           | Trackable physical assets                             | `id`, `company_id`, `location_id`, `status`, `install_date`    |
| `pm_plans`         | Top-level preventive maintenance plans                | `id`, `asset_id`, `company_id`, `status`, `plan_start_date`    |
| `pm_plan_versions` | Snapshots of plan inputs and generated tasks          | `version_number`, `input_snapshot`, `generated_tasks`          |
| `pm_tasks`         | Individual tasks under PM plans                       | `task_name`, `interval`, `instructions[]`, `scheduled_dates[]` |
| `inventory`        | Spare parts and materials by location                 | `name`, `category`, `quantity`, `location_id`                  |
| `work_orders`      | Manual or auto-created work orders linked to PM tasks | `status`, `title`, `description`, `pm_task_id`                 |

### 🧠 AI & Feedback Tables

| Table             | Purpose                                         | Notes                                              |
| ----------------- | ----------------------------------------------- | -------------------------------------------------- |
| `ai_interactions` | Logs prompt/response pairs for model usage      | `model_used`, `prompt`, `response`, `token_count`  |
| `pm_feedback`     | Feedback on plan versions, tasks, downloads, AI | Linked to multiple sources: tasks, versions, syncs |
| `metrics`         | High-level KPI snapshots                        | `total_assets`, `active_pm_plans`, `next_pm_task`  |

### 📥 Input & Lead Tables

| Table               | Purpose                            | Notes                                           |
| ------------------- | ---------------------------------- | ----------------------------------------------- |
| `pm_leads`          | Form data from Lite users (PMGen)  | Contains maintenance context and generated plan |
| `pm_plan_downloads` | Tracks downloads for audit/logging | Includes download format and CMMS sync flags    |

### 🔁 CMMS & Sync Tables

| Table                 | Purpose                                               | Notes                                      |
| --------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `cmms_sync_logs`      | Tracks sync attempts and outcomes with 3rd party CMMS | `sync_status`, `platform`, `response_data` |
| `roles`, `user_roles` | Future role-based access control                      | RBAC planned for Enterprise phase          |

### 🔗 Key Foreign Relationships

- `assets.company_id` → `companies.id`
- `pm_plans.asset_id` → `assets.id`
- `pm_plan_versions.pm_plan_id` → `pm_plans.id`
- `pm_tasks.pm_plan_id` → `pm_plans.id`
- `users.company_id` → `companies.id`
- `work_orders.pm_task_id` → `pm_tasks.id`

---

## 4. 🧩 Core Modules & File Guide

### 🖥️ Frontend

| File                                | Purpose                                         |
| ----------------------------------- | ----------------------------------------------- |
| `pages/PMPlanner.tsx`               | Main PM generation UI (form + display + export) |
| `components/Form/PMForm.tsx`        | Modular input form using RHF                    |
| `components/Plan/PMDisplay.tsx`     | Inline display of the PM plan table             |
| `components/Export/ExcelButton.tsx` | Excel export logic using sheetjs or react-csv   |
| `pages/Dashboard.tsx`               | Displays assets, plans, metrics by org          |
| `pages/api/generate_pm.ts`          | Next.js route proxying to FastAPI backend       |

### 🧠 Backend

| File                         | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `backend/planner.py`         | Core AI logic for PM generation using OpenAI       |
| `backend/validators.py`      | Pydantic input schemas                             |
| `backend/routes/generate.py` | FastAPI route for `/generate`                      |
| `backend/cmms_sync.py`       | (Planned) handles outbound syncs to CMMS platforms |

---

## 5. 🧭 Development Conventions

- Use **Zod** (TS) and **Pydantic** (Python) for input validation
- All Supabase queries must filter by `company_id` or `user_id`
- RLS is always enforced
- No raw SQL on frontend
- Always include error/loading/fallback UI
- Use `pm_plan_versions` for plan versioning
- Maintain clean, modular files + docstrings or JSDoc comments
- Add test scaffolds for reusable or high-risk logic

---

## 6. 🧠 Codex Agent Role & Instruction Set

### Agent Type: `Helpful`

You follow explicit instructions but suggest improvements when:

- UX can be improved
- A reusable pattern is missing
- A performance gain is easy to implement

You do **not**:

- Touch `.env`, secrets, or tokens
- Bypass RLS
- Generate raw SQL in frontend
- Overwrite PM plans without creating a new version

### Use Zod (if present) or suggest it for validation.

Use `z.object(...)` schemas and `zodResolver` in forms.

### Focus Domains:

- 🧱 DaisyUI component building
- 🧮 Supabase query logic (secure + scoped)
- 🧠 PM plan AI logic + versioning
- 🔁 CMMS integration workflows
- 📊 Asset/plan dashboards

---

## 7. 🗺️ Roadmap & Phase Structure

| Phase      | Description                                        | Status         |
| ---------- | -------------------------------------------------- | -------------- |
| Lite       | One-page PMGen + Excel export                      | ✅ Complete    |
| MVP        | Full app: auth, dashboards, asset mgmt, PM plans   | 🚧 In Progress |
| Phase 2    | CMMS sync, AI feedback loop, RBAC, agent UX        | 🔜 Planned     |
| Enterprise | Predictive ML, IoT ingest, auto-retraining, audits | 🔮 Vision      |

Codex should:

- Prioritize MVP modules
- Create Phase 2 stubs only when instructed
- Never assume Enterprise tables exist unless prompted

---
