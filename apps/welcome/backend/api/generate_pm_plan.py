# generate_pm_plan.py

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
from datetime import datetime
import logging
import os
import json
from typing import Optional, Any, Dict

router = APIRouter()
logger = logging.getLogger("main")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ============
# Input model
# ============
class PMPlanInput(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: str            # Operating hours (e.g., "24/7")
    frequency: str
    criticality: str
    additional_context: str  # Any special notes or focus points for the plan
    parent_asset: Optional[str] = None   # Parent asset name
    child_asset: Optional[str] = None    # Child asset name
    site_location: Optional[str] = None  # e.g., "Dallas Plant, Line 3"
    environment: Optional[str] = None    # e.g., "High humidity, corrosive, outdoor, Class I Div 2"


# =================
# Prompt generator
# =================
def generate_prompt(data: PMPlanInput) -> str:
    today = datetime.utcnow().date().isoformat()
    return f"""
Using the attached Maintenance User Manual for the [Equipment Name, Model XYZ], develop a detailed Preventive Maintenance plan for the specified **child asset**.

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
* Treat Site Location, Environment, Operating Hours, and Criticality as **universal** context. Do **not** repeat them in every field; only call out **deviations or overrides** at the task level.
* Avoid redundant phrasing across tasks. Keep fields concise and only include details unique to the task.
* If any universal field is unknown, proceed using best practices and state assumptions in the task "comments".

**Manual & Sources Policy (MANDATORY):**
* If a **manufacturer’s manual or manual content** has been uploaded/provided to the system, treat it as **primary**. **Extract and include exact instructions, intervals, lubrication requirements, specifications, materials (brands/grades), and part numbers** from the manual where relevant, and **cite the exact section/page** in "citations".
* If **no manual content** is available, provide **concrete, authoritative** recommendations using recognized **standards** (ISO/ASTM/API) or reputable **supplier documentation** (e.g., SKF, Mobil, Shell), and cite those sources.
* ⚠️ **Do NOT** write “refer to the manual” or similar placeholders. Always include the actual recommended values/steps/materials (from the provided manual or from standards/suppliers).
* **Verification & Deviations:** Verify each task against the manual. If you recommend a deviation (e.g., due to {data.environment} or {data.hours}), clearly state the deviation and justify it in "engineering_rationale", citing a standard/supplier source.

**Scope Notes (Child Asset):**
* Include lubrication/grease tasks and **identify grease points/zones** when the manual specifies them; cite the exact product/type and quantity where available.
* **Do not force cleaning or visual inspection tasks**. Only include them if they are **explicitly prescribed in the manual** or are justified by credible standards/supplier guidance (with citations).

**Instructions:**
1. Organize tasks for readability into groups such as Daily, Weekly, Monthly, Quarterly, Yearly — **but output frequency only as a numeric `maintenance_interval` in months**:
   - Daily ≈ 0.033, Weekly ≈ 0.25, Biweekly ≈ 0.5, Monthly = 1, Quarterly = 3, Yearly = 12
   Use fractional months as needed. **Do not output any calendar dates.**

2. For **every task**, provide **all** of the following fields. If a field is not applicable, explicitly return "Not applicable". Apply the **Manual & Sources Policy** above:
   * "parent_asset": Inherit from universal context.
   * "child_asset": Inherit from universal context.
   * "task_name": Clear, specific name for the maintenance task.
   * "maintenance_interval": **Months only** (numeric, e.g., 0.25, 1, 3, 12). This **replaces any per-date scheduling**.
   * "instructions": Array of step-by-step instructions (**use exact manual steps** when available; otherwise standards/suppliers).
   * "reason": Why this task is necessary.
   * "engineering_rationale": Technical rationale referencing universal context **only when directly relevant**. Explicitly state how this addresses "{data.additional_context}" when applicable, and **note any deviations from the manual with justification**.
   * "safety_precautions": PPE and hazards.
   * "common_failures_prevented": Typical failures this task helps avoid; **highlight grease points/wear-prone areas** where relevant.
   * "usage_insights": Insights related to {data.hours}. Do **not** reference usage cycles.
   * "tools_needed": Tools required for the task.
   * "number_of_technicians": Typical headcount.
   * "estimated_time_minutes": Numeric estimate in minutes for the task (required).
   * "consumables": Supplies/parts consumed by this task. Provide **specific brands/grades/part numbers** (from manual when available; otherwise standards/suppliers). If not applicable, use "Not applicable".
   * "risk_assessment": Likely risks and possible failures **before the next interval** specific to this task/component.
   * "criticality_rating": "High" | "Medium" | "Low" for the task’s priority.
   * "comments": Notes, assumptions, or **explicit overrides** to the universal context; "None" if nothing to add.
   * "citations": If manual content exists, cite **exact manual section/page**. Otherwise cite the specific standard/supplier source used.
   * "inherits_parent_context": true/false (does the task fully inherit universal context?).
   * "context_overrides": Object containing only deviations from the universal context (e.g., {{"environment": "Clean room"}}). Use an empty object if none.

3. **Do not output any per-task scheduled dates.** Replace any scheduling with numeric "maintenance_interval" in months.

4. You must address the "additional_context" input. If it causes tasks to be generated or modified, **make that connection explicit** in "engineering_rationale" or "comments".

**Output Format:** Return a single valid JSON object:
{{ "maintenance_plan": [ {{task1}}, {{task2}}, ... ] }}

⚠️ **IMPORTANT:** Return only the raw JSON object. Do not include markdown formatting, commentary, or extra text.
"""


# =====================
# Validation utilities
# =====================
def _is_number(value: Any) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _validate_plan_structure(plan_json: Dict[str, Any]) -> None:
    """
    Validate required structure and fields for the AI output.
    Raises HTTPException(422) with details on failure.
    """
    if not isinstance(plan_json, dict) or "maintenance_plan" not in plan_json:
        raise HTTPException(status_code=422, detail="Output must be a JSON object with key 'maintenance_plan'.")

    tasks = plan_json.get("maintenance_plan")
    if not isinstance(tasks, list) or len(tasks) == 0:
        raise HTTPException(status_code=422, detail="'maintenance_plan' must be a non-empty array of task objects.")

    errors = []
    for idx, task in enumerate(tasks):
        path = f"maintenance_plan[{idx}]"
        if not isinstance(task, dict):
            errors.append(f"{path} is not an object")
            continue

        # Required keys presence (even if 'Not applicable')
        required_keys = [
            "parent_asset", "child_asset", "task_name", "maintenance_interval", "instructions",
            "reason", "engineering_rationale", "safety_precautions", "common_failures_prevented",
            "usage_insights", "tools_needed", "number_of_technicians", "estimated_time_minutes",
            "consumables", "risk_assessment", "criticality_rating", "comments", "citations",
            "inherits_parent_context", "context_overrides"
        ]
        for key in required_keys:
            if key not in task:
                errors.append(f"{path}.{key} is missing")

        # Numeric validations
        if "maintenance_interval" in task and not _is_number(task.get("maintenance_interval")):
            errors.append(f"{path}.maintenance_interval must be numeric (months)")
        if "estimated_time_minutes" in task and not _is_number(task.get("estimated_time_minutes")):
            errors.append(f"{path}.estimated_time_minutes must be numeric (minutes)")

        # Enum validation for criticality_rating
        if "criticality_rating" in task:
            val = task.get("criticality_rating")
            if not isinstance(val, str) or val.strip().title() not in {"High", "Medium", "Low"}:
                errors.append(f"{path}.criticality_rating must be one of High, Medium, Low")

        # Type expectations
        if "inherits_parent_context" in task and not isinstance(task.get("inherits_parent_context"), bool):
            errors.append(f"{path}.inherits_parent_context must be boolean")
        if "context_overrides" in task and not isinstance(task.get("context_overrides"), dict):
            errors.append(f"{path}.context_overrides must be an object (dict)")

        # Ensure deprecated field not present
        if "scheduled_dates" in task:
            errors.append(f"{path}.scheduled_dates must NOT be included; use maintenance_interval in months instead")

    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})


# ==========
# Endpoint
# ==========
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

        # Parse & validate
        try:
            plan_json = json.loads(ai_output)
        except json.JSONDecodeError:
            logger.error("AI output was not valid JSON")
            raise HTTPException(status_code=422, detail="Model did not return valid JSON.")
        _validate_plan_structure(plan_json)

        logger.info("✅ AI plan generated and validated successfully")
        # Return both raw and parsed JSON for convenience
        return {"plan": ai_output, "plan_json": plan_json}

    except APIConnectionError as e:
        logger.error(f"🔌 OpenAI connection error: {e}")
        raise HTTPException(status_code=502, detail="OpenAI connection failed.")
    except OpenAIError as e:
        logger.error(f"🧠 OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI API error.")
    except HTTPException:
        # Already structured; just re-raise
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error.")
