# extract_asset_details.py

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import google.generativeai as genai
from typing import Optional, Dict
import logging
import json
import os
import sys

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
class ExtractionInput(BaseModel):
    manual_content: str = Field(..., description="User manual content to extract details from")


class ExtractedDetails(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None


class ExtractionConfidence(BaseModel):
    make: float = Field(0.0, ge=0, le=100)
    model: float = Field(0.0, ge=0, le=100)
    serial_number: float = Field(0.0, ge=0, le=100)
    category: float = Field(0.0, ge=0, le=100)


class ExtractionResponse(BaseModel):
    extracted: ExtractedDetails
    confidence: ExtractionConfidence


# =============================
# Asset Details Extraction Endpoint
# =============================
@router.post("/extract-asset-details", response_model=ExtractionResponse)
async def extract_asset_details(
    request: Request,
    input_data: ExtractionInput,
    user: AuthenticatedUser = Depends(verify_supabase_token)
):
    """
    Extract asset details (Make, Model, Serial Number, Category) from user manual content.
    Uses Google Gemini AI for intelligent extraction.
    Requires authentication.
    """
    logger.info(f"🔍 User {user.email} requesting asset details extraction")

    # Truncate content if too long (keep first 10000 chars for extraction)
    content = input_data.manual_content[:10000] if len(input_data.manual_content) > 10000 else input_data.manual_content

    # =============================
    # Gemini Extraction Prompt - OPTIMIZED FOR ACCURACY
    # =============================
    prompt = f"""
You are an expert at extracting equipment and asset information from user manuals and technical documentation.

Your PRIMARY GOAL is ACCURACY over completeness. It is BETTER to return null than to guess incorrectly.

Analyze the following user manual content and extract these specific details:
1. MAKE/MANUFACTURER: The company or brand that manufactured the equipment
2. MODEL: The specific model number or model name
3. SERIAL NUMBER: The unique serial number of this specific unit
4. CATEGORY: The type/category of equipment

User Manual Content:
{content}

CRITICAL EXTRACTION RULES:

🚫 NEVER EXTRACT IF:
- Information is implied, inferred, or assumed
- Text shows format examples (e.g., "S/N: XXXXXX", "Model: [MODEL]")
- Information appears in disclaimers, warranties, or legal text
- Content describes features without naming the equipment type
- Serial numbers are placeholder text or formatting examples

✅ ONLY EXTRACT IF:
- Information is explicitly stated as fact
- Text clearly identifies the specific unit being documented
- Manufacturer name appears as an official company identifier
- Model number/name is stated as the specific product model
- Serial number is presented as THIS unit's actual serial number
- Category is explicitly named (not inferred from capabilities)

FIELD-SPECIFIC VALIDATION:

MAKE/MANUFACTURER:
✅ Extract: "Caterpillar Model 320", "John Deere Equipment", "Manufactured by Honda"
❌ DON'T: Inferring "Caterpillar" from model "320D" alone, brand mentions in parts lists

MODEL:
✅ Extract: "Model: XG350", "Series 1200A", "Type: DG6000"
❌ DON'T: Product lines ("XG Series"), part numbers, general descriptions

SERIAL NUMBER:
✅ Extract: "Serial Number: ABC123456", "Unit S/N: 789XYZ", "This unit: #12345"
❌ DON'T: "S/N: ________", "Serial format: XXXX", example formats, template fields

CATEGORY:
✅ Extract: "Excavator Manual", "Generator Operation Guide", "This compressor..."
❌ DON'T: Inferring from features ("hydraulic" → excavator), component lists, capabilities

AMBIGUITY HANDLING:
- If text could mean multiple things → return null
- If information contradicts itself → return null
- If context is unclear → return null
- If you're not 95% certain → return null

Return your response in this EXACT JSON format:
{{
  "extracted": {{
    "make": "manufacturer name or null",
    "model": "model number/name or null",
    "serial_number": "specific serial number or null",
    "category": "equipment category or null"
  }},
  "confidence": {{
    "make": 0-100,
    "model": 0-100,
    "serial_number": 0-100,
    "category": 0-100
  }}
}}

REVISED CONFIDENCE SCORING (Conservative Approach):
- 95-100: Information explicitly labeled and unambiguous (e.g., "Model: XG350")
- 80-94: Information clearly stated but not formally labeled (e.g., "The Caterpillar 320D...")
- 60-79: Information present with minor interpretation needed
- 40-59: Information possibly present but requires significant interpretation
- 20-39: Information unclear or contradictory
- 0-19: Information not found or highly uncertain

REMEMBER: Partial extraction with high confidence is MUCH better than complete extraction with low confidence.
"""

    try:
        # Call Gemini API
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)

        if not response or not response.text:
            logger.error("No response from Gemini API")
            raise HTTPException(status_code=500, detail="AI service did not return a response")

        # Parse the JSON response
        response_text = response.text.strip()

        # Clean up response if it contains markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"AI Response: {response_text}")

            # Return empty extraction on parse failure
            return ExtractionResponse(
                extracted=ExtractedDetails(),
                confidence=ExtractionConfidence()
            )

        # Validate and structure the response
        extracted = result.get("extracted", {})
        confidence = result.get("confidence", {})

        # Ensure proper types and handle None values
        extraction_response = ExtractionResponse(
            extracted=ExtractedDetails(
                make=extracted.get("make") if extracted.get("make") != "null" else None,
                model=extracted.get("model") if extracted.get("model") != "null" else None,
                serial_number=extracted.get("serial_number") if extracted.get("serial_number") != "null" else None,
                category=extracted.get("category") if extracted.get("category") != "null" else None
            ),
            confidence=ExtractionConfidence(
                make=float(confidence.get("make", 0)),
                model=float(confidence.get("model", 0)),
                serial_number=float(confidence.get("serial_number", 0)),
                category=float(confidence.get("category", 0))
            )
        )

        logger.info(f"✅ Successfully extracted asset details for {user.email}")
        return extraction_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")