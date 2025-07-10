from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import google.generativeai as genai
from datetime import datetime
import logging
import os
from typing import Optional
import sys
sys.path.append('..')
from file_processor import file_processor

router = APIRouter()
logger = logging.getLogger("main")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class PMPlanInput(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: str
    frequency: str
    criticality: str
    notes: str

def generate_prompt(data: PMPlanInput) -> str:
    today = datetime.utcnow().date().isoformat()
    return f"""
Generate a comprehensive preventive maintenance (PM) plan for the following asset:

- Name: {data.name}
- Model: {data.model}
- Serial: {data.serial}
- Category: {data.category}
- Usage Hours: {data.hours}
- PM Frequency: {data.frequency}
- Criticality: {data.criticality}
- Notes: {data.notes}
- Plan Start Date: {today}

**Instructions:**

1. Organize maintenance tasks by standard frequency buckets:  
   - Daily  
   - Weekly  
   - Monthly  
   - Quarterly  
   - Yearly

2. For each task, include:
   - "task_name"
   - "maintenance_interval" (e.g. 'weekly', 'monthly')
   - "instructions" (as an array of clear step-by-step strings)
   - "reason" (why the task is needed)
   - "engineering_rationale" (based on usage, criticality, category)
   - "safety_precautions"
   - "common_failures_prevented"
   - "usage_insights" (relating to {data.hours} usage)
   - "scheduled_dates" (array of dates over next 12 months, based on interval and today’s date)
   - "recommended_materials" (specify any oil, lubricant, grease, etc., including type/grade if possible)
   - "citations" (reliable sources; ideally the manufacturer’s manual or credible standards)

3. If the manufacturer's manual is available, base the recommendations on it. If not, cite best practices and standards from credible industry sources.

4. Return a single valid JSON object with a key `"maintenance_plan"` whose value is an array of tasks (objects).

**IMPORTANT:** Return only the JSON output. No markdown, text explanation, or commentary.
"""

@router.post("/api/generate-ai-plan")
async def generate_ai_plan(input: PMPlanInput, request: Request):
    logger.info(f"🚀 Received AI plan request: {input.name}")
    prompt = generate_prompt(input)

    try:
        model = genai.GenerativeModel('gemini-pro')
        full_prompt = "You are an expert in preventive maintenance planning.\n\n" + prompt
        response = model.generate_content(full_prompt)
        ai_output = response.text
        logger.info("✅ AI plan generated successfully")
        return {"plan": ai_output}
    except Exception as e:
        logger.error(f"❌ Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Gemini API error.")
