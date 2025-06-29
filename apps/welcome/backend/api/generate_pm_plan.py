from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
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

@router.post("/api/generate-ai-plan")
async def generate_ai_plan(input: PMPlanInput, request: Request):
    logger.info(f"🚀 Received AI plan request: {input.name}")

    prompt = (
        f"Generate a preventive maintenance plan for the following asset:\n"
        f"Name: {input.name}\n"
        f"Model: {input.model}\n"
        f"Serial: {input.serial}\n"
        f"Category: {input.category}\n"
        f"Usage Hours: {input.hours}\n"
        f"Frequency: {input.frequency}\n"
        f"Criticality: {input.criticality}\n"
        f"Notes: {input.notes}\n"
        f"Format as clear markdown task list with timeline."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
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
