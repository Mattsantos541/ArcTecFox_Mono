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
- `/` - Maintenance Schedule Dashboard with integrated Asset View
- `/pmplanner` - PM Planning with AI assistance
- `/admin/users` - User management
- `/admin/companies` - Company management
- `/admin/assets` - Asset management (parent and child assets)
- `/admin/super-admins` - Super admin management

**Main Dashboard Tabs (updated):**
- **Asset View** - Complete asset management functionality (first tab)
- **Task View** - Maintenance task list (formerly "List View")
- **Calendar View** - Calendar-based task scheduling
- **Weekly View** - Weekly task overview

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

The application includes comprehensive asset management functionality accessible via `/admin/assets` and directly in the main dashboard via the "Asset View" tab:

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
- **Core Fields**: name, make, model, serial_number, category, purchase_date, install_date, notes
- **Additional PM Planning Fields**: operating_hours (numeric), addtl_context (text), plan_start_date (date)
- **Note**: Environment field is inherited from parent asset (not collected separately for child assets)
- **Inline Display**: Appear directly below selected parent asset in same table (no separate section)
- **Visual Hierarchy**: Light blue background, indented names with arrow prefix (↳), "Add Child Asset" button appears after last child
- **Interactive**: Click on child asset rows to view associated PM plans
- Category uses dropdown from `dim_assets.asset_name`
- Same edit/delete patterns as parent assets via modal interface
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

**PM Plan Integration in Asset View:**
- **Clickable Child Assets**: Click any child asset row to load and display associated PM plans
- **Visual Feedback**: Selected child asset highlighted with green background and "Selected for PM Plans" indicator
- **Plan Display**: Uses identical components and styling as PMPlanner (`Info`, `InfoBlock` components)
- **Real-time Loading**: Loading spinner and progress indicators during plan fetching
- **Plan Details**: Shows complete maintenance tasks with intervals, instructions, safety precautions, etc.
- **No Plans State**: Clear messaging when no maintenance plans exist with suggestion to visit PM Planner
- **Multiple Plans**: Indicates when multiple plans exist for same asset

**Database Tables:**
- `parent_assets` - Main asset records with site relationship (fields: name, make, model, serial_number, category, purchase_date, install_date, notes, environment, site_id, status)
- `child_assets` - Sub-assets linked to parent assets (fields: name, make, model, serial_no, category, purchase_date, install_date, notes, operating_hours, addtl_context, plan_start_date, parent_asset_id, status)
- `pm_plans` - PM plan records linked to child assets (fields: id, child_asset_id, created_by, site_id, plan_start_date, status, version, created_at)
- `pm_tasks` - Individual maintenance tasks within PM plans (fields: id, pm_plan_id, task_name, maintenance_interval, reason, est_minutes, tools_needed, no_techs_needed, consumables, instructions, safety_precautions, engineering_rationale, common_failures_prevented, usage_insights, scheduled_dates)
- `dim_assets` - Asset category dimension table (provides category dropdown for child assets)
- `loaded_manuals` - Stores file metadata for uploaded manuals
- All tables include `created_by`, `updated_by`, `updated_at` audit fields

**Important Field Mapping Notes:**
- **Parent Assets**: Use `serial_number` field in database
- **Child Assets**: Use `serial_no` field in database (frontend maps `serial_number` ↔ `serial_no`)
- **Environment**: Only stored in parent_assets table, inherited by child assets
- **PM Plans**: Only linked to child_assets via `child_asset_id` foreign key
- **Status Values**: 'active', 'deleted' for assets; 'Current', 'Replaced' for PM plans

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
1. Create/manage assets and upload manuals in `/admin/assets` or dashboard Asset View
2. **Option A - PMPlanner Route**: 
   - Select parent asset in `/pmplanner` (loads child assets)
   - Select child asset (automatically checks for existing plans)
   - If existing plans found: displays full plan details + populates form fields
   - User can generate new plan or use existing plan data
3. **Option B - Direct Asset View Route**:
   - Navigate to dashboard Asset View tab
   - Click on any child asset to view PM plan status (green ✓ or red ✗)
   - Click "Create PM Plan" or "Update PM Plan" button for direct plan generation
   - Loading modal displays during AI processing (identical to PMPlanner)
   - Plan details automatically appear after successful generation
4. **Enhanced Asset Management**:
   - Visual PM plan status indicators in child asset table
   - Complete make, model, serial number support for all child assets
   - Environment inheritance from parent assets (no separate collection needed)
   - Real-time status updates after plan operations

### Recent Updates

#### Previous Session - Asset Management Enhancements:
- **Unified Interface**: Asset management now available directly in main dashboard via "Asset View" tab
- **Inline Child Display**: Child assets appear directly below parent assets in same table (removed separate sections)
- **Updated Child Asset Schema**: Child assets now include make, model, serial_number fields (same as parent assets)
- **Enhanced PM Fields**: Added operating_hours, addtl_context, plan_start_date to child assets (environment inherited from parent)
- **Interactive PM Plan Display**: Click child assets to view associated maintenance plans with identical PMPlanner formatting
- **Visual Improvements**: Better hierarchy with indented child assets, hover effects, and selection indicators

**Dashboard Tab Updates:**
- **Asset View** (new first tab) - Complete asset management functionality
- **Task View** (renamed from "List View") - Existing maintenance task functionality
- **Calendar View** (unchanged) - Calendar scheduling
- **Weekly View** (unchanged) - Weekly overview

**Technical Implementation:**
- Shared PM plan display components between PMPlanner and Asset View
- Real-time plan loading with `fetchPMPlansByAsset` API integration
- Enhanced state management for selected assets and plan display
- Proper event handling with click propagation control
- Loading states and error handling for plan fetching
- Database schema updates for new child asset fields

#### Latest Session - Advanced Asset Management Features:

**PM Plan Status Indicators:**
- **New PM Plan Column**: Replaced "Op. Hours" column in child asset table with visual PM Plan status indicators
- **Green Checkmark (✓)**: Displayed in green circle for child assets that have current PM plans
- **Red X (✗)**: Displayed in red circle for child assets without PM plans
- **Real-time Status Updates**: PM plan statuses automatically refresh after creating/updating plans
- **Database Integration**: Uses efficient queries to check `pm_plans` table for 'Current' status plans

**Direct PM Plan Generation from Asset View:**
- **Create/Update PM Plan Button**: Dynamic button that shows "Create PM Plan" or "Update PM Plan" based on existing plan status
- **Identical PMPlanner Process**: Uses exact same AI generation process, data structure, and loading modal as PMPlanner
- **Loading Modal Integration**: Shows professional loading screen with progress indicators during plan generation
- **Automatic Plan Display**: After successful generation, automatically displays new plan details using existing format
- **Plan Versioning**: Marks old plans as 'Replaced' when creating new plans, maintains 'Current' status for active plans

**Enhanced Child Asset Field Management:**
- **Complete Field Support**: Child assets now properly save and display make, model, and serial number fields
- **Database Field Mapping**: Proper mapping between frontend `serial_number` field and database `serial_no` field
- **Consistent Data Flow**: 
  - **Create**: `serial_number` → `serial_no` (frontend to database)
  - **Edit Load**: `serial_no` → `serial_number` (database to frontend)
  - **Edit Save**: `serial_number` → `serial_no` (frontend to database)
  - **Display**: Direct reference to `serial_no` field from database

**Environment Field Inheritance:**
- **Simplified Data Model**: Child assets no longer collect environment separately - inherited from parent assets
- **PMPlanner Integration**: Environment field auto-populated from parent asset via JOIN queries
- **Reduced Data Duplication**: Eliminated redundant environment storage across asset hierarchy

**Advanced PM Plan Query Optimization:**
- **Simplified API Calls**: Replaced complex JOIN queries with separate API calls to avoid RLS conflicts
- **Error-Resistant Queries**: Implemented fallback patterns for database query issues
- **Status-Based Filtering**: All PM plan queries now filter for 'Current' status to show only active plans
- **Performance Optimization**: Efficient batch queries for PM plan status checking

**Technical Implementation Details:**
- **State Management**: Added `childAssetPlanStatuses` state to track PM plan existence for all child assets
- **Loading States**: Comprehensive loading indicators for plan generation, status checking, and plan display
- **Error Handling**: Robust error handling with user-friendly messages and fallback behaviors
- **Data Consistency**: Automatic status refresh after plan operations to maintain UI accuracy

**Key Functions Added:**
- `loadChildAssetPlanStatuses()` - Efficiently checks PM plan status for multiple child assets
- `handleCreateUpdatePMPlan()` - Generates PM plans directly from asset view with identical PMPlanner process
- Enhanced `fetchPMPlansByAsset()` - Simplified query structure to avoid JOIN-related errors
- Updated modal data mapping functions for proper field handling

**Table Layout & UI Optimization:**
- **Table Width Optimization**: Changed from `min-w-full overflow-x-auto` to `w-full table-fixed overflow-hidden` to prevent horizontal scrolling
- **Fixed Column Widths**: Applied specific width classes (`w-1/8`, etc.) to ensure consistent table layout
- **Reduced Padding**: Changed from `px-6` to `px-3` throughout table cells for better space utilization
- **Text Truncation**: Added `truncate` classes to prevent text overflow in table cells
- **Smaller Action Buttons**: Reduced button text size to `text-xs` and spacing to `space-x-1`

**Child Asset Header Improvements:**
- **Compact Header Design**: Implemented stacked "Child Asset" header with `flex-col` layout for minimal horizontal space
- **Left Alignment**: Changed from centered to left-aligned (`text-left`) with reduced padding (`pl-2`) 
- **Consistent Typography**: Maintained `font-medium` and `uppercase` styling to match other table headers
- **Fixed Width**: Applied `w-16` to Child Asset header column for consistent narrow width

**Button Layout & Alignment:**
- **Actions Column Integration**: Moved child asset edit/delete buttons to align with parent asset actions in rightmost column
- **Consistent Styling**: Applied same button styling (`text-xs`, `space-x-1`) across parent and child asset actions
- **Proper Event Handling**: Maintained `stopPropagation()` for button clicks within clickable rows

**First Column Optimization:**
- **Narrower Name Column**: Reduced parent asset name column from `w-1/6` to `w-1/8` 
- **Reduced Padding**: Changed from `px-3` to `px-2` for first column cells
- **Consistent Spacing**: Applied uniform padding reduction to both parent and child asset name cells

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

**Key Components:**
- `/src/pages/ManageAssets.jsx` - Complete asset management with inline child display and PM plan integration
- `/src/components/dashboard/maintenance-schedule.tsx` - Main dashboard with integrated Asset View tab
- `/src/pages/PMPlanner.jsx` - PM planning with asset dropdown integration
- `/src/components/forms/FileUpload.jsx` - File upload component for manuals
- PM plan display components: `Info`, `InfoBlock` (shared between PMPlanner and AssetView)

### Testing & Quality

Currently no test suite configured. When implementing tests:
- Frontend: Consider Vitest with React Testing Library
- Backend: Use pytest for FastAPI endpoints

### Deployment

- Frontend deploys to Vercel (configured in vercel.json)
- Backend typically deployed separately (Render, Railway, etc.)
- CORS must be configured for production domains
- memorize