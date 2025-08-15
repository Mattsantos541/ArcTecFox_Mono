# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArcTecFox Mono is a monorepo for a Preventive Maintenance (PM) planning application with AI-powered features. The application helps organizations manage assets, create maintenance schedules, and generate PM plans using Google's Gemini AI.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript, Vite, Tailwind CSS with Radix UI
- **State**: React Context (AuthProvider), React Hook Form with Zod validation
- **Database**: Supabase (auth, storage, database)

### Backend
- **Framework**: FastAPI (Python)
- **AI**: Google Generative AI (Gemini)
- **File Processing**: PyPDF2, python-docx, Pillow, ReportLab, jsPDF

## Commands

```bash
# Frontend
npm run dev:lite          # Start dev server
npm run build:lite        # Build production

# Backend  
cd apps/welcome/backend
uvicorn main:app --reload --port 8000

# Install dependencies
npm install               # Frontend (from root)
pip install -r requirements.txt  # Backend
```

## Architecture

### Directory Structure
- `/apps/welcome/frontend/` - React app
  - `/src/components/` - Reusable UI components
  - `/src/pages/` - Route pages (PMPlanner, UserManagement, etc.)
  - `/src/hooks/` - Custom hooks (useAuth, useToast, etc.)
- `/apps/welcome/backend/` - FastAPI app
  - `main.py` - Main application with CORS and routes
  - `/api/` - API endpoints

### Key Routes
- `/` - Dashboard with Asset View, Task View, Calendar View, Weekly View
- `/pmplanner` - PM Planning with AI assistance
- `/admin/*` - User, company, asset, super-admin management

### Database Schema

**Core Tables:**
```sql
-- Assets (hierarchical)
parent_assets (id, name, make, model, serial_number, category, site_id, environment, cost_to_replace, ...)
child_assets (id, name, make, model, serial_no, parent_asset_id, operating_hours, plan_start_date, cost_to_replace, ...)

-- PM System
pm_plans (id, child_asset_id, created_by, site_id, status, ...)
pm_tasks (id, pm_plan_id, task_name, maintenance_interval, criticality, instructions[], ...)

-- Task Management  
task_signoff (id, tech_id, task_id, due_date, scheduled_date, scheduled_time, comp_date, ...)
signoff_consumables (id, so_id, consumable, cost, used, ...)

-- File Storage
loaded_manuals (id, parent_asset_id, child_asset_id, file_path, ...)
loaded_signoff_docs (id, so_Id, file_path, ...)
```

**Key Relationships:**
- PM plans only link to child assets (`pm_plans.child_asset_id`)
- Tasks inherit access through: `task_signoff → pm_tasks → pm_plans → child_assets → parent_assets → sites`
- Due dates calculated from `child_assets.plan_start_date` + `pm_tasks.maintenance_interval`

## Asset Management

### Unified Interface
Asset management available in dashboard "Asset View" tab and `/admin/assets`:
- **Parent Assets**: Site-linked with environment, make, model, serial
- **Child Assets**: Parent-linked with PM fields (operating_hours, plan_start_date)
- **Hierarchical Display**: Children appear indented below parents in same table
- **PM Integration**: Click child assets to view associated maintenance plans
- **File Management**: Upload/manage manuals directly in edit modals

### AI-Powered Suggestions
- After creating parent assets, AI suggests relevant child components
- Uses Gemini-2.0-flash-exp to analyze parent details and suggest maintainable parts
- Batch creation of suggested child assets with comprehensive details

### Asset Insights Dashboard
**Location:** Displays below asset table when parent asset is selected (Asset View tab)

**Features:**
- **Summary Cards**: Days in production, maintenance hours, total expenses, operating hours
- **Expense Graph**: Cumulative maintenance costs vs replacement cost over time
- **Interactive Controls**: Child asset filtering, date range picker, percentage/dollar toggle
- **Smart Filtering**: Date range validates against install date minimum

**Data Sources:**
- Maintenance history from `task_signoff` table (completed tasks only)
- Consumable expenses from `signoff_consumables` table  
- Replacement costs from `parent_assets.cost_to_replace` and `child_assets.cost_to_replace`
- Operating hours calculated from `child_assets.operating_hours` (weekly) × time period

**Replacement Cost Logic:**
- **All Assets view**: Uses parent replacement cost only (includes child components)
- **Individual child view**: Uses specific child asset replacement cost
- **No double counting**: Parent cost already includes child component costs

### Field Mapping Notes
- **Parent**: `serial_number` field in database
- **Child**: `serial_no` field in database (frontend maps between them)
- **Environment**: Only in parent_assets, inherited by children
- **Categories**: Child assets use dropdown from `dim_assets` + custom values

## PM Planner Integration

### Asset Selection
- Replaced manual entry with parent/child asset dropdowns
- Auto-populates form fields from selected assets
- Includes all uploaded manuals automatically
- Sends complete asset context to AI for better plan generation

### Plan Detection & Display
- Automatically detects existing PM plans for selected child assets
- Displays existing plans with identical formatting to new generations
- Populates form fields from existing plan data

## Task Management System

### Task Signoff Workflow
**Due Date Logic:**
- Calculated from `child_assets.plan_start_date` + `pm_tasks.maintenance_interval` ("# months")
- Weekend dates automatically moved to previous Friday
- Stored in `task_signoff.due_date`, not `pm_tasks.scheduled_dates`

**CRITICAL: Maintenance Interval Parsing (apps/welcome/frontend/src/api.js:parseMaintenanceInterval)**
The `parseMaintenanceInterval` function is essential for accurate due date calculations. It must handle diverse AI-generated interval formats:
- **Text formats**: "Monthly" → 1, "Quarterly" → 3, "Annually" → 12
- **Complex formats**: "Every 3 months" → 3, "6 months or 5000 miles" → 6
- **Parsing logic**: Removes prefixes ("every"), suffixes ("or..."), extracts first number via regex
- **Failure impact**: Incorrect parsing causes all tasks to get same due date instead of proper intervals
- **Dependencies**: Used by `createInitialTaskSignoffs` and `recalculateTaskSignoffDates`
- **Location**: This logic exists in both frontend (api.js) and backend (task_due_dates.py) - keep synchronized

**Task Status:**
- Pending: `task_signoff.comp_date IS NULL`
- Completed: `task_signoff.comp_date IS NOT NULL`
- Overdue: Pending + past due date

**Scheduling:**
- `scheduled_date`: When task is planned to be performed
- `scheduled_time`: Specific time for task
- Independent filtering by due date vs scheduled date

### CRITICAL CONSTRAINTS (DO NOT MODIFY)

#### Task View Query Structure
```javascript
// MUST start from task_signoff table with exact nested joins
const { data } = await supabase
  .from('task_signoff')
  .select(`
    id, due_date, scheduled_date, scheduled_time, comp_date, status,
    pm_tasks!inner (
      id, task_name, criticality, /* all task fields */,
      pm_plans!inner (
        id, status, child_asset_id, site_id,
        child_assets!inner (id, name)
      )
    )
  `)
  .neq('status', 'deleted')
  .eq('pm_tasks.pm_plans.status', 'Current')
```

#### UI Constraints
**Dialog Height:** View task dialog constrained to 90vh with scrollable content
**Completed Task Restrictions:** Edit/Delete/SignOff buttons hidden for completed tasks
**Tab Persistence:** All dashboard tabs use `forceMount` and `hidden` to preserve state

#### Date Handling
**HTML Date Inputs:** Always use `formatDateForInput()` to prevent timezone shifts
**Database Storage:** Dates as YYYY-MM-DD strings or null, never empty strings
**Display:** Use `formatDate()` for user-friendly display

## Authentication & Permissions

- **Supabase Auth** with Google OAuth
- **RLS Policies** control data access through site membership
- **File Storage** in user-specific folders: `user-manuals/{user-id}/filename`
- **Site-based Access** through `site_users` table

## Environment Variables

```bash
# Frontend
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# Backend  
SUPABASE_URL
SUPABASE_KEY
GEMINI_API_KEY
CORS_ORIGIN
```

## Common Issues & Fixes

### Command Line Access
```bash
# In Codespaces: Ctrl + ` to open terminal
# Quick port kill: sudo fuser -k 3000/tcp
```

### SQL Syntax
```sql
-- Update columns to NULL
UPDATE table SET column = NULL WHERE condition;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

### Git Conflicts
```bash
git status                    # Check conflicts
git merge origin/main         # Merge latest
# Edit conflict files manually
git add .                     # Mark resolved
git commit -m "Resolve conflicts"
```

### Number Input Issues
```html
<!-- Avoid step="0.01" for large numbers - use step="any" instead -->
<input type="number" step="any" value={cost} onChange={...} />
```

## Performance Notes

- Task view queries use nested joins for efficiency
- Tab persistence prevents component unmounting/remounting
- Date handling avoids timezone conversion issues

## Development Best Practices

### Code Reusability (CRITICAL)
**ALWAYS reuse existing working functions and services instead of recreating them:**
- **Supabase Client**: Always import and use the shared client from `api.js` (`import { supabase } from '../api'`)
- **Storage Service**: Use the existing `createStorageService()` from `storageService.js`
- **Authentication**: Use existing hooks (`useAuth`) and functions from `api.js`
- **Common Utilities**: Check `utils/` folder for existing helper functions before creating new ones
- **State Management**: Use existing contexts and providers rather than creating duplicate state logic

**Why This Matters:**
- Prevents authentication/session issues (multiple Supabase clients can have different auth states)
- Ensures consistent behavior across the application
- Reduces bundle size and improves performance
- Makes debugging easier with single points of truth
- Maintains data consistency across components

**Before Creating Any New Function:**
1. Search the codebase for similar functionality
2. Check if an existing function can be extended/modified
3. Import and reuse rather than copy-paste code
4. If modification is needed, update the original function rather than creating a duplicate

## Calendar View Layout (CRITICAL - DO NOT MODIFY):

**🚨 IMPORTANT: The calendar component layout is now PERFECT and should NOT be modified unless explicitly requested.**

**Fixed Navigation Controls:**
- Month navigation arrows and title are positioned with fixed constraints using `shrink-0` classes
- Navigation controls stay in exact same position regardless of calendar content changes
- Month title uses fixed `w-[180px]` width to prevent compression
- All navigation elements isolated from calendar content sizing

**Consistent Calendar Dimensions:**
```javascript
// Fixed calendar container structure (DO NOT CHANGE)
<CardContent>
  <div className="w-full overflow-x-auto">
    <div className="min-w-[980px]">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {/* Each header cell: w-[140px] */}
      </div>
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Each calendar cell: w-[140px] min-h-[100px] */}
      </div>
    </div>
  </div>
</CardContent>
```

**Technical Implementation:**
- **Fixed Width**: Calendar maintains exactly 980px width (7 columns × 140px)
- **No Layout Shifts**: Calendar content changes don't affect header positioning
- **Responsive**: Horizontal scroll enabled for smaller screens via `overflow-x-auto`
- **Cell Consistency**: All calendar cells use exact `w-[140px]` width (not min-width)
- **Header Isolation**: Navigation controls completely separate from calendar content sizing

**User Experience Results:**
- Smooth month navigation without layout jumps
- Navigation arrows stay in fixed positions
- Month title remains centered and stable
- Calendar maintains uniform appearance across all months
- No more difficult navigation due to moving controls

**Key CSS Classes (CRITICAL):**
- Navigation container: `shrink-0`
- Navigation buttons: `shrink-0`  
- Month title: `w-[180px] shrink-0`
- Calendar wrapper: `min-w-[980px]`
- Calendar cells: `w-[140px]` (exact width, not min-width)

This implementation ensures perfect calendar navigation and should be preserved exactly as implemented.
- AI suggestions use structured prompts for consistent results