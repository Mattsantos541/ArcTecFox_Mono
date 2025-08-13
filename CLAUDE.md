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
- `/admin/assets` - Asset management (parent and child assets)
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

### Asset Management

The application includes comprehensive asset management functionality accessible via `/admin/assets`:

**Parent Assets:**
- Linked to specific sites via `site_id` foreign key
- Fields: name, make, model, serial_number, category (free text), purchase_date, install_date, notes
- Users can only see/manage assets for sites they have admin access to
- Site selection is auto-populated for single-site users, dropdown for multi-site users
- Click anywhere on table row to select parent asset
- Edit via comprehensive modal popup (not inline editing)
- Soft delete: Updates `status` field to 'deleted' instead of removing records

**Child Assets:**
- Linked to parent assets via `parent_asset_id` foreign key
- Same fields as parent assets except category uses dropdown from `dim_assets.asset_name`
- Displayed only when parent asset is selected
- Same edit/delete patterns as parent assets
- Automatically deleted (soft) when parent asset is deleted

**Edit Functionality:**
- Click "Edit" button opens comprehensive modal with all asset fields
- Modal includes all asset properties in a clean form layout
- Category field: Free text input for parent assets, dropdown for child assets
- Integrated manual management section within edit modal
- Save/Cancel buttons for entire form submission
- No inline editing - all edits done through modal interface

**File Upload & Manual Management:**
- Files uploaded using `FileUpload` component from `/src/components/forms/FileUpload.jsx`
- Storage handled by `StorageService` from `/src/services/storageService.js`
- Files stored in Supabase Storage bucket `user-manuals` with path structure: `{user-id}/{filename}`
- Metadata stored in `loaded_manuals` table with fields:
  - `asset_id` (references parent or child asset)
  - `asset_type` ('parent' or 'child')
  - `file_path`, `file_name`, `original_name`
  - `file_size`, `file_type`
  - `loaded_at`, `loaded_by`
- Manual management features:
  - View existing manuals with file details (name, size, type, upload date)
  - Click "View" to open manual in new tab using signed URLs
  - Delete manuals (removes from storage and database)
  - Upload new manuals directly within edit modal
  - Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF
  - Maximum file size: 30MB
  - Real-time upload progress indicator

**Database Tables:**
- `parent_assets` - Main asset records with site relationship
- `child_assets` - Sub-assets linked to parent assets
- `dim_assets` - Asset category dimension table (provides category dropdown for child assets)
- `loaded_manuals` - Stores file metadata for uploaded manuals
- All tables include `created_by`, `updated_by`, `updated_at` audit fields

**Permissions:**
- Only site admins can access asset management
- Users see only assets for sites they have admin access to
- Users without site access cannot create assets
- File storage uses user-specific folders for access control

### PM Planner Integration

The PM Planner (`/pmplanner`) has been fully integrated with the Asset Management system:

**Asset Selection Interface:**
- Replaced manual asset entry fields (Asset Name, Model, Serial Number, Category, Include User Manual) with dropdown-based asset selection
- **Parent Asset Dropdown**: Shows all assets user has access to based on their site permissions
- **Child Asset Dropdown**: Appears after parent selection, shows child assets linked to selected parent
- Asset details displayed in info box showing name, model, serial number, category, and associated manuals

**Data Flow:**
- PM Planner loads assets using `fetchUserSites()` and `fetchParentAssets()` functions
- Child assets loaded via `fetchChildAssets()` when parent is selected
- Asset data auto-populates form fields (name, model, serial, category) from selected asset
- Child asset data takes precedence over parent if both are selected

**Manual Integration:**
- Automatically includes ALL manuals uploaded via Asset Management for the selected asset
- No manual file upload needed in PM Planner - uses existing asset manuals
- Displays manual count and file names in asset details section
- Backend receives both single manual (backward compatibility) and multiple manuals array

**Enhanced Data Structure Sent to Backend:**
```javascript
{
  // Core asset data
  name, model, serial, category,
  parent_asset_id, child_asset_id, asset_type,
  purchase_date, install_date, asset_notes,
  
  // Manual data (dual format for compatibility)
  userManual: { first manual },
  manuals: [{ all manuals }],
  manual_count: number,
  
  // Complete asset context for AI
  asset_full_details: {
    parent_asset: { complete parent object },
    child_asset: { complete child object | null }
  }
}
```

**Key Files Modified:**
- `/src/pages/PMPlanner.jsx` - Complete overhaul of asset selection and data handling
- `/src/lib/validationSchemas.js` - Updated to make asset fields optional (auto-populated)
- Integration with existing API functions: `fetchUserSites`, `generatePMPlan`

**Existing Plan Detection & Display:**
- Automatically checks for existing PM plans when child assets are selected
- **Database Relationship**: Uses `pm_tasks.pm_plan_id` → `pm_plans.id` foreign key relationship
- **Query Structure**: Fetches PM plans with associated tasks using Supabase join
- **RLS Policies**: Updated RLS policies on `pm_tasks` table to support REST API joins
- **Business Logic**: All PM plans are linked to child assets only (never parent assets)

**PM Plan Display:**
- **Existing Plans**: Display with identical format to newly generated plans
- **Layout**: Positioned outside form section, same as `PMPlanDisplay` component
- **UI Components**: Uses same `Info` and `InfoBlock` components for consistency
- **Data Structure**: Shows complete task details (intervals, instructions, safety, etc.)
- **Styling**: Identical colors, spacing, and formatting as new plan generation

**Form Field Population:**
When child asset with existing plan is selected, form automatically populates:
- **Operating Hours**: From `pm_plans.op_hours`
- **Additional Context**: From `pm_plans.additional_context` 
- **Environment**: From `pm_plans.env_desc`
- **Plan Start Date**: From `pm_plans.plan_start_date`

**Database Schema Details:**
```sql
-- PM Plans table structure
pm_plans (
  id uuid PRIMARY KEY,
  child_asset_id uuid REFERENCES child_assets(id),
  asset_name, asset_model, serial_no, eq_category,
  op_hours, additional_context, env_desc, plan_start_date,
  created_by, site_id, created_at, status
)

-- PM Tasks table structure  
pm_tasks (
  id uuid PRIMARY KEY,
  pm_plan_id uuid REFERENCES pm_plans(id) ON DELETE CASCADE,
  task_name, maintenance_interval, reason,
  est_minutes, tools_needed, no_techs_needed, consumables,
  instructions jsonb[], safety_precautions, engineering_rationale,
  common_failures_prevented, usage_insights, scheduled_dates text[]
)
```

**API Functions:**
- `fetchPMPlansByAsset(parentAssetId, childAssetId)` - Fetches plans with tasks
- `savePMPlanInput()` - Saves new plans with `child_asset_id` relationship
- Query includes complete task data using correct column names from schema

**User Workflow:**
1. Create/manage assets and upload manuals in `/admin/assets`
2. Select parent asset in `/pmplanner` (loads child assets)
3. Select child asset (automatically checks for existing plans)
4. If existing plans found: displays full plan details + populates form fields
5. User can generate new plan or use existing plan data

### Terminology

- **Site Admin / Super Admin**: These terms are used interchangeably in the codebase. A "super admin" is actually a site admin with administrative privileges for managing sites, users, and assets.

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
- memorize