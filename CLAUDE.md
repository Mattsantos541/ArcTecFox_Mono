# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArcTecFox Mono is a monorepo for a Preventive Maintenance (PM) planning application with AI-powered features. The application helps organizations manage assets, create maintenance schedules, and generate PM plans using Google's Gemini AI.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: React Context (AuthProvider)
- **Routing**: React Router v7
- **Form Handling**: React Hook Form with Zod validation
- **Database**: Supabase (auth, storage, and database)

### Backend
- **Framework**: FastAPI (Python)
- **AI Integration**: Google Generative AI (Gemini)
- **Database**: Supabase
- **File Processing**: PyPDF2, python-docx, Pillow
- **PDF Generation**: ReportLab, jsPDF

## Common Development Commands

### Frontend Development
```bash
# Start frontend dev server
npm run dev:lite
# OR from frontend directory
cd apps/welcome/frontend && npm run dev

# Build frontend for production
npm run build:lite
# OR from frontend directory  
cd apps/welcome/frontend && npm run build

# Preview production build
cd apps/welcome/frontend && npm run preview
```

### Backend Development
```bash
# Start backend server
cd apps/welcome/backend
uvicorn main:app --reload --port 8000

# Install Python dependencies
cd apps/welcome/backend
pip install -r requirements.txt
```

### Monorepo Commands
```bash
# Install all dependencies (from root)
npm install

# Development servers
npm run dev:lite    # Start frontend dev server
npm run build:lite  # Build frontend
```

## Project Architecture

### Directory Structure
- `/apps/welcome/` - Main application
  - `/frontend/` - React frontend application
    - `/src/components/` - Reusable UI components
    - `/src/pages/` - Route pages (PMPlanner, UserManagement, etc.)
    - `/src/hooks/` - Custom React hooks (useAuth, useToast, etc.)
    - `/src/components/ui/` - Shadcn/Radix UI components
  - `/backend/` - FastAPI backend
    - `main.py` - Main FastAPI application with CORS and routes
    - `pdf_export.py` - PDF generation utilities
    - `file_processor.py` - Document processing for AI analysis

### Key Features & Routes

**Frontend Routes:**
- `/` - Maintenance Schedule Dashboard
- `/pmplanner` - PM Planning with AI assistance
- `/admin/users` - User management
- `/admin/companies` - Company management  
- `/admin/super-admins` - Super admin management

**Backend API Endpoints:**
- `POST /generate-pm-plan` - Generate AI-powered PM plans
- `POST /export-pm-plan-pdf` - Export PM plan as PDF
- `GET /api/auth/session` - Check auth session
- File upload endpoints for manuals

### Authentication & Database

- **Authentication**: Supabase Auth with Google OAuth integration
- **Database**: Supabase PostgreSQL with RLS policies
- **Storage**: Supabase Storage for user manuals (user-specific folders)
- **File Structure**: `user-manuals/{user-id}/filename`

### Environment Variables

Frontend requires:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend requires:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
- `CORS_ORIGIN` (defaults to https://arctecfox-mono.vercel.app)

### Component Patterns

- All pages use `MainLayout` wrapper with navbar
- Error boundaries wrap major components
- Forms use React Hook Form with Zod schemas
- UI components follow Radix UI patterns with Tailwind styling
- Toast notifications via useToast hook

### Testing & Quality

Currently no test suite configured. When implementing tests:
- Frontend: Consider Vitest with React Testing Library
- Backend: Use pytest for FastAPI endpoints

### Deployment

- Frontend deploys to Vercel (configured in vercel.json)
- Backend typically deployed separately (Render, Railway, etc.)
- CORS must be configured for production domains