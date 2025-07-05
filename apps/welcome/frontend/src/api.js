// Frontend api.js - Direct Supabase + Backend AI calls
import { createClient } from "@supabase/supabase-js";

// Supabase client (safe with anon key) - EXPORTED so other files can use same instance
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Backend URL for AI calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// ✅ Keep all your existing Supabase functions
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

// ✅ UPDATED: Fixed Google OAuth sign-in function
export async function signInWithGoogle() {
  try {
    console.log('🔍 signInWithGoogle called');
    console.log('🔍 Current location:', window.location.href);
    
    // Force redirect to current environment
    const currentOrigin = window.location.origin;
    console.log('🔍 Redirect will go to:', currentOrigin);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentOrigin // This should override the Site URL
      }
    });
    
    console.log('🔍 OAuth response data:', data);
    
    if (error) {
      console.error('❌ OAuth error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ signInWithGoogle error:', error);
    throw error;
  }
}

// ✅ Get current session (useful for OAuth)
export async function getCurrentUserSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
    console.log("✅ User logged out successfully.");
  } catch (error) {
    console.error("❌ Sign-out error:", error.message);
    throw error;
  }
}

// ✅ Enhanced getCurrentUser to check both regular auth and OAuth
export async function getCurrentUser() {
  try {
    // First check for OAuth session
    const session = await getCurrentUserSession();
    if (session?.user) {
      return session.user;
    }
    
    // Then check regular auth
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user || null;
  } catch (error) {
    console.error("❌ Error getting current user:", error.message);
    return null;
  }
}

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

export const savePMPlanInput = async (planData) => {
  try {
    console.log('💾 Saving PM plan input to database:', planData);
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('User not authenticated');
    if (!user) throw new Error('No authenticated user found');
    
    console.log('👤 Current user email:', user.email);
    
    // Step 1: Check if user exists in users table
    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (userLookupError && userLookupError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, other errors are actual problems
      throw new Error(`Error looking up user: ${userLookupError.message}`);
    }
    
    let userId;
    
    if (existingUser) {
      // User exists, use their ID
      userId = existingUser.id;
      console.log('✅ Found existing user with ID:', userId);
    } else {
      // User doesn't exist, create new user record
      console.log('📝 Creating new user record for:', user.email);
      
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert([{
          id: user.id, // Use the Supabase auth user ID
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          created_at: new Date().toISOString(),
        }])
        .select('id')
        .single();
      
      if (createUserError) {
        throw new Error(`Error creating user: ${createUserError.message}`);
      }
      
      userId = newUser.id;
      console.log('✅ Created new user with ID:', userId);
    }
    
    // Step 2: Insert PM plan with the user ID
    const { data, error } = await supabase
      .from('pm_plans')
      .insert([{
        asset_name: planData.name,
        asset_model: planData.model,
        serial_no: planData.serial,
        eq_category: planData.category,
        op_hours: parseInt(planData.hours) || 0,
        additional_context: planData.additional_context || null,
        env_desc: planData.environment,
        plan_start_date: planData.date_of_plan_start || null,
        created_by: userId, // Use the ID from users table
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ PM plan input saved successfully with user ID:', userId);
    return data;
  } catch (error) {
    console.error("❌ Error saving PM plan input:", error);
    throw error;
  }
};

export const savePMPlanResults = async (pmPlanId, aiGeneratedPlan) => {
  try {
    console.log('💾 Saving PM plan results to database:', { pmPlanId, taskCount: aiGeneratedPlan.length });
    
    const resultsToInsert = aiGeneratedPlan.map(task => ({
      pm_plan_id: pmPlanId,
      task_name: task.task_name,
      maintenance_interval: task.maintenance_interval,
      instructions: task.instructions,
      reason: task.reason,
      engineering_rationale: task.engineering_rationale,
      safety_precautions: task.safety_precautions,
      common_failures_prevented: task.common_failures_prevented,
      usage_insights: task.usage_insights,
      scheduled_dates: Array.isArray(task.scheduled_dates) 
        ? task.scheduled_dates 
        : task.scheduled_dates || null
    }));

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

// ✅ Secure AI call to backend
export const generateAIPlan = async (planData) => {
  try {
    console.log('🤖 Generating AI plan via secure backend:', planData);
    console.log('🔍 Backend URL:', BACKEND_URL);
    console.log('🔍 Full URL:', `${BACKEND_URL}/api/generate-ai-plan`);

    const response = await fetch(`${BACKEND_URL}/api/generate-ai-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Backend API call failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error('AI plan generation failed');
    }

    console.log('✅ AI plan generated successfully via backend');
    return result.data;
    
  } catch (error) {
    console.error("❌ Error generating AI plan:", error);
    throw error;
  }
};

// ✅ Combined function using both direct DB + secure AI
export const generatePMPlan = async (planData) => {
  try {
    console.log('🚀 Starting PM plan generation process');
    
    // 1. Save lead (direct to Supabase)
    await savePMLead(planData.email || "test@example.com", planData.company || "Test Company");
    
    // 2. Save plan input (direct to Supabase)
    const savedPlanInput = await savePMPlanInput(planData);
    
    // 3. Generate AI plan (secure backend call)
    const aiGeneratedPlan = await generateAIPlan(planData);
    
    // 4. Save AI results (direct to Supabase)
    await savePMPlanResults(savedPlanInput.id, aiGeneratedPlan);
    
    console.log('✅ Complete PM plan process finished');
    return aiGeneratedPlan;
    
  } catch (error) {
    console.error("❌ Error in PM plan generation process:", error);
    throw error;
  }
};

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

// Keep other existing functions...
export async function completeUserProfile(profileData) {
  // Your existing implementation
}

export async function isProfileComplete(userId) {
  // Your existing implementation
}
