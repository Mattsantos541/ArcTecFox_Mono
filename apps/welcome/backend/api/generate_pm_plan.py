from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
from datetime import datetime
import logging
import os

router = APIRouter()
logger = logging.getLogger("main")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
Generate a detailed preventive maintenance (PM) plan for the following asset:

- Name: {data.name}
- Model: {data.model}
- Serial: {data.serial}
- Category: {data.category}
- Usage Hours: {data.hours}
- PM Frequency: {data.frequency}
- Criticality: {data.criticality}
- Notes: {data.notes}
- Plan Start Date: {today}

Use the manufacturer’s user manual as the primary source for determining recommended maintenance tasks and intervals. If the manual is unavailable, cite best practices and credible sources (e.g., ISO standards, industry handbooks, or manufacturer websites) that justify your recommendations.

**Include a field called `usage_insights`** that evaluates the asset’s current usage and expected failure modes at this stage based on {data.hours} usage hours.

For each task in the PM plan:
1. Include a task name and interval.
2. Write step-by-step instructions.
3. Include safety precautions.
4. Describe common failures the task helps prevent.
5. Include a rationale for the task and interval.
6. List scheduled maintenance dates over the next 12 months.
7. Provide citations or references for your rationale.

**IMPORTANT:** Return only a valid JSON object with no markdown. The root object must contain `"maintenance_plan"` (array of objects). Each task must include:
- "task_name"
- "maintenance_interval"
- "instructions" (array of strings)
- "reason"
- "engineering_rationale"
- "safety_precautions"
- "common_failures_prevented"
- "usage_insights"
- "scheduled_dates" (array of YYYY-MM-DD strings)
- "citations" (array of strings)
"""

@router.post("/api/generate-ai-plan")
async def generate_ai_plan(input: PMPlanInput, request: Request):
    logger.info(f"🚀 Received AI plan request: {input.name}")
    prompt = generate_prompt(input)

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in preventive maintenance planning."},
                {"role": "user", "content": prompt}
            ],
            timeout=20
        )
        ai_output = response.choices[0].message.content
        logger.info("✅ AI plan generated successfully")
        return {"plan": ai_output}
    except APIConnectionError as e:
        logger.error(f"🔌 OpenAI connection error: {e}")
        raise HTTPException(status_code=502, detail="OpenAI connection failed.")
    except OpenAIError as e:
        logger.error(f"🧠 OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI API error.")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error.")
