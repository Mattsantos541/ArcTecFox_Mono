from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import google.generativeai as genai
from datetime import datetime
import logging
import os
from typing import Optional
import sys
sys.path.append('..')
from file_processor import file_processor

router = APIRouter()
logger = logging.getLogger("main")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class PMPlanInput(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: str  # Operating hours
    frequency: str
    criticality: str
    additional_context: str  # Replaces usage cycles

def generate_prompt(data: PMPlanInput) -> str:
    today = datetime.utcnow().date().isoformat()
    return f"""
You are an expert in preventive maintenance (PM) for industrial assets. Generate a detailed preventive maintenance plan for the following asset:

- Name: {data.name}
- Model: {data.model}
- Serial: {data.serial}
- Category: {data.category}
- Operating Hours: {data.hours}
- PM Frequency: {data.frequency}
- Criticality: {data.criticality}
- Additional Context: {data.additional_context}
- Plan Start Date: {today}

**Instructions:**

1. Organize tasks into the following standard frequency groups:
   - Daily
   - Weekly
   - Monthly
   - Quarterly
   - Yearly

2. For each task, provide these fields:
   - "task_name": a clear, specific task name.
   - "maintenance_interval": one of the frequency groups above.
   - "instructions": an array of clear, step-by-step instructions to complete the task.
   - "reason": why this task is necessary for asset reliability, performance, or safety.
   - "engineering_rationale": a technical explanation considering the asset's operating hours ({data.hours}), criticality ({data.criticality}), category ({data.category}), and **especially the additional context** ({data.additional_context}). If the task addresses the additional context directly, clearly highlight this.
   - "safety_precautions": important safety measures for performing the task safely.
   - "common_failures_prevented": typical failure modes this task prevents. When applicable, highlight **grease points**, **typical failure points**, or wear-prone components.
   - "usage_insights": insights specific to {data.hours} operating hours and the additional context.
   - "scheduled_dates": an array of specific dates for the next 12 months starting from {today}, based on the task frequency.
   - "recommended_materials": list specific brands, types, and grades of required materials (e.g., lubricants, filters, belts). Include product examples (e.g., "Mobil SHC 632 gear oil", "SKF LGMT 2 grease") where applicable.
   - "citations": cite reliable sources for each task—ideally from the manufacturer’s manual. If unavailable, use credible industry references (e.g., ISO, ASTM, API, Mobil, SKF, Shell).

3. If applicable, for lubrication or greasing tasks:
   - Identify all grease points or lubrication zones.
   - Recommend lubrication frequency and the exact type/brand of grease or oil.
   - Explain how proper lubrication prevents wear, overheating, or failure.
   - Align recommendations with the asset's actual operating conditions and any special notes from the additional context.

4. Prioritize information from the manufacturer’s manual. If not available, rely on best practices from industry standards and reputable sources.

**Output Format:**

Return a single valid JSON object structured like this:

```json
{{ "maintenance_plan": [ {{task1}}, {{task2}}, ... ] }}
```

⚠️ **IMPORTANT:** Return only the raw JSON output. Do not include markdown formatting, explanations, or commentary.
"""


@router.post("/api/generate-ai-plan")
async def generate_ai_plan(input: PMPlanInput, request: Request):
    logger.info(f"🚀 Received AI plan request: {input.name}")
    prompt = generate_prompt(input)

    try:
        model = genai.GenerativeModel('gemini-pro')
        full_prompt = "You are an expert in preventive maintenance planning.\n\n" + prompt
        response = model.generate_content(full_prompt)
        ai_output = response.text
        logger.info("✅ AI plan generated successfully")
        return {"plan": ai_output}

    except Exception as e:
        logger.error(f"❌ Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Gemini API error.")
