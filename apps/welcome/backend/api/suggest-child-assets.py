from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
from typing import Optional
import logging
import os

router = APIRouter()
logger = logging.getLogger("main")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# =============================
# Pydantic Models
# =============================
class ChildSuggestInput(BaseModel):
    parent_asset: str
    additional_context: Optional[str] = None
    top_n: Optional[int] = 12


# =============================
# Prompt Builder
# =============================

def generate_child_assets_prompt(parent_asset: str, additional_context: Optional[str] = None, top_n: int = 12) -> str:
    return f"""
You are an expert in asset management and preventive maintenance planning.

Given the following parent asset and context:
- Parent Asset: {parent_asset}
- Additional Context: {additional_context if additional_context else "None provided"}

**Instructions:**
1. Based on industry standards, manufacturer norms, and common equipment hierarchies, list the most likely child assets (subcomponents, modules, or parts) that make up this parent asset.
2. For each child asset, include the following fields:
   - "child_asset_name": Clear, specific name of the subcomponent.
   - "function": Short description of its role in the parent asset's operation.
   - "criticality_level": One of High, Medium, Low — based on how critical it is to the parent asset's functionality.
   - "common_failures": Brief list (array) of typical failure modes for this child asset.
   - "pm_relevance": One to two sentences on why this subcomponent would have its own PM plan.
3. If the additional context mentions environmental factors, operating conditions, regulations, or customer requirements, incorporate these into the selection and prioritization of child assets.
4. If the set of child assets varies by model/version, suggest the most common options and label such items as "typical".
5. If a field cannot be determined precisely, still include it and state "Not applicable" or "Unknown" rather than omitting the field.
6. If a manufacturer manual is available or provided separately, prefer its hierarchy and terminology. When in doubt, follow common industry conventions.
7. Suggest up to {top_n} child assets that are most relevant.

**Output Format (JSON only):**
{{
  "child_assets": [
    {{
      "child_asset_name": "Example Component",
      "function": "Short description of function",
      "criticality_level": "High",
      "common_failures": ["Failure 1", "Failure 2"],
      "pm_relevance": "Why this asset would have its own PM plan"
    }}
  ]
}}

⚠️ IMPORTANT: Return only the JSON object; no extra commentary or markdown.
"""


# =============================
# Endpoint
# =============================
@router.post("/api/suggest-child-assets")
async def suggest_child_assets(input: ChildSuggestInput, request: Request):
    logger.info(f"🧩 Suggesting child assets for parent: {input.parent_asset}")
    prompt = generate_child_assets_prompt(
        parent_asset=input.parent_asset,
        additional_context=input.additional_context,
        top_n=input.top_n or 12,
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in asset hierarchies and PM planning."},
                {"role": "user", "content": prompt}
            ],
            timeout=40,
        )
        suggestions_json = response.choices[0].message.content
        logger.info("✅ Child asset suggestions generated successfully")
        return {"suggestions": suggestions_json}

    except APIConnectionError as e:
        logger.error(f"🔌 OpenAI connection error: {e}")
        raise HTTPException(status_code=502, detail="OpenAI connection failed.")
    except OpenAIError as e:
        logger.error(f"🧠 OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI API error.")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error.")
