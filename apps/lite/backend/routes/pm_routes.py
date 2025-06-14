import os
import json
from datetime import datetime, date
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI       # v1.x client

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AssetData(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: int
    cycles: int
    environment: str
    date_of_plan_start: Optional[date] = None
    email: Optional[str] = None
    company: Optional[str] = None

def clean_json(raw: str) -> str:
    if raw.startswith("```") and raw.endswith("```"):
        return raw.strip("`").strip()
    return raw

@router.post("/generate_pm_plan")
def generate_pm_plan(data: AssetData):
    # Determine start date
    plan_start = (
        data.date_of_plan_start.isoformat()
        if data.date_of_plan_start
        else datetime.utcnow().date().isoformat()
    )

    # Full prompt
    prompt = f"""
    Generate a detailed preventive maintenance (PM) plan for the following asset:

    - Asset Name: {data.name}
    - Model: {data.model}
    - Serial Number: {data.serial}
    - Asset Category: {data.category}
    - Usage Hours: {data.hours} hours
    - Usage Cycles: {data.cycles} cycles
    - Environmental Conditions: {data.environment}
    - Date of Plan Start: {plan_start}

    Use the manufacturer's user manual to determine recommended maintenance tasks and intervals. If the manual is not available, infer recommendations from best practices for similar assets in the same category. Be as detailed as possible in the instructions.

    **Usage Insights**  
    - Provide a concise write-up (in a field named `"usage_insights"`) that analyzes this asset’s current usage profile ({data.hours} hours and {data.cycles} cycles), noting the typical outages or failure modes that occur at this stage in the asset’s life.

    For each PM task:
    1. Clearly describe the task.
    2. Provide step-by-step instructions.
    3. Include safety precautions.
    4. Note any relevant government regulations or compliance checks.
    5. Highlight common failure points this task is designed to prevent.
    6. Tailor instructions based on usage data and environmental conditions.
    7. Include an `"engineering_rationale"` field explaining why this task and interval were selected.
    8. Based on the plan start date, return a list of future dates when this task should be performed over the next 12 months.
    9. In each task object, include the `"usage_insights"` field (you may repeat or summarize key points if needed).

    **IMPORTANT:** Return only a valid JSON object with no markdown or explanation. The JSON must have a key `"maintenance_plan"` whose value is an array of objects. Each object must include:
    - `"task_name"` (string)
    - `"maintenance_interval"` (string)
    - `"instructions"` (array of strings)
    - `"reason"` (string)
    - `"engineering_rationale"` (string)
    - `"safety_precautions"` (string)
    - `"common_failures_prevented"` (string)
    - `"usage_insights"` (string)
    - `"scheduled_dates"` (array of strings in YYYY-MM-DD format)
    """


    try:
        # Call new v1.x client
        ai_resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert in preventive maintenance planning."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.7,
            max_tokens=1500,
        )

        raw = ai_resp.choices[0].message.content
        clean = clean_json(raw)
        parsed = json.loads(clean)
        plan = parsed.get("maintenance_plan", [])
        return {"data": {"maintenance_plan": plan}}

    except Exception as e:
        return {"status": "error", "message": str(e)}
