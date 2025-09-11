# full_parent_create_prompt.py

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import google.generativeai as genai
from typing import Optional
import logging
import json
import os
import sys
from datetime import date

# Add parent directory to path to import auth module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth import verify_supabase_token, AuthenticatedUser

# Optional rate limiting
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    RATE_LIMITING_AVAILABLE = False

router = APIRouter()
logger = logging.getLogger("main")

# Configure Google AI (same setup as main.py)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Rate limiter (optional)
if RATE_LIMITING_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
else:
    limiter = None


# =============================
# Pydantic Models
# =============================
class ParentPlanInput(BaseModel):
    parent_asset_name: str = Field(..., max_length=255, min_length=1, description="Parent asset name")
    parent_asset_make: Optional[str] = Field(None, max_length=255, description="Parent asset make/manufacturer")
    parent_asset_model: Optional[str] = Field(None, max_length=255, description="Parent asset model")
    parent_asset_category: Optional[str] = Field(None, max_length=255, description="Parent asset category")
    site_location: Optional[str] = Field(None, max_length=500, description="Site location")
    environment: Optional[str] = Field(None, max_length=500, description="Environmental conditions")
    additional_context: Optional[str] = Field(None, max_length=2000, description="Additional notes/context")
    user_manual_content: Optional[str] = Field(None, description="Scraped content from user manual")
    operating_hours: Optional[str] = Field(None, max_length=100, description="Operating hours")
    pm_frequency: Optional[str] = Field(None, max_length=100, description="PM frequency")
    criticality: Optional[str] = Field(None, max_length=50, description="Criticality level")


# =============================
# Parent Asset Maintenance Plan Endpoint
# =============================
@router.post("/generate-parent-plan")
async def generate_parent_plan(
    request: Request,
    input_data: ParentPlanInput,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """
    Generate AI-powered parent asset maintenance plan and critical spare parts list.
    Requires authentication.
    """
    logger.info(f"🧩 User {user.email} requesting parent plan for: {input_data.parent_asset_name}")

    # Build parent asset label
    parent_label = f"{input_data.parent_asset_name}"
    if input_data.parent_asset_make:
        parent_label += f" - {input_data.parent_asset_make}"
    if input_data.parent_asset_model:
        parent_label += f" {input_data.parent_asset_model}"

    today = date.today().isoformat()

    # Default values for optional fields – standardized to "Not applicable"
    site_location = input_data.site_location if input_data.site_location else "Not applicable"
    environment = input_data.environment if input_data.environment else "Not applicable"
    operating_hours = input_data.operating_hours if input_data.operating_hours else "Not applicable"
    pm_frequency = input_data.pm_frequency if input_data.pm_frequency else "Not applicable"
    criticality = input_data.criticality if input_data.criticality else "Medium"
    additional_context = input_data.additional_context if input_data.additional_context else "Not applicable"

    manual_section = ""
    if input_data.user_manual_content:
        manual_section = f"""

User Manual Content (for reference):
{input_data.user_manual_content}
"""

    # =============================
    # Gemini-aligned Prompt (weeks-based, few-shot, output prefix)
    # =============================
    prompt = f"""
ROLE & SCOPE
You are ArcTecFox’s Preventive Maintenance Planner. Produce a parent-asset health plan (system-level only; exclude child components) and a parent-level critical spares list.

UNIVERSAL CONTEXT (inherits unless overridden at task-level)
- Parent Asset: {parent_label}
- Child Asset: Not applicable
- Site Location: {site_location}
- Environment: {environment}
- Operating Hours: {operating_hours}
- PM Frequency: {pm_frequency}
- Criticality: {criticality}
- Additional Context: {additional_context}
- Plan Start Date: {today}
{manual_section}

POLICIES (MANDATORY)
- If User Manual Content is supplied above, treat it as the primary source. Extract concrete specs/steps/part numbers/brands and cite exact sections/pages in "citations".
- If no manual content, use recognized standards/suppliers (ISO/ASTM/API; SKF/Mobil/Shell). Cite them. Never write “refer to the manual.” Provide actual values/steps.
- Do not include calendar dates anywhere; use numeric intervals in **weeks** only.

TASK TYPE RESTRICTIONS
- Do NOT include generic “visual inspection” or “cleaning” tasks unless they are explicitly listed in the supplied manual or a cited standard/supplier recommendation.
- If no manual is provided, omit such tasks entirely.
- Focus on technical, measurable tasks (lubrication, torque, calibration, functional checks, replacements, adjustments, monitoring, safety interlocks).

DEDUPLICATION & INHERITANCE
- Treat Site Location, Environment, Operating Hours, and Criticality as universal context. Do NOT repeat them in every field; only note deviations in "context_overrides".
- Keep language concise. Avoid redundant phrasing across tasks.

DATA TYPES & UNITS
- maintenance_interval: **weeks as a number ONLY**. Mapping:
  Daily ≈ 0.143, Weekly = 1, Biweekly = 2, Monthly ≈ 4, Quarterly ≈ 13, Yearly ≈ 52. Use fractional weeks as needed.
- estimated_time_minutes, number_of_technicians, lead_time_days: integers.
- Use "Not applicable" for any field where nothing applies. Arrays must contain at least one item (e.g., ["Not applicable"]) if empty.
- Safety steps must precede any action that could expose energy. If LOTO applies, include it as the first step.

TASK NAMING CONVENTION
- task_name = "{input_data.parent_asset_name} – {{Action}} – {{System/Area}}" (no marketing fluff).

HALLUCINATION GUARDRAILS
- Never fabricate part numbers or brand-specific specs. If not known credibly, pick a conservative, widely-accepted default and record the rationale in "assumptions".
- If any universal field is unknown, proceed with best practices and add a brief assumption.

OUTPUT SECTIONS
1) "maintenance_plan": parent-oversight tasks ONLY.
   - Include at least:
     - "Parent Asset Weekly Health Check" — maintenance_interval: 1
     - "Parent Asset Monthly Health Audit" — maintenance_interval: 4
   - Add additional system-level checks when best practice applies (controls/PLC status, alarms review, utilities, safety interlocks, vibration across assemblies, housekeeping for safety compliance, corrosion survey) — but obey TASK TYPE RESTRICTIONS.
   - REQUIRED FIELDS for each task (never omit; use "Not applicable" where needed):
     "parent_asset", "child_asset", "task_name", "maintenance_interval",
     "instructions" (array of steps),
     "reason", "engineering_rationale",
     "safety_precautions" (array),
     "common_failures_prevented" (array),
     "usage_insights",
     "tools_needed" (array),
     "number_of_technicians", "estimated_time_minutes",
     "consumables" (array),
     "risk_assessment",
     "criticality_rating" ("High"|"Medium"|"Low"),
     "comments",
     "assumptions" (array),
     "citations" (array),
     "inherits_parent_context" (bool),
     "context_overrides" (object with allowed keys: site_location, environment, operating_hours, criticality; empty if none)

2) "critical_spares": for the PARENT ASSET ONLY (not child components).
   - REQUIRED FIELDS for each spare:
     "parent_asset", "child_asset",
     "part_name", "part_number", "manufacturer", "preferred_brand",
     "uom",
     "min_stock_level", "max_stock_level",
     "lead_time_days",
     "criticality" ("High"|"Medium"|"Low"),
     "failure_modes" (array),
     "associated_maintenance_interval_weeks",
     "storage_conditions",
     "citations" (array),
     "notes"
   - If manual content exists, extract exact part names/numbers/specs and cite sections/pages. Otherwise cite standards/suppliers.

FEW-SHOT EXAMPLES (ABBREVIATED)

Example task (one item):
{{
  "parent_asset": "{input_data.parent_asset_name}",
  "child_asset": "Not applicable",
  "task_name": "{input_data.parent_asset_name} – Weekly System Alarm Review – Controls",
  "maintenance_interval": 1,
  "instructions": [
    "Lock out/tag out if required by site policy before opening panels",
    "Access HMI/SCADA alarm history for prior 7 days",
    "Review active and cleared alarms; log recurring alarms",
    "Verify alarm setpoints vs. documented standards",
    "Escalate any safety-critical or repeated events"
  ],
  "reason": "Catch emerging system faults early via alarm trends",
  "engineering_rationale": "Weekly interval aligns with continuous operations and medium criticality",
  "safety_precautions": ["PPE per site policy", "LOTO if panel access is required"],
  "common_failures_prevented": ["Nuisance trips", "Hidden interlock failures"],
  "usage_insights": "Tailor review depth when operating hours exceed standard shift patterns",
  "tools_needed": ["HMI/SCADA access", "Alarm log export tool"],
  "number_of_technicians": 1,
  "estimated_time_minutes": 30,
  "consumables": ["Not applicable"],
  "risk_assessment": "Low risk when following LOTO; oversight mitigates latent control faults",
  "criticality_rating": "Medium",
  "comments": "Not applicable",
  "assumptions": ["SCADA provides 7-day alarm retention"],
  "citations": ["ISO 17359 – Condition monitoring"],
  "inherits_parent_context": true,
  "context_overrides": {{}}
}}

Example spare (one item):
{{
  "parent_asset": "{input_data.parent_asset_name}",
  "child_asset": "Not applicable",
  "part_name": "Main Control Relay",
  "part_number": "Not applicable",
  "manufacturer": "Not applicable",
  "preferred_brand": "Not applicable",
  "uom": "each",
  "min_stock_level": 1,
  "max_stock_level": 2,
  "lead_time_days": 7,
  "criticality": "High",
  "failure_modes": ["Relay coil open/short", "Contact welding"],
  "associated_maintenance_interval_weeks": "Not applicable",
  "storage_conditions": "Dry indoor storage, anti-static bag if solid-state",
  "citations": ["IEC 60947 guidance"],
  "notes": "Replace with identical coil voltage and contact rating"
}}

FINAL OUTPUT REQUIREMENTS
- Return ONE JSON object with BOTH sections and no extra text.
- Begin your output immediately with:
{{
  "maintenance_plan": [

SCHEMA REMINDER
{{
  "maintenance_plan": [ {{task1}}, {{task2}}, ... ],
  "critical_spares": [ {{spare1}}, {{spare2}}, ... ]
}}
"""

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,               # more deterministic for schema-like output
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
            system_instruction="Always return pure JSON, no markdown, no prose outside the JSON."
        )

        full_prompt = (
            "You are an expert in asset management and preventive maintenance planning. "
            "Always return pure JSON without any markdown formatting.\n\n" + prompt
        )

        response = model.generate_content(full_prompt)
    except Exception as ge:
        logger.error(f"🧠 Gemini API error: {ge}")
        raise HTTPException(status_code=502, detail="Gemini API error")

    raw_content = (response.text or "").replace("```json", "").replace("```", "").strip()
    logger.info("🧠 AI response received from Gemini for parent asset maintenance plan")

    try:
        plan_data = json.loads(raw_content)
        logger.info("✅ Parent asset maintenance plan generated successfully")
        return {"success": True, "plan": plan_data}
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON decode error: {e}")
        logger.error(f"Raw content (first 600 chars): {raw_content[:600]}...")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON format")
