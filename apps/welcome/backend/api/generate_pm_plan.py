from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI, APIConnectionError, OpenAIError
from datetime import datetime
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

2. For each task, provide **all** of the following fields. If a field is not applicable, explicitly return a value like "Not applicable". Do not omit fields:
   - "task_name": A clear, specific name for the maintenance task.
   - "maintenance_interval": One of the standard frequencies listed above.
   - "instructions": An array of clear, step-by-step instructions.
   - "reason": A short explanation of why this task is necessary.
   - "engineering_rationale": A technical explanation considering operating hours ({data.hours}), criticality ({data.criticality}), category ({data.category}), and especially the **additional context**: "{data.additional_context}". If the task directly addresses something in the additional context, explicitly call that out here.
   - "safety_precautions": Important safety measures or PPE required.
   - "common_failures_prevented": Typical failures this task helps avoid. Highlight known failure modes and grease points or wear-prone areas where relevant.
   - "usage_insights": Usage-based insights related to {data.hours}. Do **not** reference usage cycles.
   - "scheduled_dates": Array of dates for the next 12 months starting from {today}, based on task frequency.
   - "tools_needed": List of tools required to complete the task.
   - "number_of_technicians": How many technicians are typically needed.
   - "estimated_time_minutes": Estimated time in minutes to complete this task. This field must be included for every task.
   - "consumables": List of all consumables and supplies needed for this specific task. Include grease, oil, filters, gaskets, rags, sealant, adhesives, disposable gloves, or any single-use items. Be specific about brand, type, and grade (e.g., "Mobil SHC 632 gear oil", "SKF LGMT 2 grease"). This field must be included for every task.
   - "comments": Any additional notes, edge cases, or special concerns. If nothing to add, return "None" or "No additional comments".
   - "citations": Cite reliable sources—preferably the manufacturer’s manual. If not available, use credible standards (ISO, ASTM, API) or supplier data (e.g., SKF, Mobil, Shell).

3. You must address all input provided in the "additional_context". If specific tasks are generated as a result, make that connection clear in rationale or comments.

4. Prioritize information from the manufacturer’s manual. If not available, rely on best practices from industry standards and reputable sources.

**Output Format:**

Return a single valid JSON object structured like:

```json
{{ "maintenance_plan": [ {{task1}}, {{task2}}, ... ] }}
```

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
            timeout=20
        )
        ai_output = response.choices[0].message.content
        logger.info("✅ AI plan generated successfully")
        return {"plan": ai_output}
    except APIConnectionError as e:
        logger.error(f"🔌 OpenAI connection error: {e}")
        raise HTTPException(status_code=502, detail="OpenAI connection failed.")
    except OpenAIError as e:
        logger.error(f"🧐 OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI API error.")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error.")
