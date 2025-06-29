# apps/welcome/backend/main.py - Simplified version for OpenAI only
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

import openai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="PM Planning AI API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY must be set")

openai.api_key = openai_api_key

# Pydantic models
class PlanData(BaseModel):
    name: str
    model: Optional[str] = None
    serial: Optional[str] = None
    category: str
    hours: Optional[str] = "0"
    cycles: Optional[str] = "0"
    environment: Optional[str] = None
    date_of_plan_start: Optional[str] = None

class GenerateAIPlanRequest(BaseModel):
    planData: PlanData

class HealthResponse(BaseModel):
    status: str
    message: str

class AIPlanResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]

# Routes
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="OK", message="FastAPI AI Backend is running")

@app.post("/api/generate-ai-plan", response_model=AIPlanResponse)
async def generate_ai_plan(request: GenerateAIPlanRequest):
    """Generate PM plan using OpenAI only - frontend handles database operations"""
    try:
        plan_data = request.planData
        logger.info(f"🚀 Received AI plan request: {plan_data.name}")
        
        # Validate required fields
        if not plan_data.name or not plan_data.category:
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: name and category"
            )

        # Generate AI plan with OpenAI
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

Use the manufacturer's user manual to determine recommended maintenance tasks and intervals. If the manual is not available, infer recommendations from best practices for similar assets in the same category. Be as detailed as possible in the instructions.

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

        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert in preventive maintenance planning. Always return pure JSON without any markdown formatting."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        raw_content = response.choices[0].message.content
        logger.info(f"🧠 AI plan generated successfully")

        # Clean the response
        if '```json' in raw_content:
            raw_content = raw_content.replace('```json', '').replace('```', '')
        if '```' in raw_content:
            raw_content = raw_content.replace('```', '')
        raw_content = raw_content.strip()

        # Parse JSON
        try:
            parsed_response = json.loads(raw_content)
            parsed_plan = parsed_response.get('maintenance_plan', [])
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parse error: {e}")
            raise HTTPException(status_code=500, detail="AI returned invalid JSON format")

        # Add asset info to each task
        for task in parsed_plan:
            task['asset_name'] = plan_data.name
            task['asset_model'] = plan_data.model

        logger.info(f"✅ AI plan generated successfully with {len(parsed_plan)} tasks")
        
        return AIPlanResponse(
            success=True,
            data=parsed_plan
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating AI plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)