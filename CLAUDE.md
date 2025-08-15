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

#### Latest Session - AI-Powered Child Asset Suggestions & UI Enhancements:

**AI-Powered Child Asset Suggestions:**
- **New FastAPI Router**: Created `/apps/welcome/backend/api/suggest_child_assets.py` with organized endpoint structure
- **Google AI Integration**: Uses same Gemini-2.0-flash-exp model and infrastructure as PM plan generation
- **Smart Asset Suggestions**: AI analyzes parent asset details (name, make, model, category, environment) to suggest relevant child components
- **Comprehensive Data Structure**: Each suggestion includes name, make, model, category, function, criticality level, common failures, PM relevance, and additional notes
- **Intelligent Prompting**: Focused on components that would typically have their own maintenance schedules
- **Backend Router Organization**: Properly structured FastAPI router with consistent error handling and logging

**Child Asset Suggestion UI:**
- **Post-Creation Popup**: AI suggestion modal appears automatically after successful parent asset creation
- **Professional Modal Design**: Clean interface with suggestion cards showing all AI-generated details
- **Checkbox Selection**: Users can select multiple suggested child assets for batch creation
- **Loading States**: Professional loading modal during AI processing with progress indicators
- **Error Handling**: Graceful error handling with user-friendly messages and fallback options

**Custom Confirmation Modals:**
- **Enhanced Delete Experience**: Replaced browser `confirm()` popups with custom confirmation modals
- **Professional Design**: Styled confirmation dialogs with clear messaging and action buttons
- **Consistent UX**: Applied to both parent and child asset delete operations
- **Better Accessibility**: Improved accessibility with proper focus management and keyboard navigation

**Child Asset Creation Fixes:**
- **Database Compatibility**: Fixed 400 errors when creating child assets from AI suggestions
- **Null Value Handling**: Proper handling of empty/null values instead of empty strings for database fields
- **Field Mapping**: Correct mapping between frontend and database field names (especially `serial_number` ↔ `serial_no`)
- **Validation Updates**: Updated validation to handle optional fields properly

**Advanced Category Management:**
- **Union Category Dropdown**: Child asset category field now displays both dim_assets categories AND custom category values
- **Custom Category Preservation**: When editing child assets with custom categories not in dim_assets table, the custom value appears in dropdown with "(Custom)" label
- **Dynamic Options**: `getCategoryOptions()` helper function creates union of standard categories plus current custom value
- **Error Prevention**: Added safety checks to prevent `toString()` errors on undefined id fields

**Technical Implementation:**
- **API Endpoint**: `POST /api/suggest-child-assets` with structured input validation using Pydantic models
- **Frontend Integration**: `suggestChildAssets()` function in `/src/api.js` with proper error handling
- **State Management**: Added suggestion-related state variables in ManageAssets component
- **Loading Management**: Comprehensive loading states for AI processing and asset creation
- **Error Recovery**: Robust error handling throughout the suggestion pipeline

**Database Integration:**
- **Efficient Queries**: Optimized database queries for child asset creation and category management
- **RLS Compatibility**: All queries work properly with Supabase Row Level Security policies
- **Transaction Safety**: Proper handling of database transactions during batch asset creation
- **Data Validation**: Server-side validation of AI-generated suggestions before database insertion

**Key Files Modified:**
- `/apps/welcome/backend/api/suggest_child_assets.py` - New AI suggestion endpoint
- `/apps/welcome/backend/main.py` - Router registration for child asset suggestions
- `/apps/welcome/frontend/src/api.js` - New API function for suggestion requests
- `/apps/welcome/frontend/src/pages/ManageAssets.jsx` - Complete suggestion UI integration and custom category handling

**User Experience Improvements:**
- **Streamlined Workflow**: Create parent asset → AI suggests children → select and create in batch
- **Visual Feedback**: Clear loading states, success messages, and error recovery options
- **Professional UI**: Consistent modal design language throughout the application
- **Accessibility**: Proper focus management, keyboard navigation, and screen reader support

**Error Resolution:**
- **toString() Error Fix**: Added null safety checks when rendering category options to prevent undefined id errors
- **Custom Category Support**: Proper handling of categories not in dim_assets table during edit operations
- **Loading State Management**: Fixed loading modal display issues during AI processing
- **API Integration**: Resolved API_BASE_URL issues and proper backend communication

#### Task Due Date Management & task_signoff System (Latest Session):

**New Task Signoff Workflow Implementation:**
- **Core Change**: Due dates now calculated using `child_assets.plan_start_date` + `pm_tasks.maintenance_interval` (format: "# months")
- **Weekend Adjustment**: All due dates automatically moved to previous Friday if they fall on weekends
- **task_signoff Table Integration**: Due dates sourced from `task_signoff` table instead of `pm_tasks.scheduled_dates`

**Database Schema - task_signoff Table:**
```sql
task_signoff (
  id_bad bigint (auto-generated legacy),
  created_at timestamptz (auto-generated),
  tech_id uuid REFERENCES users(id),
  task_id uuid REFERENCES pm_tasks(id),
  total_expense numeric,
  due_date date,
  comp_date date,  -- NULL = pending, filled = completed
  id uuid PRIMARY KEY (auto-generated)
)
```

**Workflow Logic:**
1. **PM Plan Creation**: Automatically creates task_signoff records with calculated due dates
2. **Task Status**: Uses `pm_tasks.status` + due date comparison for Overdue detection
3. **Signoff Status**: `comp_date IS NULL` = pending, `comp_date IS NOT NULL` = completed
4. **Due Date Updates**: Updates both `pm_tasks.scheduled_dates` and `task_signoff.due_date`
5. **Task Completion**: Updates existing signoff record + creates next occurrence

**Key Integration Points:**
- **Asset Creation**: Creates initial task_signoff records when PM plans are generated
- **Asset Deletion**: Cleans up task_signoff records when child assets/plans are deleted
- **Plan Updates**: Removes old signoffs and creates new ones when plans are replaced
- **plan_start_date Changes**: Recalculates all task_signoff due dates automatically
- **Task View**: Sources due dates from task_signoff table, shows proper status

**Backend Utilities:**
- `/apps/welcome/backend/api/task_due_dates.py` - Due date calculation and weekend adjustment
- `parseMaintenanceInterval()` - Parses "# months" format from AI
- `calculateDueDate()` - Calculates due dates with weekend adjustment
- `recalculateTaskSignoffDates()` - Updates due dates when plan_start_date changes

**Frontend Functions:**
- `createInitialTaskSignoffs()` - Creates signoff records when PM plans are saved
- `recalculateTaskSignoffDates()` - Recalculates due dates when base dates change
- Enhanced task view to display due dates from task_signoff table
- Signoff popup updates existing records instead of creating duplicates

**Cleanup Operations:**
- Child asset deletion → Marks PM plans as 'Replaced' + cleans pending signoffs
- PM plan replacement → Removes old signoffs before creating new plan
- Task deletion → Removes associated signoff records
- Plan start date edits → Recalculates all due dates

**Testing Checklist:**
- ✅ Create PM plan → task_signoff records created with proper due dates
- ✅ Weekend dates → automatically adjusted to previous Friday
- ✅ Edit plan_start_date → all due dates recalculated
- ✅ Delete child asset → PM plans marked 'Replaced', signoffs cleaned
- ✅ Complete task → existing signoff updated, next occurrence created
- ✅ Task view → shows dates from task_signoff table

**Important Notes:**
- Maintenance intervals must be in "# months" format from AI
- All due date logic uses child asset's plan_start_date as base
- Status tracking uses pm_tasks.status, not task_signoff status column
- Pending signoffs identified by `comp_date IS NULL`

#### Enhanced Task View & Scheduled Date Management (Latest Session):

**Task View Display Improvements:**
- **Separated Date Columns**: Replaced single "Date & Time" column with separate "Due" and "Scheduled" columns
- **Due Date Column**: Shows actual due date from `task_signoff.due_date` with date filter
- **Scheduled Column**: Shows scheduled date and time from `task_signoff.scheduled_date/scheduled_time` with independent date filter
- **Independent Filtering**: Each date column has its own filter input for precise task management
- **Improved Clarity**: Users can now distinguish between when tasks are due vs when they're scheduled

**Database Schema Updates - task_signoff Table:**
```sql
task_signoff (
  -- Previous fields
  id uuid PRIMARY KEY,
  tech_id uuid REFERENCES users(id),
  task_id uuid REFERENCES pm_tasks(id),
  due_date date,
  comp_date date,
  total_expense numeric,
  -- New fields added
  scheduled_date date,     -- When task is scheduled to be performed
  scheduled_time time,     -- Specific time for scheduled task
  created_at timestamptz,
  id_bad bigint
)
```

**Task Display Logic:**
- **Initial Creation**: `scheduled_date` automatically set to `due_date` when task_signoff records are created
- **Task Editing**: Both `scheduled_date` and `scheduled_time` can be updated through task edit interface
- **Task Completion**: When tasks are completed, next occurrence includes `scheduled_date = due_date`
- **Filtering**: Independent date filters for due date and scheduled date provide precise task management

**Performance Optimizations:**
- **Eliminated Multiple Page Loads**: Fixed React hooks violations and redundant authentication calls
- **Removed Redundant API Calls**: Consolidated multiple `supabase.auth.getUser()` calls to use single `useAuth()` hook
- **Optimized Re-renders**: Removed excessive debug logging and optimized state updates
- **Fixed Loading Issues**: Eliminated race conditions causing multiple component re-renders

**Technical Implementation:**
- Updated task data mapping to include `dueDate`, `scheduledDate`, and `scheduledTime` fields
- Enhanced database queries to include `scheduled_date` and `scheduled_time` from task_signoff table
- Fixed task_signoff updates to use `.is('comp_date', null)` instead of `.eq('comp_date', null)`
- Added new filter state `filterScheduledDate` with persistence
- Updated sorting logic to handle both due date and scheduled date fields

**Key Database Operations:**
- **createInitialTaskSignoffs()**: Sets `scheduled_date = due_date` and `scheduled_time = null`
- **updateTask()**: Updates both pm_tasks and task_signoff tables simultaneously
- **createNextTask()**: Creates next occurrence with proper scheduled_date initialization
- **Task View Queries**: Sources display dates from task_signoff table with proper fallbacks

**User Experience Improvements:**
- **Clear Separation**: Due dates vs scheduled dates are visually distinct
- **Flexible Scheduling**: Users can schedule tasks for different dates than due dates
- **Better Filtering**: Independent filters allow finding tasks by either due date or scheduled date
- **Faster Loading**: Performance optimizations eliminate multiple loading attempts
- **Consistent Data**: All date/time information sourced from task_signoff table for consistency

**Files Modified:**
- `/apps/welcome/frontend/src/components/dashboard/maintenance-schedule.tsx` - Enhanced task view with dual date columns and performance optimizations
- `/apps/welcome/frontend/src/api.js` - Updated createInitialTaskSignoffs to include scheduled_date field
- Task filtering, sorting, and display logic updated throughout the component

**Performance Fixes Applied:**
- Removed React hooks order violations (useMemo placed after conditional returns)
- Eliminated redundant `supabase.auth.getUser()` calls throughout component
- Removed excessive console.log statements affecting render performance
- Fixed syntax errors with missing semicolons causing babel parser issues
- Optimized task status update timing to avoid immediate re-renders

#### Task View Infrastructure Simplification (CRITICAL - DO NOT MODIFY):

**🚨 IMPORTANT: These infrastructure changes are CRITICAL to application stability. DO NOT modify or "improve" this logic unless explicitly requested by the user.**

**Query Structure (MUST USE THIS EXACT PATTERN):**
```javascript
// Start from task_signoff as primary table with nested joins
const { data, error } = await supabase
  .from('task_signoff')
  .select(`
    id,
    due_date,
    scheduled_date,
    scheduled_time,
    comp_date,
    status,
    pm_tasks!inner (
      id,
      task_name,
      maintenance_interval,
      est_minutes,
      tools_needed,
      no_techs_needed,
      reason,
      safety_precautions,
      engineering_rationale,
      common_failures_prevented,
      usage_insights,
      instructions,
      consumables,
      scheduled_dates,
      pm_plans!inner (
        id,
        status,
        child_asset_id,
        site_id,
        created_by,
        child_assets!inner (
          id,
          name
        )
      )
    )
  `)
  .neq('status', 'deleted')
  .eq('pm_tasks.pm_plans.status', 'Current')
```

**Simplified Task Display Logic:**
- **Single Source of Truth**: Task view queries start from `task_signoff` table as primary
- **Join Pattern**: task_signoff → pm_tasks → pm_plans → child_assets
- **No Fallback Logic**: Completely removed backward compatibility code that created extra records
- **Controlled Process**: All valid tasks must have corresponding task_signoff records

**Data Transformation (DO NOT CHANGE):**
```javascript
for (const signoff of data) {
  const task = signoff.pm_tasks;
  const plan = task.pm_plans;
  const asset = plan.child_assets;
  // Each record is a signoff with nested task/plan/asset data
}
```

**Filter Logic (DO NOT CHANGE):**
- **Primary Filter**: `.neq('status', 'deleted')` on task_signoff
- **PM Plan Filter**: `.eq('pm_tasks.pm_plans.status', 'Current')`
- **Completed Task Toggle**: Uses `!showCompletedTasks && task.status === 'Completed'`
- **Status Determination**: Tasks marked 'Completed' ONLY when `signoff.comp_date` exists

**Critical Implementation Details:**
- **Record Count Accuracy**: Task view displays exactly the same number of records as task_signoff table (excluding deleted)
- **Status Logic**: 
  - `signoff.comp_date` exists → status = 'Completed'
  - `signoff.comp_date` is null → status = 'Scheduled' or 'Overdue' based on due date
- **Field Mapping**: Only use fields that actually exist in database tables

**Files with Critical Logic (HANDLE WITH EXTREME CARE):**
- `/apps/welcome/frontend/src/components/dashboard/maintenance-schedule.tsx` lines 159-275
  - fetchTasks() function with specific query structure
  - Data transformation from nested structure
  - Completed task toggle functionality

**What Was Removed (DO NOT RESTORE):**
- Fallback else block for tasks without signoff records
- Complex nested loops for signoff filtering
- Fields that don't exist: notes from pm_tasks; tech_id, total_expense from query
- NOTE: criticality DOES exist in pm_tasks table and is now properly included in queries

**Validation Requirements:**
- Task view record count MUST match task_signoff table count (excluding deleted records)
- Query MUST start from task_signoff table, not pm_tasks
- Completed task toggle MUST continue to function properly
- All task status logic MUST be based solely on task_signoff.comp_date field

#### Criticality Fields (Two Different Purposes):

**🚨 IMPORTANT: There are TWO different criticality fields serving different purposes:**

**1. Asset Criticality (`child_assets.criticality`):**
- **Purpose**: Criticality of the physical asset/part itself
- **Updated Via**: Asset View dashboard when editing child assets
- **Use Cases**: Asset prioritization, replacement planning, resource allocation
- **Values**: High, Medium, Low
- **Location**: `child_assets` table

**2. Task Criticality (`pm_tasks.criticality`):**
- **Purpose**: Criticality of the specific maintenance task
- **Updated Via**: Task View dashboard when editing maintenance tasks
- **Use Cases**: Task prioritization, scheduling urgency, maintenance planning
- **Values**: High, Medium, Low
- **Location**: `pm_tasks` table

**Implementation in Task View:**
- Query includes `pm_tasks.criticality` in select statement
- Data transformation maps `task.criticality` to `priority` field
- Edit dialog loads task criticality and allows updates
- Updates are saved to `pm_tasks.criticality` field

**Example Scenarios:**
- **High Asset Criticality + Low Task Criticality**: Critical equipment with routine inspection
- **Medium Asset Criticality + High Task Criticality**: Standard equipment with critical safety check
- **High Asset Criticality + High Task Criticality**: Critical equipment with critical maintenance task

### Task View Dialog Constraints (CRITICAL - DO NOT MODIFY):

**🚨 IMPORTANT: These UI constraints are CRITICAL for usability. DO NOT modify without explicit user request.**

#### View Task Dialog Height Constraint:

**Problem Solved:** View task detail popup was taller than browser viewport, causing content to be inaccessible and no scrolling available.

**Solution Implementation (`maintenance-schedule.tsx`):**
```javascript
// View Task Dialog with proper height constraints
<DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
  <DialogHeader className="flex-shrink-0">
    {/* Fixed header */}
  </DialogHeader>
  
  <div className="flex-1 overflow-hidden">
    <div className="h-full overflow-y-auto space-y-6 px-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      {/* Scrollable content area */}
    </div>
  </div>
  
  <div className="flex justify-end space-x-2 mt-6 flex-shrink-0">
    {/* Fixed footer buttons */}
  </div>
</DialogContent>
```

**Technical Details:**
- **Dialog Height**: Constrained to 90% of viewport height (`max-h-[90vh]`)
- **Layout Structure**: Flexbox column layout with header, scrollable content, and footer
- **Header**: Fixed with `flex-shrink-0` - never shrinks or scrolls
- **Content Area**: Scrollable with `overflow-y-auto` and calculated max height
- **Footer**: Fixed with `flex-shrink-0` - always visible
- **Scrolling**: Vertical scrollbar appears when content exceeds available space

**User Experience:**
- All task details remain accessible through scrolling
- Header and action buttons always visible
- Fits within any browser viewport size
- Smooth scrolling for long task details

#### Completed Task Action Button Restrictions:

**Problem Solved:** Users could accidentally edit, delete, or sign off tasks that were already completed, potentially corrupting data integrity.

**Solution Implementation:**
```javascript
// Conditional rendering for Edit and Delete buttons
{task.status !== 'Completed' && (
  <>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>
          <Edit className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit task</p>
      </TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete task</p>
      </TooltipContent>
    </Tooltip>
  </>
)}

// Conditional rendering for SignOff button
{task.status !== 'Completed' && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="sm" onClick={() => handleSignOffTask(task)}>
        <CheckCircle className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Sign off task</p>
    </TooltipContent>
  </Tooltip>
)}
```

**Button Visibility Rules:**
- **Hidden for Completed Tasks**: Edit Task, Delete Task, Sign Off Task
- **Always Visible**: View Task Details, Export Task
- **Status Check**: Uses `task.status !== 'Completed'` condition
- **Applied Globally**: All task tables and views use same conditional logic

**Data Integrity Benefits:**
- Prevents accidental modification of completed work
- Maintains audit trail accuracy
- Reduces user errors and data corruption
- Clear visual indication of task completion status

**Files Modified:**
- `/src/components/dashboard/maintenance-schedule.tsx` - Dialog height constraints and button conditional rendering

**Validation Requirements:**
- View task dialog MUST fit within browser viewport with scrolling
- Header and footer MUST remain fixed and visible during scrolling
- Edit/Delete/SignOff buttons MUST be hidden for completed tasks
- View and Export buttons MUST remain visible for all task statuses
- All changes MUST maintain existing functionality for non-completed tasks

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

### Tab State Persistence (CRITICAL - DO NOT REMOVE):

**🚨 IMPORTANT: This tab persistence functionality is CRITICAL to user experience. DO NOT modify or remove unless explicitly requested.**

**Problem Solved:** Dashboard tabs were losing state when switching between Asset View, Task View, Calendar View, and Weekly View. Users would lose their selected parent asset and child asset selections when navigating between tabs.

**Solution Implementation:**

**1. Component Persistence in Tabs (`maintenance-schedule.tsx`):**
```javascript
// CRITICAL: forceMount and hidden props prevent component unmounting
<TabsContent value="assets" className="space-y-6" forceMount hidden={viewMode !== 'assets'}>
  <ManageAssets />
</TabsContent>
<TabsContent value="list" className="space-y-6" forceMount hidden={viewMode !== 'list'}>
<TabsContent value="calendar" className="space-y-6" forceMount hidden={viewMode !== 'calendar'}>
<TabsContent value="weekly" className="space-y-6" forceMount hidden={viewMode !== 'weekly'}>
```

**2. State Persistence in ManageAssets (`ManageAssets.jsx`):**
```javascript
// Persist selected parent asset across tab switches
const [selectedParentAsset, setSelectedParentAssetInternal] = useState(() => {
  const saved = loadState('selectedParentAsset', null);
  return saved;
});

const setSelectedParentAsset = (asset) => {
  setSelectedParentAssetInternal(asset);
  saveState('selectedParentAsset', asset);
};

// Persist selected child asset across tab switches  
const [selectedChildAssetForPlan, setSelectedChildAssetForPlanInternal] = useState(() => {
  const saved = loadState('selectedChildAssetForPlan', null);
  return saved;
});

const setSelectedChildAssetForPlan = (asset) => {
  setSelectedChildAssetForPlanInternal(asset);
  saveState('selectedChildAssetForPlan', asset);
};
```

**3. Automatic State Restoration:**
- `loadParentAssets()` function automatically restores selected parent asset after loading
- `loadChildAssets()` function automatically restores selected child asset and loads associated PM plans
- Uses existing `utils/statePersistence.js` utility with 30-minute expiry in sessionStorage

**Technical Details:**
- **forceMount**: Keeps all tab content mounted in DOM but hidden when inactive
- **hidden**: Controls visibility without unmounting components
- **sessionStorage**: Persists state within browser session (cleared when tab closes)
- **Automatic Restoration**: Seamlessly restores selections after data loads without user intervention

**User Experience:**
- Select parent asset → switch tabs → return to Asset View → selection preserved
- Select child asset → switch tabs → return to Asset View → both parent and child selections preserved
- PM plans automatically reload for restored child asset selections
- Zero user interaction required for state restoration

**Files Modified:**
- `/src/components/dashboard/maintenance-schedule.tsx` - Tab persistence with forceMount
- `/src/pages/ManageAssets.jsx` - State persistence and restoration logic
- Uses existing `/src/utils/statePersistence.js` utility

**Validation Requirements:**
- Asset selections MUST persist across all tab switches
- PM plan context MUST be restored when returning to Asset View
- Performance MUST remain optimal (no unnecessary re-renders or API calls)
- State MUST expire after 30 minutes to prevent stale data

### Date Handling (CRITICAL - DO NOT MODIFY):

**🚨 IMPORTANT: This date handling functionality is CRITICAL to data integrity. DO NOT modify unless explicitly requested.**

**Problem Solved:** HTML date inputs were causing timezone-related date shifts. Users would enter "9/1/2025" but it would save as "8/31/2025" due to timezone conversion issues between browser local time and database storage.

**Root Cause:** When browsers handle HTML date inputs, they interpret dates in local timezone. JavaScript's `new Date()` constructor with "YYYY-MM-DD" strings interprets them as UTC midnight, causing timezone shifts when converted back to local time for display or editing.

**Solution Implementation (`ManageAssets.jsx`):**

**1. Dedicated Date Formatting Functions:**
```javascript
// For display purposes only (shows user-friendly dates)
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Handle date as string to avoid timezone issues
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  return new Date(dateString).toLocaleDateString();
};

// For HTML date inputs (always YYYY-MM-DD format)
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format, return as-is
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Handle ISO date strings from database (e.g., "2025-09-01T00:00:00.000Z")
  if (typeof dateString === 'string' && dateString.includes('T')) {
    return dateString.split('T')[0]; // Extract date part before 'T'
  }
  
  // Force local timezone interpretation for other formats
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
```

**2. Consistent Date Input Handling:**
```javascript
// When populating edit modal with existing asset data
const openEditModal = (asset, isParent = true) => {
  const modalData = {
    // ... other fields
    purchase_date: formatDateForInput(asset.purchase_date),
    install_date: formatDateForInput(asset.install_date),
    // For child assets:
    plan_start_date: formatDateForInput(asset.plan_start_date)
  };
};
```

**3. Database Operation Date Handling:**
```javascript
// When creating or updating assets
const assetData = {
  // ... other fields
  purchase_date: newAsset.purchase_date ? newAsset.purchase_date : null,
  install_date: newAsset.install_date ? newAsset.install_date : null,
  plan_start_date: newAsset.plan_start_date ? newAsset.plan_start_date : null
};
```

**Technical Details:**
- **Input Fields**: Always receive YYYY-MM-DD formatted strings via `formatDateForInput()`
- **Database Storage**: Dates sent as pure YYYY-MM-DD strings or null (never empty strings)
- **Display**: User-friendly format via `formatDate()` for table cells and detail views
- **Timezone Handling**: Prevents shifts by avoiding UTC interpretation of date strings

**Applied To All Date Operations:**
- Parent asset creation (`handleCreateParentAsset`)
- Child asset creation (`handleCreateChildAsset`)
- Asset editing (`handleEditModalSave`)
- Date display in tables and detail views
- Edit modal population (`openEditModal`)

**User Experience:**
- Enter "9/1/2025" → saves as "2025-09-01" → displays as "9/1/2025"
- No timezone-related date shifts
- Consistent date handling across all asset management operations
- Proper null handling for optional date fields

**Files Modified:**
- `/src/pages/ManageAssets.jsx` - Complete date handling overhaul with dedicated functions

**Validation Requirements:**
- Dates entered MUST save exactly as entered (no timezone shifts)
- HTML date inputs MUST display correct dates when editing existing assets
- Empty date fields MUST be stored as null, never empty strings
- All CRUD operations MUST use consistent date formatting
- Date display MUST be user-friendly in tables and detail views

### Testing & Quality

Currently no test suite configured. When implementing tests:
- Frontend: Consider Vitest with React Testing Library
- Backend: Use pytest for FastAPI endpoints

### Deployment

- Frontend deploys to Vercel (configured in vercel.json)
- Backend typically deployed separately (Render, Railway, etc.)
- CORS must be configured for production domains
- memorize