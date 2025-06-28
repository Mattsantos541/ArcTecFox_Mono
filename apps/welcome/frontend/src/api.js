import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ✅ Fetch Assets
export const fetchAssets = async () => {
  try {
    const { data, error } = await supabase.from("assets").select("*");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error fetching assets:", error);
    throw error;
  }
};

// ✅ User Authentication Functions
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // ✅ Clear session from local storage
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();

    console.log("✅ User logged out successfully.");
  } catch (error) {
    console.error("❌ Sign-out error:", error.message);
    throw error;
  }
}

// ✅ Get Current User
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user || null;
  } catch (error) {
    console.error("❌ Error getting current user:", error.message);
    return null;
  }
}

// ✅ PM PLAN FUNCTIONS
// Generate PM Plan using OpenAI directly (frontend approach)
export const generatePMPlan = async (planData) => {
  try {
    console.log('🤖 Generating PM plan with AI:', planData);
    
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
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

    if (!response.ok) {
      throw new Error(`OpenAI API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    let rawContent = result.choices[0].message.content;

    console.log('🧠 Raw OpenAI response:', rawContent);

    // Clean the response - remove markdown code blocks if present
    if (rawContent.includes('```json')) {
      rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    if (rawContent.includes('```')) {
      rawContent = rawContent.replace(/```\s*/g, '');
    }

    // Trim any extra whitespace
    rawContent = rawContent.trim();

    let parsedPlan;
    try {
      const parsed = JSON.parse(rawContent);
      parsedPlan = parsed.maintenance_plan || [];
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError);
      console.error('❌ Cleaned content:', rawContent);
      throw new Error('AI returned invalid JSON format');
    }

    // Format the instructions if needed - KEEP AS ARRAY for jsonb storage
    parsedPlan.forEach(task => {
      task.asset_name = planData.name;
      task.asset_model = planData.model;

      // Only format if it's a pipe-separated string, otherwise keep array as-is
      if (typeof task.instructions === 'string' && task.instructions.includes('|')) {
        const steps = task.instructions.split('|').filter(s => s.trim());
        task.instructions = steps.map(step => step.trim()); // Keep as array, don't join to string
      }
      // If it's already an array, keep it as an array - don't convert to string!
    });

    console.log('✅ PM plan generated successfully:', parsedPlan);
    return parsedPlan;
    
  } catch (error) {
    console.error("❌ Error generating PM plan:", error);
    throw error;
  }
};

// Save PM Lead
export const savePMLead = async (email, company) => {
  try {
    console.log('📝 Saving lead data:', { email, company });
    
    const { data, error } = await supabase
      .from('pm_leads')
      .insert([{
        email: email,
        org_name: company,
      }])
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Lead data saved successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving lead:', error);
    throw error;
  }
};

// Save PM Plan Input to Database (for tracking)
export const savePMPlanInput = async (planData) => {
  try {
    console.log('💾 Saving PM plan input to database:', planData);
    
    const { data, error } = await supabase
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
    
    if (error) throw error;
    
    console.log('✅ PM plan input saved successfully:', data);
    return data;
  } catch (error) {
    console.error("❌ Error saving PM plan input:", error);
    throw error;
  }
};

// Save PM Plan Results to Database
export const savePMPlanResults = async (pmPlanId, aiGeneratedPlan) => {
  try {
    console.log('💾 Saving PM plan results to database:', { pmPlanId, taskCount: aiGeneratedPlan.length });
    
    // Prepare the data for batch insert
    const resultsToInsert = aiGeneratedPlan.map(task => ({
      pm_plan_id: pmPlanId,
      task_name: task.task_name,
      maintenance_interval: task.maintenance_interval,
      instructions: task.instructions, // Keep as-is (array or string) - jsonb handles both
      reason: task.reason,
      engineering_rationale: task.engineering_rationale,
      safety_precautions: task.safety_precautions,
      common_failures_prevented: task.common_failures_prevented,
      usage_insights: task.usage_insights,
      scheduled_dates: Array.isArray(task.scheduled_dates) 
        ? task.scheduled_dates // Keep as array for jsonb
        : task.scheduled_dates || null
    }));

    console.log('🔍 Sample data being inserted:', JSON.stringify(resultsToInsert[0], null, 2));

    // Insert all results in a single batch operation
    const { data, error } = await supabase
      .from('pm_tasks')
      .insert(resultsToInsert)
      .select();
    
    if (error) throw error;
    
    console.log('✅ PM plan results saved successfully:', data.length, 'tasks saved');
    return data;
  } catch (error) {
    console.error("❌ Error saving PM plan results:", error);
    throw error;
  }
};

// Get All PM Plans
export const fetchPMPlans = async () => {
  try {
    const { data, error } = await supabase
      .from('pm_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error fetching PM plans:", error);
    throw error;
  }
};

// ✅ Fetch Metrics
export const fetchMetrics = async () => {
  try {
    const { data, error } = await supabase.from("metrics").select("*");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error fetching metrics:", error.message);
    throw error;
  }
};

// ✅ Complete User Profile
export async function completeUserProfile(profileData) {
  try {
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user) throw new Error("No authenticated user");

    // ✅ Step 1: Check if company already exists
    let { data: existingCompany, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("name", profileData.company_name)
      .single();

    if (companyError && companyError.code !== "PGRST116") {
      throw new Error(`Error checking company: ${companyError.message}`);
    }

    let company_id = existingCompany?.id;

    // ✅ Step 2: If company does NOT exist, create it
    if (!company_id) {
      const { data: newCompany, error: insertError } = await supabase
        .from("companies")
        .insert([
          {
            name: profileData.company_name,
            industry: profileData.industry,
            company_size: profileData.company_size,
          },
        ])
        .select("id")
        .single();

      if (insertError) throw new Error(`Error creating company: ${insertError.message}`);
      company_id = newCompany.id; // ✅ Get the newly created company ID
    }

    // ✅ Step 3: Now insert the user with the correct `company_id`
    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: user.user.id,
        email: user.user.email,
        full_name: profileData.full_name,
        role: profileData.role,
        company_id: company_id, // ✅ Ensures the company exists before inserting
        industry: profileData.industry,
        company_size: profileData.company_size,
        company_name: profileData.company_name,
        updated_at: new Date().toISOString(),
        profile_completed: true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("❌ Profile completion error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Profile updated:", data);
    return data;
  } catch (error) {
    console.error("❌ Error in completeUserProfile:", error.message);
    throw error;
  }
}

// ✅ Check if User Profile is Complete
export async function isProfileComplete(userId) {
  try {
    if (!userId) throw new Error("User ID is required to check profile status");

    const { data, error } = await supabase
      .from("users")
      .select("profile_completed")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return data?.profile_completed ?? false; // ✅ Safe check to avoid errors
  } catch (error) {
    console.error("❌ Error checking profile completion:", error.message);
    throw error;
  }
}