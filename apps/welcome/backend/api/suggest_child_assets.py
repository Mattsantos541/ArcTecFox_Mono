from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import google.generativeai as genai
from typing import Optional
import logging
import json
import os
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
class ChildSuggestInput(BaseModel):
    parent_asset_name: str = Field(..., max_length=255, min_length=1, description="Parent asset name")
    parent_asset_make: Optional[str] = Field(None, max_length=255, description="Parent asset make/manufacturer")
    parent_asset_model: Optional[str] = Field(None, max_length=255, description="Parent asset model")
    parent_asset_category: Optional[str] = Field(None, max_length=255, description="Parent asset category")
    environment: Optional[str] = Field(None, max_length=500, description="Environmental conditions")
    additional_context: Optional[str] = Field(None, max_length=1000, description="Additional context for suggestions")
    top_n: Optional[int] = Field(8, ge=1, le=20, description="Number of suggestions to generate")

# =============================
# Child Asset Suggestions Endpoint
# =============================
@router.post("/suggest-child-assets")
async def suggest_child_assets(request: Request, input_data: ChildSuggestInput):
    """
    Generate AI-powered child asset suggestions based on parent asset details.
    Uses the same Google AI infrastructure as PM plan generation.
    """
    logger.info(f"🧩 Suggesting child assets for parent: {input_data.parent_asset_name}")
    
    # Build parent asset details string
    parent_details = f"Name: {input_data.parent_asset_name}"
    if input_data.parent_asset_make:
        parent_details += f", Make: {input_data.parent_asset_make}"
    if input_data.parent_asset_model:
        parent_details += f", Model: {input_data.parent_asset_model}"
    if input_data.parent_asset_category:
        parent_details += f", Category: {input_data.parent_asset_category}"
    if input_data.environment:
        parent_details += f", Environment: {input_data.environment}"

    # Create the AI prompt
    prompt = f"""
You are an expert in asset management and preventive maintenance planning.

Given the following parent asset details:
{parent_details}

Additional Context: {input_data.additional_context if input_data.additional_context else "None provided"}

Based on industry standards, manufacturer norms, and common equipment hierarchies, list the most likely child assets (subcomponents, modules, or parts) that make up this parent asset. Focus on components that would typically have their own maintenance schedules.

For each child asset, include the following fields:
- "name": Clear, specific name of the subcomponent
- "make": Manufacturer/brand if commonly known (can be same as parent or "Various")
- "model": Model designation if applicable (or "Standard" if generic)
- "category": Type/classification of the component
- "function": Short description of its role in the parent asset's operation
- "criticality_level": One of High, Medium, Low — based on how critical it is to the parent asset's functionality
- "common_failures": Brief list (array) of typical failure modes for this child asset
- "pm_relevance": One to two sentences on why this subcomponent would have its own PM plan
- "additional_notes": Any other relevant information about maintenance, specifications, or operating conditions

Suggest up to {input_data.top_n} child assets that are most relevant for preventive maintenance.

**Output Format (JSON only):**
{{
  "child_assets": [
    {{
      "name": "Component Name",
      "make": "Manufacturer or Various", 
      "model": "Model or Standard",
      "category": "Component Type",
      "function": "Brief description of function",
      "criticality_level": "High",
      "common_failures": ["Failure 1", "Failure 2"],
      "pm_relevance": "Why this asset needs its own PM plan",
      "additional_notes": "Any other relevant maintenance information"
    }}
  ]
}}
"""

    try:
        # Use the same Google AI pattern as generate-ai-plan in main.py
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        full_prompt = "You are an expert in asset management and preventive maintenance planning. Always return pure JSON without any markdown formatting.\n\n" + prompt
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=4096,
            )
        )
    except Exception as ge:
        logger.error(f"🧠 Gemini API error: {ge}")
        raise HTTPException(status_code=502, detail="Gemini API error")

    raw_content = response.text
    logger.info("🧠 AI response received from Gemini for child asset suggestions")

    # Clean the response (same pattern as PM generation)
    raw_content = raw_content.replace("```json", "").replace("```", "").strip()

    try:
        suggestions_data = json.loads(raw_content)
        logger.info("✅ Child asset suggestions generated successfully")
        return {"success": True, "suggestions": suggestions_data}
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON decode error: {e}")
        logger.error(f"Raw content: {raw_content[:200]}...")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON format")
