from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
from datetime import datetime
import logging
import os
from typing import Optional

router = APIRouter()
logger = logging.getLogger("main")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class PMPlanInput(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: str  # Operating hours
    frequency: str
    criticality: str
    additional_context: str  # Any special notes or focus points for the plan
    parent_asset: Optional[str] = None  # Parent asset name
    child_asset: Optional[str] = None   # Child asset name
    site_location: Optional[str] = None  # e.g., "Dallas Plant, Line 3"
    environment: Optional[str] = None    # e.g., "High humidity, corrosive, outdoor, Class I Div 2"

def generate_prompt(data: PMPlanInput) -> str:
    today = datetime.utcnow().date().isoformat()
    return f"""
You are an expert in preventive maintenance (PM) for industrial assets. Generate a detailed preventive maintenance plan for the following asset.

Parent/Child Hierarchy & Universal Context (applies to all tasks unless overridden):

* Parent Asset: {data.parent_asset if data.parent_asset else "Not provided"}
* Child Asset: {data.child_asset if data.child_asset else "Not provided"}
* Site Location: {data.site_location if data.site_location else "Not provided"}
* Environment: {data.environment if data.environment else "Not provided"}
* Operating Hours: {data.hours}
* PM Frequency: {data.frequency}
* Criticality: {data.criticality}
* Additional Context: {data.additional_context}
* Plan Start Date: {today}

**Deduplication & Inheritance Rules (IMPORTANT):**

* Treat Site Location, Environment, Operating Hours, and Criticality as **universal** for this plan and **inherited by the child asset**. Do **not** repeat these in every field; only call out **deviations or overrides** at the task level.
* Avoid redundant phrasing across tasks. Keep fields concise and only include details unique to the task.
* If any universal field is unknown, proceed using best practices and state assumptions in the relevant task's "comments".

**Instructions:**

1. Organize tasks into the following standard frequency groups:

   * Daily
   * Weekly
   * Monthly
   * Quarterly
   * Yearly

2. For each task, provide **all** of the following fields. If a field is not applicable, explicitly return a value like "Not applicable". Do not omit fields. If a user has not provided enough input for a given field, reference the manufacturer's manual or reliable standards to determine an appropriate recommendation. If a manual is uploaded or accessible, reference it directly alongside any additional industry knowledge:

   * "parent_asset": The parent asset this task belongs to (inherit from universal context).
   * "child_asset": The specific child asset this task applies to (inherit from universal context).
   * "task_name": A clear, specific name for the maintenance task.
   * "maintenance_interval": One of the standard frequencies listed above.
   * "instructions": An array of clear, step-by-step instructions.
   * "reason": A short explanation of why this task is necessary.
   * "engineering_rationale": A technical explanation that references universal context **only when it changes or is directly relevant**. Explicitly call out when the task addresses something from the additional context: "{data.additional_context}".
   * "safety_precautions": Important safety measures or PPE required.
   * "common_failures_prevented": Typical failures this task helps avoid. Highlight known failure modes and grease points or wear-prone areas where relevant.
   * "usage_insights": Insights related to {data.hours}. Do **not** reference usage cycles.
   * "scheduled_dates": Array of dates for the next 12 months starting from {today}, based on task frequency.
   * "tools_needed": List of tools required to complete the task.
   * "number_of_technicians": How many technicians are typically needed.
   * "estimated_time_minutes": Estimated time in minutes to complete this task. This field must be included for every task.
   * "consumables": Supplies or parts that will be consumed in this task (single-use or limited-use). Be specific about **top recommendations** (brands, grades, part numbers). If not applicable, state "Not applicable".
   * "comments": Any additional notes, edge cases, or **explicit overrides** to the universal context (e.g., a task that must be done indoors despite an outdoor environment). If nothing to add, return "None".
   * "citations": Cite reliable sources—preferably the manufacturer’s manual. If not available, use credible standards (ISO, ASTM, API) or supplier data (e.g., SKF, Mobil, Shell).
   * "inherits_parent_context": true/false indicating whether the task fully inherits the parent/child universal context.
   * "context_overrides": Object with only the fields that deviate from the universal context (e.g., {"environment": "Clean room"}). Use an empty object if none.

3. You must address all input provided in the "additional_context". If specific tasks are generated as a result, make that connection clear in "engineering_rationale" or "comments".

4. Prioritize information from the manufacturer’s manual. If not available, rely on best practices from industry standards and reputable sources.

**Output Format:**
Return a single valid JSON object structured like:
{{ "maintenance_plan": [ {{task1}}, {{task2}}, ... ] }}

⚠️ **IMPORTANT:** Return only the raw JSON object. Do not include markdown formatting, commentary, or extra text.
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
            timeout=40
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
