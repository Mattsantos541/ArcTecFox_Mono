"""
Generic Agent Executor for AI-powered agents
"""
import os
import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import google.generativeai as genai
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth import verify_supabase_token, AuthenticatedUser
from prompts.agent_prompts import get_agent_prompt

router = APIRouter()
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class AgentRequest(BaseModel):
    """Generic agent request model"""
    agent_type: str = Field(..., description="Type of agent to use (MVP_PLANNER, PM_TASK_GENERATOR, etc.)")
    parameters: Dict[str, Any] = Field(..., description="Parameters for the agent prompt")
    model: Optional[str] = Field("gemini-1.5-flash", description="AI model to use")
    temperature: Optional[float] = Field(0.7, ge=0, le=1, description="Creativity level (0=deterministic, 1=creative)")
    
class AgentResponse(BaseModel):
    """Generic agent response model"""
    success: bool
    agent_type: str
    raw_response: str
    structured_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.post("/execute-agent")
async def execute_agent(
    request: AgentRequest,
    user: AuthenticatedUser = Depends(verify_supabase_token)
) -> AgentResponse:
    """
    Execute an AI agent with the specified prompt template
    """
    logger.info(f"🤖 User {user.email} executing agent: {request.agent_type}")
    
    try:
        # Get the formatted prompt
        prompt = get_agent_prompt(request.agent_type, **request.parameters)
        
        # Initialize the AI model
        model = genai.GenerativeModel(
            model_name=request.model,
            generation_config={
                "temperature": request.temperature,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
            }
        )
        
        # Generate response
        response = model.generate_content(prompt)
        raw_response = response.text
        
        # Try to extract JSON data if present
        structured_data = None
        try:
            # Look for JSON blocks in the response
            import re
            json_pattern = r'```json\s*([\s\S]*?)\s*```'
            json_matches = re.findall(json_pattern, raw_response)
            
            if json_matches:
                # Parse the first JSON block found
                structured_data = json.loads(json_matches[0])
            elif raw_response.strip().startswith('[') or raw_response.strip().startswith('{'):
                # Try parsing the whole response as JSON
                structured_data = json.loads(raw_response)
        except json.JSONDecodeError:
            # JSON extraction failed, that's okay
            logger.debug("No valid JSON found in response")
        
        return AgentResponse(
            success=True,
            agent_type=request.agent_type,
            raw_response=raw_response,
            structured_data=structured_data
        )
        
    except ValueError as e:
        logger.error(f"❌ Agent error: {e}")
        return AgentResponse(
            success=False,
            agent_type=request.agent_type,
            raw_response="",
            error=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Unexpected error in agent execution: {e}")
        return AgentResponse(
            success=False,
            agent_type=request.agent_type,
            raw_response="",
            error=f"Agent execution failed: {str(e)}"
        )

@router.get("/available-agents")
async def get_available_agents(
    user: AuthenticatedUser = Depends(verify_supabase_token)
) -> Dict[str, Any]:
    """
    Get list of available agent types and their required parameters
    """
    return {
        "agents": [
            {
                "type": "MVP_PLANNER",
                "description": "Turn vague goals into MVP with clear scope",
                "required_params": ["goal_description", "context"],
                "output_format": "Structured text with JSON backlog"
            },
            {
                "type": "PM_TASK_GENERATOR",
                "description": "Generate preventive maintenance tasks for assets",
                "required_params": ["asset_name", "asset_type", "asset_make", "asset_model", "environment", "context"],
                "output_format": "JSON task list"
            },
            {
                "type": "CHILD_ASSET_SUGGESTER",
                "description": "Suggest child assets for a parent asset",
                "required_params": ["parent_name", "parent_make", "parent_model", "parent_category", "environment"],
                "optional_params": ["max_suggestions"],
                "output_format": "JSON child assets list"
            },
            {
                "type": "FAILURE_ANALYZER",
                "description": "Analyze equipment failures and recommend adjustments",
                "required_params": ["asset_name", "failure_description", "operating_hours", "last_maintenance", "environment"],
                "output_format": "Analysis with JSON recommendations"
            },
            {
                "type": "COST_OPTIMIZER",
                "description": "Optimize maintenance costs",
                "required_params": ["maintenance_plan", "asset_value", "annual_cost", "failure_history"],
                "output_format": "Cost analysis with JSON recommendations"
            },
            {
                "type": "UI_STYLIST",
                "description": "Restyle components to match design token set",
                "required_params": ["component_code", "design_tokens", "target_style", "requirements"],
                "output_format": "Unified diff patch with style changes"
            },
            {
                "type": "BUG_FIXER",
                "description": "Diagnose, test, and fix bugs with minimal changes",
                "required_params": ["bug_description", "code_context", "environment", "error_logs", "reproduction_steps"],
                "output_format": "Root cause, failing test, and fix patch"
            },
            {
                "type": "MODULAR_ARCHITECT",
                "description": "Design modular system architecture with clear boundaries",
                "required_params": ["project_description", "current_structure", "functional_requirements", "technical_requirements", "scale_requirements", "constraints"],
                "output_format": "ASCII module map and interface definitions"
            },
            {
                "type": "REVIEWER_READONLY",
                "description": "Code review without edits, with risk assessment",
                "required_params": ["pr_title", "pr_description", "files_changed", "code_diff"],
                "output_format": "Risk ranking, inline comments, merge decision"
            }
        ]
    }