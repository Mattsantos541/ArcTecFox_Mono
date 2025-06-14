from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import json
import pandas as pd
import openai
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

router = APIRouter()

class AssetData(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: int
    cycles: int
    environment: str
    date_of_plan_start: Optional[date] = None

def format_numbered_instructions(instructions: list[str]) -> str:
    return "\n".join([f"{i + 1}. {step.strip()}" for i, step in enumerate(instructions)])

def generate_prompt(data: AssetData) -> str:
    plan_start = (
        data.date_of_plan_start.isoformat()
        if data.date_of_plan_start
        else datetime.utcnow().date().isoformat()
    )

    return f"""
Generate a detailed preventive maintenance (PM) plan for the following asset:

- Asset Name: {data.name}
- Model: {data.model}
- Serial Number: {data.serial}
- Asset Category: {data.category}
- Usage Hours: {data.hours} hours
- Usage Cycles: {data.cycles} cycles
- Environmental Conditions: {data.environment}
- Date of Plan Start: {plan_start}

Use the manufacturer's user manual to determine recommended maintenance tasks and intervals. If the manual is not available, infer recommendations from best practices for similar assets in the same category. Be as detailed as possible in the instructions.

**Usage Insights**  
- Provide a concise write-up (in a field named "usage_insights") that analyzes this asset’s current usage profile ({data.hours} hours and {data.cycles} cycles), noting the typical outages or failure modes that occur at this stage in the asset’s life.

For each PM task:
1. Clearly describe the task.
2. Provide step-by-step instructions.
3. Include safety precautions.
4. Note any relevant government regulations or compliance checks.
5. Highlight common failure points this task is designed to prevent.
6. Tailor instructions based on usage data and environmental conditions.
7. Include an "engineering_rationale" field explaining why this task and interval were selected.
8. Based on the plan start date, return a list of future dates when this task should be performed over the next 12 months.
9. In each task object, include the "usage_insights" field (you may repeat or summarize key points if needed).

**IMPORTANT:** Return only a valid JSON object with no markdown or explanation. The JSON must have a key "maintenance_plan" whose value is an array of objects. Each object must include:
- "task_name" (string)
- "maintenance_interval" (string)
- "instructions" (array of strings)
- "reason" (string)
- "engineering_rationale" (string)
- "safety_precautions" (string)
- "common_failures_prevented" (string)
- "usage_insights" (string)
- "scheduled_dates" (array of strings in YYYY-MM-DD format)
"""

@router.post("/generate_pm_plan")
def generate_pm_plan(data: AssetData, format: str = Query("json", enum=["json", "excel"])):
    print("📥 PM Plan Request")
    print("Format:", format)
    print("Asset Data:", data.dict())

    try:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "input": data.dict()
        }
        with open("pm_lite_logs.txt", "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print("⚠️ Log write failed:", e)

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in preventive maintenance planning."},
                {"role": "user", "content": generate_prompt(data)}
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        raw_content = response.choices[0].message.content
        print("🧠 Raw OpenAI response:")
        print(raw_content)

        try:
            parsed = json.loads(raw_content)
            plan_json = parsed.get("maintenance_plan", [])
        except json.JSONDecodeError as je:
            print("❌ JSON decode error:", je)
            return {"error": "AI returned invalid JSON", "pm_plan": []}

        for task in plan_json:
            task["asset_name"] = data.name
            task["asset_model"] = data.model

            instructions_raw = task.get("instructions")
            if isinstance(instructions_raw, str) and "|" in instructions_raw:
                steps = [s.strip() for s in instructions_raw.split("|") if s.strip()]
                task["instructions"] = format_numbered_instructions(steps)
            elif isinstance(instructions_raw, list):
                task["instructions"] = format_numbered_instructions(instructions_raw)

        if format == "excel":
            df = pd.DataFrame(plan_json)
            output_path = "pm_plan_output.xlsx"
            df.to_excel(output_path, index=False)
            return FileResponse(
                output_path,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                filename="PM_Plan.xlsx"
            )
        else:
            return JSONResponse(content={"pm_plan": plan_json})

    except Exception as e:
        print("❌ Error generating plan:", e)
        return {"error": str(e), "pm_plan": []}
