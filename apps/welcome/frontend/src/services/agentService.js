/**
 * Agent Service - Reusable AI agents for various tasks
 * Define once, use everywhere
 */

import { supabase } from '../api';

// Agent type constants
export const AGENT_TYPES = {
  MVP_PLANNER: 'MVP_PLANNER',
  PM_TASK_GENERATOR: 'PM_TASK_GENERATOR', 
  CHILD_ASSET_SUGGESTER: 'CHILD_ASSET_SUGGESTER',
  FAILURE_ANALYZER: 'FAILURE_ANALYZER',
  COST_OPTIMIZER: 'COST_OPTIMIZER',
  UI_STYLIST: 'UI_STYLIST',
  BUG_FIXER: 'BUG_FIXER',
  MODULAR_ARCHITECT: 'MODULAR_ARCHITECT',
  REVIEWER_READONLY: 'REVIEWER_READONLY'
};

/**
 * Get the backend URL dynamically
 */
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  const hostname = window.location.hostname;
  if (hostname.includes('.app.github.dev')) {
    const codespacePrefix = hostname.split('-3000.')[0];
    return `https://${codespacePrefix}-8000.app.github.dev`;
  }
  
  return import.meta.env.DEV ? 'http://localhost:8000' : 'https://arctecfox-mono.onrender.com';
};

/**
 * Execute an AI agent
 * @param {string} agentType - Type of agent from AGENT_TYPES
 * @param {Object} parameters - Parameters for the agent
 * @param {Object} options - Optional settings (model, temperature)
 * @returns {Promise<Object>} Agent response with structured data
 */
export async function executeAgent(agentType, parameters, options = {}) {
  try {
    console.log(`🤖 Executing agent: ${agentType}`, parameters);
    
    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }
    
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/execute-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        agent_type: agentType,
        parameters: parameters,
        model: options.model || 'gemini-1.5-flash',
        temperature: options.temperature || 0.7
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Agent execution failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Agent response:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Agent execution error:', error);
    throw error;
  }
}

/**
 * Get list of available agents
 * @returns {Promise<Array>} List of available agents with their descriptions
 */
export async function getAvailableAgents() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }
    
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/available-agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get agents: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.agents;
  } catch (error) {
    console.error('❌ Error fetching available agents:', error);
    throw error;
  }
}

// Specific agent helper functions

/**
 * Plan an MVP from a goal description
 */
export async function planMVP(goalDescription, context = '') {
  return executeAgent(AGENT_TYPES.MVP_PLANNER, {
    goal_description: goalDescription,
    context: context
  });
}

/**
 * Generate PM tasks for an asset
 */
export async function generatePMTasks(assetInfo) {
  return executeAgent(AGENT_TYPES.PM_TASK_GENERATOR, {
    asset_name: assetInfo.name,
    asset_type: assetInfo.type || 'Equipment',
    asset_make: assetInfo.make || 'Unknown',
    asset_model: assetInfo.model || 'Unknown',
    environment: assetInfo.environment || 'Standard conditions',
    context: assetInfo.notes || ''
  });
}

/**
 * Suggest child assets for a parent
 */
export async function suggestChildAssetsForParent(parentAsset, maxSuggestions = 8) {
  return executeAgent(AGENT_TYPES.CHILD_ASSET_SUGGESTER, {
    parent_name: parentAsset.name,
    parent_make: parentAsset.make || 'Unknown',
    parent_model: parentAsset.model || 'Unknown', 
    parent_category: parentAsset.category || 'Equipment',
    environment: parentAsset.environment || 'Standard',
    max_suggestions: maxSuggestions
  });
}

/**
 * Analyze equipment failure
 */
export async function analyzeFailure(failureInfo) {
  return executeAgent(AGENT_TYPES.FAILURE_ANALYZER, {
    asset_name: failureInfo.assetName,
    failure_description: failureInfo.description,
    operating_hours: failureInfo.operatingHours || 'Unknown',
    last_maintenance: failureInfo.lastMaintenance || 'Unknown',
    environment: failureInfo.environment || 'Standard'
  });
}

/**
 * Optimize maintenance costs
 */
export async function optimizeCosts(costInfo) {
  return executeAgent(AGENT_TYPES.COST_OPTIMIZER, {
    maintenance_plan: JSON.stringify(costInfo.maintenancePlan),
    asset_value: costInfo.assetValue,
    annual_cost: costInfo.annualCost,
    failure_history: JSON.stringify(costInfo.failureHistory || [])
  });
}

/**
 * Restyle UI components to match design tokens
 */
export async function restyleComponent(componentCode, designTokens, targetStyle, requirements = '') {
  return executeAgent(AGENT_TYPES.UI_STYLIST, {
    component_code: componentCode,
    design_tokens: JSON.stringify(designTokens),
    target_style: targetStyle,
    requirements: requirements
  });
}

/**
 * Fix a bug with minimal changes
 */
export async function fixBug(bugInfo) {
  return executeAgent(AGENT_TYPES.BUG_FIXER, {
    bug_description: bugInfo.description,
    code_context: bugInfo.codeContext,
    environment: bugInfo.environment || 'Development',
    error_logs: bugInfo.errorLogs || 'No error logs provided',
    reproduction_steps: bugInfo.reproductionSteps || 'Not provided'
  });
}

/**
 * Design modular architecture for a project
 */
export async function designArchitecture(projectInfo) {
  return executeAgent(AGENT_TYPES.MODULAR_ARCHITECT, {
    project_description: projectInfo.description,
    current_structure: projectInfo.currentStructure || 'New project',
    functional_requirements: projectInfo.functionalReqs || 'Standard functionality',
    technical_requirements: projectInfo.technicalReqs || 'Modern web stack',
    scale_requirements: projectInfo.scaleReqs || 'Small to medium scale',
    constraints: projectInfo.constraints || 'None specified'
  });
}

/**
 * Review code without making edits
 */
export async function reviewCode(prInfo) {
  return executeAgent(AGENT_TYPES.REVIEWER_READONLY, {
    pr_title: prInfo.title,
    pr_description: prInfo.description || 'No description provided',
    files_changed: prInfo.filesChanged || 'Unknown',
    code_diff: prInfo.codeDiff
  });
}