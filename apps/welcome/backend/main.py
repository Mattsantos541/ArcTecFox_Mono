# apps/welcome/backend/main.py - Production ready with environment-based CORS
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import io
import tempfile
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field, validator
from supabase import create_client, Client
# Import our new auth module
from auth import (
    verify_supabase_token, 
    AuthenticatedUser, 
    get_user_supabase_client,
    verify_site_access,
    require_admin_role
)
from database import get_user_supabase_client as db_get_user_client, get_service_supabase_client
# Rate limiting imports (optional - graceful fallback if not available)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    RATE_LIMITING_AVAILABLE = False
    logger.warning("⚠️ slowapi not available - rate limiting disabled")
from PIL import Image
import PyPDF2
from docx import Document
from file_processor import file_processor
from pdf_export import (
    export_maintenance_task_to_pdf,
    export_pm_plans_data_to_pdf,
    export_assets_data_to_pdf,
    export_detailed_pm_plans_to_pdf
)
from api.suggest_child_assets import router as child_assets_router
from api.send_invitation import InvitationRequest, send_invitation_email
from api.send_test_invitation import TestInvitationRequest, send_test_invitation_email

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting setup - user-based rate limiting
if RATE_LIMITING_AVAILABLE:
    def get_user_id_for_rate_limit(request: Request) -> str:
        """Extract user ID from request for rate limiting. Falls back to IP if no user."""
        try:
            # Try to get user ID from Authorization header or session
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                # In a real implementation, you'd decode the JWT to get user ID
                # For now, we'll use IP address as fallback
                return get_remote_address(request)
            
            # Fallback to IP address
            return get_remote_address(request)
        except:
            return get_remote_address(request)

    # Initialize rate limiter
    limiter = Limiter(key_func=get_user_id_for_rate_limit)
else:
    limiter = None

# Initialize FastAPI app
app = FastAPI(title="PM Planning AI API", version="1.0.0")

# Add rate limiter to app (only if available)
if RATE_LIMITING_AVAILABLE and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(child_assets_router, prefix="/api", tags=["child-assets"])

# Environment-based CORS configuration with smart pattern matching
cors_origins_env = os.getenv("CORS_ORIGIN", "https://arctecfox-mono.vercel.app")
cors_origins_list = [origin.strip() for origin in cors_origins_env.split(",")]

def cors_allow_origin(origin: str) -> bool:
    """Smart CORS origin matching with pattern support"""
    if not origin:
        return False
    
    for allowed_origin in cors_origins_list:
        # Exact match
        if origin == allowed_origin:
            return True
        # Pattern matching for development environments
        if allowed_origin == "*":
            return True
        # GitHub Codespaces pattern
        if "*.app.github.dev" in allowed_origin and origin.endswith(".app.github.dev"):
            return True
        # Local development
        if allowed_origin == "http://localhost:*" and origin.startswith("http://localhost:"):
            return True
            
    return False

# Use dynamic origin validation for flexibility
logger.info(f"🌐 CORS origins configured: {cors_origins_list}")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.app\.github\.dev|http://localhost:\d+|https://yourdomain\.com|https://arctecfox-mono\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize Gemini client
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY must be set")

genai.configure(api_key=gemini_api_key)
logger.info(f"🔑 Gemini key loaded: {'Yes' if gemini_api_key else 'No'}")

# Initialize Supabase client for file access
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
if not supabase_url or not supabase_key:
    logger.warning("⚠️ Supabase credentials not found - file processing will be disabled")
    supabase_client = None
else:
    supabase_client: Client = create_client(supabase_url, supabase_key)
    logger.info("🔗 Supabase client initialized for file processing")

# Validation utilities
def validate_safe_path(path: str) -> str:
    """Validate file path to prevent directory traversal attacks"""
    if not path:
        raise ValueError("Path cannot be empty")
    
    # Check for directory traversal patterns
    dangerous_patterns = ['../', '..\\', '..', '~/', '/etc/', '/root/', '/home/']
    path_lower = path.lower()
    
    for pattern in dangerous_patterns:
        if pattern in path_lower:
            raise ValueError(f"Invalid path: contains dangerous pattern '{pattern}'")
    
    # Ensure path doesn't start with absolute path indicators
    if path.startswith(('/', '\\', '~')):
        raise ValueError("Path must be relative (cannot start with /, \\, or ~)")
    
    return path

# Pydantic models with validation
class UserManual(BaseModel):
    filePath: str = Field(..., max_length=500, description="File storage path")
    fileName: str = Field(..., max_length=255, description="File name")
    originalName: str = Field(..., max_length=255, description="Original file name")
    fileSize: int = Field(..., ge=0, le=30*1024*1024, description="File size in bytes (max 30MB)")
    fileType: str = Field(..., max_length=100, description="File MIME type")
    uploadedAt: str = Field(..., max_length=50, description="Upload timestamp")
    
    @validator('filePath')
    def validate_file_path(cls, v):
        return validate_safe_path(v)
    
    @validator('fileName', 'originalName')
    def validate_file_names(cls, v):
        if not v:
            raise ValueError("File name cannot be empty")
        # Check for dangerous characters in filenames
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in dangerous_chars:
            if char in v:
                raise ValueError(f"File name contains invalid character: '{char}'")
        return v

class PlanData(BaseModel):
    name: str = Field(..., max_length=255, min_length=1, description="Asset name")
    model: Optional[str] = Field(None, max_length=255, description="Asset model")
    serial: Optional[str] = Field(None, max_length=255, description="Serial number")
    category: str = Field(..., max_length=255, min_length=1, description="Asset category")
    hours: Optional[str] = Field("0", max_length=20, description="Operating hours")
    cycles: Optional[str] = Field("0", max_length=20, description="Operating cycles")
    environment: Optional[str] = Field(None, max_length=500, description="Environmental conditions")
    date_of_plan_start: Optional[str] = Field(None, max_length=20, description="Plan start date")
    userManual: Optional[UserManual] = None

class GenerateAIPlanRequest(BaseModel):
    planData: PlanData

class HealthResponse(BaseModel):
    status: str
    message: str

class AIPlanResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]

class PDFExportRequest(BaseModel):
    data: List[Dict[str, Any]]
    filename: Optional[str] = None
    export_type: str  # "maintenance_task", "pm_plans", "assets", "detailed_pm_plans"

# Health check route
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="OK", message="FastAPI AI Backend is running")

# Debug route to check CORS configuration
@app.get("/api/debug-cors")
async def debug_cors(request: Request):
    origin = request.headers.get("origin", "No origin header")
    
    return {
        "configured_origins": cors_origins,
        "request_origin": origin,
        "origin_allowed": origin in cors_origins if origin != "No origin header" else "N/A (direct access)",
        "cors_env_var": os.getenv("CORS_ORIGIN", "Not set"),
        "user_agent": request.headers.get("user-agent", "No user-agent")
    }

# Main PM generation route with authentication and rate limiting
@app.post("/api/generate-ai-plan", response_model=AIPlanResponse)
async def generate_ai_plan(
    request: Request, 
    plan_request: GenerateAIPlanRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    try:
        plan_data = plan_request.planData
        logger.info(f"🚀 User {user.email} requesting AI plan for: {plan_data.name}")
        
        # Optional: If the plan request includes a site_id, verify access
        # This would be added when you want to tie PM plans to specific sites
        # if hasattr(plan_data, 'site_id') and plan_data.site_id:
        #     from auth import verify_site_access
        #     await verify_site_access(plan_data.site_id, user)
        
        if not plan_data.name or not plan_data.category:
            raise HTTPException(status_code=400, detail="Missing required fields: name and category")

        # Extract file content if user manual is provided
        user_manual_content = ""
        if plan_data.userManual:
            logger.info(f"📄 Processing user manual: {plan_data.userManual.fileName}")
            user_manual_content = await file_processor.extract_text_from_file(
                plan_data.userManual.filePath, 
                plan_data.userManual.fileType
            )
            if user_manual_content:
                logger.info(f"✅ Successfully extracted {len(user_manual_content)} characters from user manual")
            else:
                logger.warning("⚠️ Failed to extract content from user manual")

        prompt = f"""
Generate a detailed preventive maintenance (PM) plan for the following asset:

- Asset Name: {plan_data.name}
- Model: {plan_data.model}
- Serial Number: {plan_data.serial}
- Asset Category: {plan_data.category}
- Usage Hours: {plan_data.hours or 0} hours
- Usage Cycles: {plan_data.cycles or 0} cycles
- Environmental Conditions: {plan_data.environment}
- Date of Plan Start: {plan_data.date_of_plan_start or datetime.now().strftime('%Y-%m-%d')}

{f'''
**USER MANUAL CONTENT:**
The following is the extracted content from the uploaded user manual for this asset:

{user_manual_content}

**END OF USER MANUAL CONTENT**

Use the information from the user manual above to determine recommended maintenance tasks and intervals. If specific maintenance procedures are mentioned in the manual, follow those recommendations. If the manual is not available or doesn't contain specific maintenance information, infer recommendations from best practices for similar assets in the same category.
''' if user_manual_content else '''
Use the manufacturer's user manual to determine recommended maintenance tasks and intervals. If the manual is not available, infer recommendations from best practices for similar assets in the same category.
'''}

Be as detailed as possible in the instructions and reference the user manual content when applicable.

**Usage Insights**  
- Provide a concise write-up (in a field named "usage_insights") that analyzes this asset's current usage profile ({plan_data.hours or 0} hours and {plan_data.cycles or 0} cycles), noting the typical outages or failure modes that occur at this stage in the asset's life.

For each PM task:
1. Clearly describe the task.
2. Provide step-by-step instructions.
3. Include safety precautions.
4. Note any relevant government regulations or compliance checks.
5. Highlight common failure points this task is designed to prevent.
6. Tailor instructions based on usage data and environmental conditions.
7. Include an "engineering_rationale" field explaining why this task and interval were selected.
8. Based on the plan start date, return a list of future dates when this task should be performed over the next 12 months.
9. In each task object, include the "usage_insights" field (you may repeat or summarize key points if needed).
10. ALWAYS include "time_to_complete" - estimate how long this task takes (e.g., "2 hours", "45 minutes").
11. ALWAYS include "tools_needed" - list all tools, equipment, and supplies required.
12. ALWAYS include "number_of_technicians" - specify how many people are needed (integer).
13. ALWAYS include "consumables" - list all consumables and supplies needed for this specific task (grease, oil, filters, gaskets, etc.).

**IMPORTANT:** Return only a valid JSON object with no markdown or explanation. The JSON must have a key "maintenance_plan" whose value is an array of objects. Each object must include:
- "task_name" (string)
- "maintenance_interval" (string)
- "instructions" (array of strings)
- "reason" (string)
- "engineering_rationale" (string)
- "safety_precautions" (string)
- "common_failures_prevented" (string)
- "usage_insights" (string)
- "scheduled_dates" (array of strings in YYYY-MM-DD format)
- "time_to_complete" (string, e.g., "2 hours", "30 minutes")
- "tools_needed" (string, list of tools/equipment needed)
- "number_of_technicians" (integer, number of technicians required)
- "consumables" (string, list of consumables and supplies needed for this task)
"""

        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            full_prompt = "You are an expert in preventive maintenance planning. Always return pure JSON without any markdown formatting.\n\n" + prompt
            response = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=8192,
                )
            )
        except Exception as ge:
            logger.error(f"🧠 Gemini API error: {ge}")
            raise HTTPException(status_code=502, detail="Gemini API error")

        raw_content = response.text
        logger.info("🧠 AI response received from Gemini")

        # Clean the response
        raw_content = raw_content.replace("```json", "").replace("```", "").strip()

        try:
            parsed_response = json.loads(raw_content)
            parsed_plan = parsed_response.get("maintenance_plan", [])
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error: {e}")
            logger.error(f"Raw content: {raw_content[:200]}...")
            raise HTTPException(status_code=500, detail="AI returned invalid JSON format")

        # Debug: Log the full first task to see what Gemini returned
        if parsed_plan:
            logger.info(f"🔍 FIRST TASK DEBUG: {json.dumps(parsed_plan[0], indent=2)}")

        # Add asset metadata to each task
        for task in parsed_plan:
            task["asset_name"] = plan_data.name
            task["asset_model"] = plan_data.model

        logger.info(f"✅ Final plan parsed with {len(parsed_plan)} tasks")
        
        # Log critical info for debugging
        if parsed_plan:
            first_task = parsed_plan[0]
            has_time = 'time_to_complete' in first_task
            has_tools = 'tools_needed' in first_task  
            has_techs = 'number_of_technicians' in first_task
            logger.info(f"🔍 DEBUG: time_to_complete={has_time}, tools_needed={has_tools}, number_of_technicians={has_techs}")

        return AIPlanResponse(success=True, data=parsed_plan)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error("❌ Error generating AI plan:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal error during plan generation")

# PDF Export endpoint with authentication
@app.post("/api/export-pdf")
async def export_pdf(
    request: PDFExportRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    try:
        logger.info(f"🖨️ User {user.email} requesting PDF export: type={request.export_type}, data_count={len(request.data)}")
        
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided for export")
        
        # Generate filename if not provided
        if not request.filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            request.filename = f"{request.export_type}_export_{timestamp}.pdf"
        
        # Ensure filename ends with .pdf
        if not request.filename.endswith('.pdf'):
            request.filename += '.pdf'
        
        # Call appropriate export function based on type
        output_path = None
        if request.export_type == "maintenance_task":
            if len(request.data) == 1:
                output_path = export_maintenance_task_to_pdf(request.data[0])
            else:
                raise HTTPException(status_code=400, detail="Maintenance task export requires exactly one task")
        elif request.export_type == "pm_plans":
            output_path = export_pm_plans_data_to_pdf(request.data)
        elif request.export_type == "assets":
            output_path = export_assets_data_to_pdf(request.data)
        elif request.export_type == "detailed_pm_plans":
            output_path = export_detailed_pm_plans_to_pdf(request.data)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown export type: {request.export_type}")
        
        # Verify file was created
        if not output_path or not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="PDF generation failed")
        
        logger.info(f"✅ PDF generated successfully: {output_path}")
        
        # Return the file as a download
        return FileResponse(
            path=output_path,
            filename=request.filename,
            media_type='application/pdf',
            headers={"Content-Disposition": f"attachment; filename={request.filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error("❌ Error generating PDF:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error during PDF generation: {str(e)}")

# Send invitation endpoint - requires authentication
@app.post("/api/send-invitation")
async def send_invitation_endpoint(
    request: InvitationRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """Send invitation email to user - requires authenticated user"""
    logger.info(f"User {user.email} sending invitation to {request.email}")
    # Note: send_invitation_email uses service client internally to read site/company data
    # This is acceptable as it needs to access data across sites for email generation
    return await send_invitation_email(request)

# Send test invitation endpoint - requires authentication  
@app.post("/api/send-test-invitation")
async def send_test_invitation_endpoint(
    request: TestInvitationRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """Send test invitation email without any database operations - requires authenticated user"""
    logger.info(f"User {user.email} sending test invitation")
    return await send_test_invitation_email(request)

# Example: Admin-only endpoint for system status
@app.get("/api/admin/system-status")
async def get_system_status(
    user: AuthenticatedUser = Depends(require_admin_role)
):
    """
    Get system status - requires admin role.
    This is an example of protecting admin-only endpoints.
    """
    logger.info(f"Admin {user.email} checking system status")
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "admin_user": user.email,
        "services": {
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
            "supabase": bool(os.getenv("SUPABASE_URL")),
            "resend": bool(os.getenv("RESEND_API_KEY"))
        }
    }

# Debug Gemini connection
@app.get("/api/debug-gemini")
async def debug_gemini():
    try:
        models = genai.list_models()
        model_names = [m.name for m in models][:5]  # Just first 5 for brevity
        return JSONResponse(status_code=200, content={
            "success": True, 
            "models_sample": model_names,
            "api_key_set": bool(os.getenv("GEMINI_API_KEY"))
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False, 
            "error": str(e),
            "api_key_set": bool(os.getenv("GEMINI_API_KEY"))
        })

# Dev runner
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
