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

# Configure Google AI (using the same setup as main.py)
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
    Uses Gemini and returns pure JSON (no markdown).
    Requires authentication.
    """
    logger.info(f"🧩 User {user.email} requesting parent plan for: {input_data.parent_asset_name}")

    # Build parent asset label
    parent_label = f"{input_data.parent_asset_name}"
    if input_data.parent_asset_make:
        parent_label += f" - {input_data.parent_asset_make}"
    if input_data.parent_asset_model:
        parent_label += f" {input_data.parent_asset_model}"

    # Defaults for optional fields
    today = date.today().isoformat()
    site_location = input_data.site_location if input_data.site_location else "Not provided"
    environment = input_data.environment if input_data.environment else "Not provided"
    operating_hours = input_data.operating_hours if input_data.operating_hours else "Standard operating hours"
    pm_frequency = input_data.pm_frequency if input_data.pm_frequency else "Standard intervals"
    criticality = input_data.criticality if input_data.criticality else "Medium"
    additional_context = input_data.additional_context if input_data.additional_context else "None provided"

    # Include manual content if supplied
    manual_section = ""
    if input_data.user_manual_content:
        # Log manual details for debugging
        manual_lines = input_data.user_manual_content.split('\n')
        first_10_lines = '\n'.join(manual_lines[:10])
        
        logger.info(f"📚 Manual Content Detected!")
        logger.info(f"📚 Manual length: {len(input_data.user_manual_content)} characters")
        logger.info(f"📚 Manual has {len(manual_lines)} lines")
        logger.info(f"📚 First 10 lines of manual:\n{first_10_lines}")
        
        manual_section = f"""

User Manual Content (authoritative if present; extract concrete details from here):
{input_data.user_manual_content}
"""
    else:
        logger.info("📚 No manual content provided for this parent asset")

    # -------------------------
    # PROMPT (updated rules)
    # -------------------------
    prompt = f"""
You are an expert in preventive maintenance (PM) for industrial assets. Generate a *parent-asset health plan* for the overall system (NOT for specific child components), and list *critical spare parts for the parent asset*.

Parent/Child Hierarchy & Universal Context (applies to all tasks unless overridden):
* Parent Asset: {parent_label}
* Child Asset: Not applicable
* Site Location: {site_location}
* Environment: {environment}
* Operating Hours: {operating_hours}
* PM Frequency: {pm_frequency}
* Criticality: {criticality}
* Additional Context: {additional_context}
* Plan Start Date: {today}
{manual_section}

*Deduplication & Inheritance Rules (IMPORTANT):*
* Treat Site Location, Environment, Operating Hours, and Criticality as *universal* context for this plan. Do *not* repeat these in every field; only call out *deviations or overrides* at the task level.
* Avoid redundant phrasing across tasks. Keep fields concise and only include details unique to the task.
* If any universal field is unknown, proceed using best practices and state assumptions in the task "comments".

*Manual & Sources Policy (MANDATORY):*
* If **User Manual Content** is provided above, treat it as the primary source of truth. **Extract and include the exact relevant instructions, specifications, part numbers, and brand/grade details from the manual**, and **cite the section/page** in "citations".
* If no manual content is provided, give **concrete, authoritative** recommendations based on recognized standards (ISO/ASTM/API) or reputable supplier documentation (e.g., SKF, Mobil, Shell), and cite those sources.
* ⚠️ **Do NOT write "refer to the manual"** or similar placeholders. Always include the actual recommended values/steps/materials, either from the supplied manual content or from standards/suppliers.

*Instructions (Parent Oversight Only):*
1. Organize tasks into standard groups for readability:
   * Daily, Weekly, Monthly, Quarterly, Yearly
   However, **all task frequencies must be a numeric maintenance_interval in months**:
   - Daily ≈ 0.033, Weekly ≈ 0.25, Biweekly ≈ 0.5, Monthly = 1, Quarterly = 3, Yearly = 12
   Use fractional months as needed. *Do not output calendar dates.*

2. *Mandatory Parent-Asset Oversight Tasks (include at least these two):*
   - *Parent Asset Weekly Health Check* — maintenance_interval: *0.25*
   - *Parent Asset Monthly Health Audit* — maintenance_interval: *1*
   Add additional parent-level systemic checks if best practice applies (e.g., controls/PLC status, system alarms review, utilities, safety interlocks, vibration across assemblies, housekeeping, corrosion survey). Only include intervals in **months**.

3. For *every task* (parent-only scope), provide *all* fields below. If a field is not applicable, return "Not applicable". Do not omit fields. Follow the Manual & Sources Policy above:
   * "parent_asset": The parent system name.
   * "child_asset": "Not applicable" (this is a parent-only plan).
   * "task_name": Clear, specific name.
   * "maintenance_interval": *months only* as a number (e.g., 0.25, 1, 3, 12).
   * "instructions": Array of step-by-step actions (brief and actionable).
   * "reason": Why this task is necessary.
   * "engineering_rationale": Reference universal context *only when relevant*. Explicitly call out when addressing: "{additional_context}".
   * "safety_precautions": PPE and hazards.
   * "common_failures_prevented": Parent/systemic failure modes this task helps avoid.
   * "usage_insights": Insights tied to {operating_hours}. Do *not* reference usage cycles.
   * "tools_needed": Tools required.
   * "number_of_technicians": Typical headcount.
   * "estimated_time_minutes": Minutes required (numeric).
   * "consumables": Consumables used (brands/grades/part numbers where appropriate) or "Not applicable".
   * "risk_assessment": Snapshot of *current risks* and *likely failures before the next interval* for the overall system health.
   * "criticality_rating": "High" | "Medium" | "Low" for this task's priority.
   * "comments": Notes, assumptions, or overrides to universal context; "None" if nothing to add.
   * "citations": If manual content is provided, cite **exact manual sections/pages** used. Otherwise cite standards/suppliers (ISO/ASTM/API; SKF/Mobil/Shell).
   * "inherits_parent_context": true/false (should usually be true).
   * "context_overrides": Only fields that deviate from universal context; empty object if none.

4. *Critical Spare Parts for the Parent Asset:*
   Output a list of *critical spare parts* for the *parent asset* (NOT its child components).
   * If manual content is provided, **extract exact part names/numbers/specs** and cite manual sections/pages.
   * If not, infer from standards/suppliers and cite those sources.
   * ⚠️ **Do NOT write "refer to the manual"** — always include concrete details.

   For each spare, include:
   - "parent_asset": {parent_label}
   - "child_asset": "Not applicable"
   - "part_name"
   - "part_number"
   - "manufacturer" (if known)
   - "preferred_brand" (if applicable)
   - "uom" (unit of measure, if applicable)
   - "min_stock_level" (numeric or "Not applicable")
   - "max_stock_level" (numeric or "Not applicable")
   - "lead_time_days" (numeric or "Not applicable")
   - "criticality" ("High"|"Medium"|"Low")
   - "failure_modes" (array of strings)
   - "associated_maintenance_interval_months" (numeric months only, or "Not applicable")
   - "storage_conditions" (if applicable)
   - "references" (manual section/page or credible source)
   - "notes" (optional comments)

*Output Format:* Return a single valid JSON object with *both* sections:
{{
  "maintenance_plan": [ {{task1}}, {{task2}}, ... ],
  "critical_spares": [ {{spare1}}, {{spare2}}, ... ]
}}

⚠️ *IMPORTANT:* Return only the raw JSON object without any markdown formatting or code blocks.
"""

    try:
        # Use the same Google AI pattern as suggest_child_assets
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        full_prompt = (
            "You are an expert in asset management and preventive maintenance planning. "
            "Always return pure JSON without any markdown formatting.\n\n" + prompt
        )
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=8192,  # Large to accommodate detailed tasks + spares
            )
        )
    except Exception as ge:
        logger.error(f"🧠 Gemini API error: {ge}")
        raise HTTPException(status_code=502, detail="Gemini API error")

    raw_content = response.text or ""
    logger.info("🧠 AI response received from Gemini for parent asset maintenance plan")

    # Clean and parse JSON
    raw_content = raw_content.replace("```json", "").replace("```", "").strip()

    try:
        plan_data = json.loads(raw_content)
        logger.info("✅ Parent asset maintenance plan generated successfully")
        return {"success": True, "plan": plan_data}
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON decode error: {e}")
        logger.error(f"Raw content (truncated): {raw_content[:500]}...")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON format")
