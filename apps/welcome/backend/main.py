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
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from PIL import Image
import PyPDF2
from docx import Document
from file_processor import file_processor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="PM Planning AI API", version="1.0.0")

# Environment-based CORS configuration
cors_origins_env = os.getenv("CORS_ORIGIN", "http://localhost:3000")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]

logger.info(f"🌐 CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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

# Pydantic models
class UserManual(BaseModel):
    filePath: str
    fileName: str
    originalName: str
    fileSize: int
    fileType: str
    uploadedAt: str

class PlanData(BaseModel):
    name: str
    model: Optional[str] = None
    serial: Optional[str] = None
    category: str
    hours: Optional[str] = "0"
    cycles: Optional[str] = "0"
    environment: Optional[str] = None
    date_of_plan_start: Optional[str] = None
    userManual: Optional[UserManual] = None

class GenerateAIPlanRequest(BaseModel):
    planData: PlanData

class HealthResponse(BaseModel):
    status: str
    message: str

class AIPlanResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]

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

# Main PM generation route
@app.post("/api/generate-ai-plan", response_model=AIPlanResponse)
async def generate_ai_plan(request: GenerateAIPlanRequest):
    try:
        plan_data = request.planData
        logger.info(f"🚀 Received AI plan request: {plan_data.name}")
        
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

        # Add asset metadata to each task
        for task in parsed_plan:
            task["asset_name"] = plan_data.name
            task["asset_model"] = plan_data.model

        logger.info(f"✅ Final plan parsed with {len(parsed_plan)} tasks")

        return AIPlanResponse(success=True, data=parsed_plan)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error("❌ Error generating AI plan:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal error during plan generation")

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
