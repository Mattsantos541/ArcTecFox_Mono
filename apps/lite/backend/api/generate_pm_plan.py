from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import openai
import pandas as pd

router = APIRouter()

class AssetData(BaseModel):
    name: str
    model: str
    serial: str
    category: str
    hours: int
    cycles: int
    environment: str
    email: Optional[str] = None
    company: Optional[str] = None

def format_numbered_instructions(instructions: list[str]) -> str:
    return "\n".join([f"{i + 1}. {step.strip()}" for i, step in enumerate(instructions)])

def generate_prompt(data: AssetData) -> str:
    return f"""
You are an expert preventive maintenance planner. Based on the asset details below, generate a PM plan in JSON format.

Each task should include:
- task_name
- maintenance_trigger: a list such as ["calendar", "hours"] or just one
- calendar_interval: e.g., "Every 3 months" (if applicable)
- hours_interval: e.g., "Every 500 hours" (if applicable)
- instructions: a list of short steps OR a pipe-separated string (these will be converted to a numbered list)
- reason
- safety_precautions

Asset Details:
- Name: {data.name}
- Model: {data.model}
- Serial: {data.serial}
- Category: {data.category}
- Operating Hours: {data.hours}
- Cycles: {data.cycles}
- Environment: {data.environment}
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
                {"role": "system", "content": "You generate preventive maintenance schedules."},
                {"role": "user", "content": generate_prompt(data)}
            ],
            temperature=0.3
        )

        plan_json = json.loads(response['choices'][0]['message']['content'])

        for task in plan_json:
            task["asset_name"] = data.name
            task["asset_model"] = data.model
            task["hours_interval"] = task.get("hours_interval", "")

            # Normalize instructions
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
