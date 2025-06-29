// apps/welcome/backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Initialize Supabase with service role key (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for backend
);

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend API is running' });
});

// Generate PM Plan endpoint
app.post('/api/generate-pm-plan', async (req, res) => {
  try {
    console.log('🚀 Received PM plan request:', req.body);
    
    const { planData } = req.body;
    
    if (!planData || !planData.name || !planData.category) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and category' 
      });
    }

    // 1. Save lead data
    const leadResult = await supabase
      .from('pm_leads')
      .insert([{
        email: planData.email || 'test@example.com',
        org_name: planData.company || 'Test Company',
      }])
      .select()
      .single();

    if (leadResult.error) {
      console.error('Error saving lead:', leadResult.error);
    }

    // 2. Save plan input
    const planInputResult = await supabase
      .from('pm_plans')
      .insert([{
        asset_name: planData.name,
        asset_model: planData.model,
        serial_no: planData.serial,
        eq_category: planData.category,
        op_hours: parseInt(planData.hours) || 0,
        cycles: parseInt(planData.cycles) || 0,
        env_desc: planData.environment,
        plan_start_date: planData.date_of_plan_start || null,
      }])
      .select()
      .single();

    if (planInputResult.error) {
      throw new Error(`Failed to save plan input: ${planInputResult.error.message}`);
    }

    // 3. Generate AI plan with OpenAI
    const prompt = `
Generate a detailed preventive maintenance (PM) plan for the following asset:

- Asset Name: ${planData.name}
- Model: ${planData.model}
- Serial Number: ${planData.serial}
- Asset Category: ${planData.category}
- Usage Hours: ${planData.hours || 0} hours
- Usage Cycles: ${planData.cycles || 0} cycles
- Environmental Conditions: ${planData.environment}
- Date of Plan Start: ${planData.date_of_plan_start || new Date().toISOString().split('T')[0]}

Use the manufacturer's user manual to determine recommended maintenance tasks and intervals. If the manual is not available, infer recommendations from best practices for similar assets in the same category. Be as detailed as possible in the instructions.

**Usage Insights**  
- Provide a concise write-up (in a field named "usage_insights") that analyzes this asset's current usage profile (${planData.hours || 0} hours and ${planData.cycles || 0} cycles), noting the typical outages or failure modes that occur at this stage in the asset's life.

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
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in preventive maintenance planning. Always return pure JSON without any markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API call failed: ${openaiResponse.status} ${openaiResponse.statusText}`);
    }

    const result = await openaiResponse.json();
    let rawContent = result.choices[0].message.content;

    console.log('🧠 Raw OpenAI response:', rawContent);

    // Clean the response
    if (rawContent.includes('```json')) {
      rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    if (rawContent.includes('```')) {
      rawContent = rawContent.replace(/```\s*/g, '');
    }
    rawContent = rawContent.trim();

    let parsedPlan;
    try {
      const parsed = JSON.parse(rawContent);
      parsedPlan = parsed.maintenance_plan || [];
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError);
      throw new Error('AI returned invalid JSON format');
    }

    // Add asset info to each task
    parsedPlan.forEach(task => {
      task.asset_name = planData.name;
      task.asset_model = planData.model;
    });

    // 4. Save AI results to database
    if (parsedPlan.length > 0) {
      const resultsToInsert = parsedPlan.map(task => ({
        pm_plan_id: planInputResult.data.id,
        task_name: task.task_name,
        maintenance_interval: task.maintenance_interval,
        instructions: task.instructions, // Keep as array for jsonb
        reason: task.reason,
        engineering_rationale: task.engineering_rationale,
        safety_precautions: task.safety_precautions,
        common_failures_prevented: task.common_failures_prevented,
        usage_insights: task.usage_insights,
        scheduled_dates: task.scheduled_dates || null
      }));

      const tasksResult = await supabase
        .from('pm_tasks')
        .insert(resultsToInsert)
        .select();

      if (tasksResult.error) {
        console.error('Error saving tasks:', tasksResult.error);
        // Don't fail the whole request if task saving fails
      }
    }

    console.log('✅ PM plan generated successfully');
    
    res.json({
      success: true,
      data: parsedPlan,
      planId: planInputResult.data.id
    });

  } catch (error) {
    console.error('❌ Error generating PM plan:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate PM plan' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;