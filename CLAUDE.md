# CLAUDE.md

ArcTecFox Mono - Preventive Maintenance (PM) planning application with AI-powered features.

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: FastAPI (Python) 
- **Database**: Supabase (auth, storage, database with RLS)
- **AI**: Google Gemini
- **Email**: Resend (production) or Supabase native

## Testing
All testing is done in github codespaces and I used the following script to ensure the local back end server is up, then the front end server starts up:
/workspaces/ArcTecFox_Mono/start-dev.sh
While testing all environment variables are stored in the frontend and backend .env files


# Backend  
cd apps/welcome/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000  # Note: use --host 0.0.0.0 for Codespaces

# Dependencies
npm install               # Frontend (from root)
pip install -r requirements.txt  # Backend
```

## Core Database Schema
```sql
-- Assets (hierarchical)
parent_assets (id, name, site_id, serial_number, cost_to_replace, ...)
child_assets (id, name, parent_asset_id, serial_no, plan_start_date, operating_hours, ...)

-- PM System
pm_plans (id, child_asset_id, site_id, created_by, status, ...)
pm_tasks (id, pm_plan_id, task_name, maintenance_interval, criticality, ...)
task_signoff (id, tech_id, task_id, due_date, comp_date, ...)

-- User Management
site_users (user_id, site_id, role_id)
invitations (id, email, site_id, role_id, invited_by, token, expires_at, ...)
```

## Key Relationships
- PM plans link to **child assets only** (`pm_plans.child_asset_id`)
- Site access: `task_signoff → pm_tasks → pm_plans → child_assets → parent_assets → sites`
- Due dates: `child_assets.plan_start_date` + `pm_tasks.maintenance_interval`

## Authentication & Security
- **Supabase JWT tokens** for all backend API calls
- **RLS policies** enforce site-based data isolation
- **Service key** only for system operations (invitations, migrations)
- All endpoints require authentication via `verify_supabase_token()`

## Environment Variables
```bash
# Frontend
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_BACKEND_URL

# Backend
SUPABASE_URL
SUPABASE_ANON_KEY         # For token verification
SUPABASE_SERVICE_KEY      # System operations only
GEMINI_API_KEY
RESEND_API_KEY           # Optional - remove to use Supabase email
CORS_ORIGIN
FRONTEND_URL
```

## Database Management
- **Production Database**: Live data on main Supabase project
- **Development Database**: Separate Supabase project for testing
- **Split Database Approach**: 
  - Development: Uses .env files for local testing in GitHub Codespaces
  - Production: Uses platform environment variables (Render)
  - Schema changes tested in dev before applying to production
  - Migration scripts used to sync schema changes between environments

## CRITICAL DO NOT MODIFY

### 1. Task View Query Structure
```javascript
// MUST use exact nested join pattern - DO NOT CHANGE
const { data } = await supabase
  .from('task_signoff')
  .select(`
    id, due_date, scheduled_date, comp_date, status,
    pm_tasks!inner (
      id, task_name, criticality,
      pm_plans!inner (
        id, status, child_asset_id, site_id,
        child_assets!inner (id, name)
      )
    )
  `)
  .neq('status', 'deleted')
  .eq('pm_tasks.pm_plans.status', 'Current')
```

### 2. Calendar Layout (PERFECT - DO NOT TOUCH)
- Fixed 980px width (7 columns × 140px)
- Navigation uses `shrink-0` classes
- Month title: `w-[180px] shrink-0`
- Calendar cells: `w-[140px]` (exact width)

### 3. RLS Policies - EXTREME CAUTION
```sql
-- ❌ NEVER create circular references
CREATE POLICY "bad" ON site_users USING (
  site_id IN (SELECT site_id FROM site_users WHERE user_id = auth.uid()) -- CIRCULAR!
);

-- ✅ Use simple patterns
CREATE POLICY "good" ON table USING (created_by = auth.uid());
```

## CRITICAL PARSING FUNCTION
```javascript
// apps/welcome/frontend/src/api.js:parseMaintenanceInterval
// Handles AI-generated intervals: "Monthly" → 1, "Every 3 months" → 3
// MUST stay synchronized with backend task_due_dates.py
// Failure causes all tasks to get same due date
```

## Common Supabase Patterns
```javascript
// ✅ Correct patterns
.select('id,email,name')  // No spaces
.select()                 // Get all fields
.insert([{field: value}]) // Array insert

// ❌ Wrong patterns  
.select('id, email, name') // Spaces cause 406 errors
.insert({field: value})    // Object insert fails
```

## Development Best Practices
1. **Reuse existing functions** - import from `api.js`, `storageService.js`
2. **Follow existing query patterns** exactly
3. **Check existing RLS policies** before creating new ones
4. **Use shared email templates** (`email_templates.py`)
5. **Test RLS changes in development first** - can break entire system

## Safe Development-to-Production Workflow
1. **Database Changes**: Create versioned migration SQL files, test on dev database first
2. **Schema Changes**: Apply same migration files to production using Supabase SQL editor
3. **RLS Policies**: Test with multiple user scenarios in dev before production changes
4. **Application Code**: Test build process and environment variable detection
5. **Deployment**: Use existing pipeline (Render for backend, frontend build)
6. **Rollback Plan**: Always have rollback SQL/code ready before production changes

## File Storage
- Site-based paths: `sites/{site_id}/{filename}`
- Legacy paths: `{user_id}/{filename}` (backward compatibility)
- Always pass `siteId` for new uploads

## User Management
- **Existing users**: Direct addition via search (no email)
- **New users**: Email invitation flow
- Backend handles invitation creation with service key
- Frontend calls `/api/send-invitation` endpoint

## CURRENT IMPLEMENTATION STATUS - Parent Asset PM Enhancement

### What We've Implemented ✅
1. **Parent Asset Creation Workflow**:
   - Enhanced parent asset creation process in `ManageAssets.jsx`
   - Added `ParentPlanLoadingModal` component for user feedback
   - Integrated `full_parent_create_prompt.py` API call after asset creation
   - Creates PM plan records with `child_asset_id = NULL` for parent assets
   - Stores critical spare parts in `parent_assets.critical_spare_parts` JSON field

2. **API Functions Added**:
   - `generateParentPlan()` - Calls AI to generate parent maintenance plan
   - `createParentPMPlan()` - Creates PM plan record for parent asset
   - `createPMTasks()` - Creates multiple PM task records from AI response
   - `updateParentAssetSpares()` - Updates parent asset with critical spares

3. **Backend Integration**:
   - Added `full_parent_create_prompt` router to main FastAPI app
   - `/api/generate-parent-plan` endpoint available and working
   - Generates at least 2 parent oversight tasks (Weekly Health Check, Monthly Audit)

4. **Database Schema**:
   - Fixed `pm_plans.plan_start_date` NOT NULL constraint issue
   - Parent plans stored with `child_asset_id = NULL`
   - PM tasks created with proper maintenance intervals and details

### Successfully Implemented Features ✅

**Asset Insights Parent Task Display**:
- `fetchParentPMTasks()` function in `api.js:2054-2109` 
- Parent PM data fetching in `AssetInsightsDashboard.jsx:75-103`
- UI sections for parent tasks and spare parts in `AssetInsightsDashboard.jsx:415-534`
- Parent-level maintenance tasks now display correctly in Asset Insights dashboard

## CURRENT DEVELOPMENT TASK - Parent Asset PDF Export

### What We're Trying to Accomplish
Add PDF export functionality for parent assets that mirrors the existing child asset export but includes parent-specific data:

**Required Features:**
1. **Export Button**: Add a Download icon button to parent asset rows (matching child asset button style and order: Download → Edit → Delete)
2. **PDF Content**:
   - Page 1: Parent asset metadata + Critical spare parts table
   - Page 2: Parent maintenance tasks (from parent PM plans)  
   - Page 3: Analytics graph from Asset Insights dashboard
3. **Data Integration**: Use existing APIs and data structures where possible

### Issues Encountered with Multi-Agent Approach
- **Complexity Overload**: Multiple agents made assumptions and created integration gaps
- **Over-Engineering**: Created extensive documentation and test frameworks before core functionality worked
- **Coordination Problems**: Agents modified multiple files simultaneously without verification
- **Unverified Implementation**: Changes made without testing actual functionality

### SIMPLIFIED IMPLEMENTATION PLAN 

**Phase 1: Core Functionality (Direct Implementation)**
1. Add `html2canvas` dependency for graph export: `npm install html2canvas`
2. Add Download button to parent asset row in `ManageAssets.jsx` (line ~2313)
   - Use existing `Download` icon from lucide-react
   - Match child asset button styling exactly
   - Place before Edit button for consistent order
3. Create `handleExportParentAssetPDF()` function to gather data
4. Create `exportParentAssetToPDF()` function in `pdfExport.js` based on existing `exportMaintenanceTaskToPDF()`

**Phase 2: Integration & Testing**
1. Test with real parent asset data
2. Verify graph export with html2canvas works
3. Handle edge cases (no spares, no tasks, etc.)
4. Match existing PDF styling and colors

**Phase 3: Polish**
1. Add loading states to button
2. Error handling and user feedback
3. File naming consistency

**Key Success Metrics:**
- ✅ Button appears in parent asset row
- ✅ Clicking generates multi-page PDF
- ✅ PDF contains all parent asset data
- ✅ Styling matches existing child asset PDFs

**Critical Implementation Notes:**
- Reuse existing `fetchParentPMTasks()` API function
- Parse `critical_spare_parts` JSON field from parent asset
- Use existing `COLORS` scheme from `pdfExport.js`  
- Follow same error handling patterns as child exports