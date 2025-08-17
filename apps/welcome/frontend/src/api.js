// Frontend api.js - Direct Supabase + Backend AI calls
import { createClient } from "@supabase/supabase-js";

// Supabase client (safe with anon key) - EXPORTED so other files can use same instance
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


// Backend URL for AI calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://arctecfox-mono.onrender.com');

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
// ✅ Fetch asset types from the "dim_assets" table
// This table should contain asset_type_id and asset_name
// export async function fetchAssetTypes() {
//   const { data, error } = await supabase
//     .from("dim_assets")
//     .select("asset_type_id, asset_name")
//     .order("asset_name");

//   if (error) throw error;
//   return data;
// }


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
    
    // Step 2: Insert PM plan with only plan-specific data (no asset duplication)
    const planInsertData = {
      child_asset_id: planData.child_asset_id || null, // Link to child asset (required)
      created_by: userId, // Use the ID from users table
      plan_start_date: planData.date_of_plan_start || new Date().toISOString().split('T')[0], // Required field
      status: 'Current', // Set status as Current for new plans
      site_id: planData.siteId || null, // Add site ID for easy querying
      version: 1, // Plan version
    };
    
    // Asset data will be retrieved via JOIN with child_assets and parent_assets tables

    console.log('🗃️ Saving PM plan with child asset ID:', {
      child_asset_id: planInsertData.child_asset_id,
      plan_start_date: planInsertData.plan_start_date,
      status: planInsertData.status,
      site_id: planInsertData.site_id
    });

    // Note: Manual data is stored separately in the loaded_manuals table
    // and linked via asset_id, so we don't need to duplicate it in pm_plans
    if (planData.userManual) {
      console.log('📎 Manual data available but stored separately:', planData.userManual.fileName);
    }

    const { data, error } = await supabase
      .from('pm_plans')
      .insert([planInsertData])
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

// Helper function to parse maintenance interval (e.g., "3 months" -> 3, "annually" -> 12)
export const parseMaintenanceInterval = (intervalStr) => {
  console.log(`🔍 parseMaintenanceInterval: input="${intervalStr}"`);
  
  if (!intervalStr) {
    console.log(`🔍 No interval provided, returning 0`);
    return 0;
  }
  
  const interval = intervalStr.toLowerCase().trim();
  console.log(`🔍 Cleaned interval: "${interval}"`);
  
  // Check for text-based intervals first
  if (interval.includes('annual') || interval.includes('yearly')) {
    console.log(`🔍 Matched annual/yearly -> 12 months`);
    return 12; // Annually = 12 months
  }
  if (interval.includes('biannual') || interval.includes('semi-annual') || interval.includes('twice yearly')) {
    console.log(`🔍 Matched biannual -> 6 months`);
    return 6; // Biannually = 6 months
  }
  if (interval.includes('quarter')) {
    console.log(`🔍 Matched quarterly -> 3 months`);
    return 3; // Quarterly = 3 months
  }
  if (interval.includes('month')) {
    // Handle "monthly" or "# months"
    if (interval === 'monthly' || interval === 'month') {
      console.log(`🔍 Matched monthly -> 1 month`);
      return 1; // Monthly = 1 month
    }
    
    // Extract number from various formats: "# months", "every # months", "3 months", etc.
    let cleaned = interval
      .replace(/every\s+/gi, '') // Remove "every" prefix
      .replace(/months?/gi, '') // Remove "month" or "months"
      .replace(/or.*$/gi, '') // Remove everything after "or" (like "or 5000 miles")
      .trim();
    
    // Extract the first number found
    const numberMatch = cleaned.match(/\d+/);
    const result = numberMatch ? parseInt(numberMatch[0]) : 1;
    
    console.log(`🔍 Extracted number from "${interval}" -> cleaned="${cleaned}" -> match="${numberMatch ? numberMatch[0] : 'none'}" -> ${result} months`);
    return result;
  }
  if (interval.includes('week')) {
    // Handle weekly, biweekly, etc.
    if (interval === 'weekly' || interval === 'week') {
      return 0.25; // Weekly ≈ 0.25 months
    }
    if (interval.includes('biweek') || interval.includes('bi-week')) {
      return 0.5; // Biweekly ≈ 0.5 months
    }
  }
  
  // Try to parse as a plain number (assuming months)
  const parsed = parseInt(interval);
  if (!isNaN(parsed)) {
    console.log(`🔍 Parsed as number: ${parsed} months`);
    return parsed;
  }
  
  // Default to 0 if unable to parse
  console.warn(`⚠️ Unable to parse maintenance interval: "${intervalStr}", defaulting to 0`);
  return 0;
};

// Helper function to adjust date for weekends
export const adjustForWeekend = (date) => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) { // Sunday
    date.setDate(date.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    date.setDate(date.getDate() - 1);
  }
  return date;
};

// Calculate due date based on start date and interval
export const calculateDueDate = (startDate, intervalMonths) => {
  console.log(`🔍 calculateDueDate: startDate=${startDate}, intervalMonths=${intervalMonths}`);
  const date = new Date(startDate);
  console.log(`🔍 Parsed start date:`, date);
  
  // Handle fractional months (for weekly/biweekly)
  if (intervalMonths < 1) {
    // Convert fractional months to days (approximate: 1 month = 30 days)
    const days = Math.round(intervalMonths * 30);
    console.log(`🔍 Adding ${days} days for fractional month`);
    date.setDate(date.getDate() + days);
  } else {
    // Handle whole months
    console.log(`🔍 Adding ${Math.floor(intervalMonths)} months`);
    date.setMonth(date.getMonth() + Math.floor(intervalMonths));
  }
  
  const beforeWeekendAdjust = date.toISOString().split('T')[0];
  const finalDate = adjustForWeekend(date).toISOString().split('T')[0];
  console.log(`🔍 Before weekend adjust: ${beforeWeekendAdjust}, After: ${finalDate}`);
  
  return finalDate;
};

// Recalculate task_signoff due dates when plan_start_date changes
export const recalculateTaskSignoffDates = async (childAssetId, newStartDate) => {
  try {
    console.log('📅 Recalculating task_signoff dates for child asset:', childAssetId);
    
    // Get all PM plans for this child asset
    const { data: plans, error: plansError } = await supabase
      .from('pm_plans')
      .select('id')
      .eq('child_asset_id', childAssetId)
      .eq('status', 'Current');
    
    if (plansError || !plans || plans.length === 0) {
      console.log('No current PM plans found for child asset');
      return;
    }
    
    // Get all tasks for these plans
    const planIds = plans.map(p => p.id);
    const { data: tasks, error: tasksError } = await supabase
      .from('pm_tasks')
      .select('id, maintenance_interval')
      .in('pm_plan_id', planIds);
    
    if (tasksError || !tasks || tasks.length === 0) {
      console.log('No tasks found for PM plans');
      return;
    }
    
    // Update each task_signoff record with new due date
    for (const task of tasks) {
      const intervalMonths = parseMaintenanceInterval(task.maintenance_interval);
      const newDueDate = intervalMonths > 0 
        ? calculateDueDate(newStartDate, intervalMonths)
        : calculateDueDate(newStartDate, 1);
      
      const { error: updateError } = await supabase
        .from('task_signoff')
        .update({ 
          due_date: newDueDate
        })
        .eq('task_id', task.id)
        .is('comp_date', null);
      
      if (updateError) {
        console.error('Error updating task_signoff due date:', updateError);
      }
    }
    
    console.log('✅ Recalculated due dates for', tasks.length, 'tasks');
  } catch (error) {
    console.error('Error recalculating task_signoff dates:', error);
  }
};

// Create initial task_signoff records when PM plan is created
const createInitialTaskSignoffs = async (pmPlanId, tasks) => {
  try {
    console.log('📝 Creating initial task_signoff records for PM plan:', pmPlanId);
    
    // Get the PM plan with child asset details
    const { data: planData, error: planError } = await supabase
      .from('pm_plans')
      .select('*, child_assets!inner(plan_start_date)')
      .eq('id', pmPlanId)
      .single();
    
    if (planError) {
      console.error('Error fetching PM plan:', planError);
      return;
    }
    
    const planStartDate = planData?.child_assets?.plan_start_date || new Date().toISOString().split('T')[0];
    console.log('📅 Using plan start date:', planStartDate);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create signoff records for each task
    const signoffRecords = tasks.map(task => {
      const intervalMonths = parseMaintenanceInterval(task.maintenance_interval);
      const dueDate = intervalMonths > 0 
        ? calculateDueDate(planStartDate, intervalMonths)
        : calculateDueDate(planStartDate, 1); // Default to 1 month if no interval
      
      console.log(`📋 Task: ${task.task_name}, Interval: ${task.maintenance_interval}, Months: ${intervalMonths}, Due: ${dueDate}`);
      
      return {
        task_id: task.id,
        due_date: dueDate,
        scheduled_date: dueDate, // Set scheduled_date = due_date initially
        scheduled_time: null, // No time scheduled yet
        tech_id: null, // No technician assigned yet
        total_expense: null, // No expense yet
        comp_date: null, // Not completed yet
        status: 'pending' // Set initial status as pending
      };
    });
    
    if (signoffRecords.length > 0) {
      console.log('📝 Attempting to insert signoff records:', signoffRecords);
      
      const { data, error } = await supabase
        .from('task_signoff')
        .insert(signoffRecords)
        .select();
      
      if (error) {
        console.error('❌ Error creating task_signoff records:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Failed records:', JSON.stringify(signoffRecords, null, 2));
      } else {
        console.log('✅ Created', data.length, 'task_signoff records');
      }
    }
  } catch (error) {
    console.error('Error in createInitialTaskSignoffs:', error);
  }
};

export const savePMPlanResults = async (pmPlanId, aiGeneratedPlan, criticality = 'Medium') => {
  try {
    console.log('💾 Saving PM plan results to database:', { pmPlanId, taskCount: aiGeneratedPlan.length, criticality });
    
    // Debug: Check if consumables are present in AI generated plan
    console.log('🔍 FRONTEND: Checking consumables in AI plan:');
    aiGeneratedPlan.forEach((task, index) => {
      console.log(`  Task ${index + 1}: ${task.task_name} - consumables:`, task.consumables);
    });
    
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
        : task.scheduled_dates || null,
      est_minutes: task.time_to_complete || null,
      tools_needed: task.tools_needed || null,
      no_techs_needed: task.number_of_technicians || 1,
      consumables: task.consumables || null,
      criticality: criticality // Add criticality field
    }));

    const { data, error } = await supabase
      .from('pm_tasks')
      .insert(resultsToInsert)
      .select();
    
    if (error) throw error;
    
    console.log('✅ PM plan results saved successfully:', data.length, 'tasks saved');
    
    // Debug: Check what was actually saved to database
    console.log('🔍 FRONTEND: First saved task consumables:', data[0]?.consumables);
    
    // Create task_signoff records for each task
    await createInitialTaskSignoffs(pmPlanId, data);
    
    return data;
  } catch (error) {
    console.error("❌ Error saving PM plan results:", error);
    throw error;
  }
};

// ✅ Secure AI call to backend with authentication
export const generateAIPlan = async (planData) => {
  try {
    console.log('🤖 Generating AI plan via secure backend:', planData);
    console.log('🔍 Backend URL:', BACKEND_URL);
    console.log('🔍 Full URL:', `${BACKEND_URL}/api/generate-ai-plan`);

    // Get current session for auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication required to generate AI plans');
    }

    const response = await fetch(`${BACKEND_URL}/api/generate-ai-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
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
    
    // 4. Save AI results with criticality (direct to Supabase)
    const criticality = planData.criticality || 'Medium'; // Get criticality from planData
    await savePMPlanResults(savedPlanInput.id, aiGeneratedPlan, criticality);
    
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
      .select(`
        *,
        child_assets (
          id,
          name,
          make,
          model,
          serial_number,
          category,
          operating_hours,
          addtl_context,
          parent_assets!parent_asset_id (
            id,
            name
          )
        )
      `)
      .eq('status', 'Current')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error fetching PM plans:", error);
    throw error;
  }
};

// Fetch existing PM plans for a specific child asset (all plans are for child assets only)
export const fetchPMPlansByAsset = async (parentAssetId, childAssetId = null) => {
  try {
    console.log('🔍 Fetching PM plans for child asset:', { parentAssetId, childAssetId });
    
    // Since all plans are for child assets only, we only search when childAssetId is provided
    if (!childAssetId) {
      console.log('❌ No child asset ID provided - returning empty (parent assets have no direct plans)');
      return [];
    }
    
    console.log('🔍 Searching by child_asset_id:', childAssetId);
    
    // First, get the PM plans (simplified query without JOINs)
    const { data: plans, error: plansError } = await supabase
      .from('pm_plans')
      .select('*')
      .eq('child_asset_id', childAssetId)
      .eq('status', 'Current')
      .order('created_at', { ascending: false });
    
    if (plansError) {
      console.error('❌ Error fetching pm_plans:', plansError);
      throw plansError;
    }

    if (!plans || plans.length === 0) {
      console.log('✅ No PM plans found for child asset');
      return [];
    }

    console.log('✅ Found PM plans:', plans.length);

    // Get the tasks for each plan
    const plansWithTasks = await Promise.all(
      plans.map(async (plan) => {
        const { data: tasks, error: tasksError } = await supabase
          .from('pm_tasks')
          .select('*')
          .eq('pm_plan_id', plan.id)
          .order('created_at', { ascending: true });

        if (tasksError) {
          console.error('❌ Error fetching tasks for plan:', plan.id, tasksError);
          return { ...plan, pm_tasks: [] };
        }

        return { ...plan, pm_tasks: tasks || [] };
      })
    );

    console.log('✅ Plans with tasks loaded:', plansWithTasks.length);
    return plansWithTasks;

  } catch (error) {
    console.error("❌ Error fetching PM plans by asset:", error);
    return []; // Return empty array instead of throwing to prevent UI breaks
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

// Fetch user roles based on the database schema
export const fetchUserRoles = async (userId) => {
  try {
    console.log('🔍 Fetching user roles for user:', userId);
    
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Extract role names from the response
    const roleNames = data.map(item => item.roles.name);
    console.log('✅ User roles fetched:', roleNames);
    return roleNames;
  } catch (error) {
    console.error("❌ Error fetching user roles:", error);
    throw error;
  }
};

// Will be defined after the new site-based functions

// Fetch all available roles
export const fetchAllRoles = async () => {
  try {
    console.log('🔑 Fetching all roles');
    
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .order('name');
    
    if (error) throw error;
    
    console.log('✅ All roles fetched:', data);
    return data;
  } catch (error) {
    console.error("❌ Error fetching roles:", error);
    throw error;
  }
};

// Add role to user
export const addUserRole = async (userId, roleId) => {
  try {
    console.log('➕ Adding role to user:', { userId, roleId });
    
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }])
      .select();
    
    if (error) throw error;
    
    console.log('✅ Role added to user:', data);
    return data;
  } catch (error) {
    console.error("❌ Error adding role to user:", error);
    throw error;
  }
};

// Remove role from user
export const removeUserRole = async (userId, roleId) => {
  try {
    console.log('➖ Removing role from user:', { userId, roleId });
    
    const { data, error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ Role removed from user:', data);
    return data;
  } catch (error) {
    console.error("❌ Error removing role from user:", error);
    throw error;
  }
};

// Update user details
export const updateUser = async (userId, updates) => {
  try {
    console.log('✏️ Updating user:', { userId, updates });
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User updated:', data);
    return data;
  } catch (error) {
    console.error("❌ Error updating user:", error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    console.log('🗑️ Deleting user:', userId);
    
    // First delete user roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    // Then delete user
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User deleted:', data);
    return data;
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    throw error;
  }
};

// Note: RLS policies need to be updated - see suggested policy updates below

// These deprecated functions are now defined at the end of the file

// ===== TEMPORARY MIGRATION HELPER =====
// Helper function to check if user needs migration from company_users to site_users
export const checkAndMigrateUser = async (userId) => {
  try {
    console.log('🔄 Checking if user needs migration:', userId);
    
    // Check if user exists in site_users
    const { data: siteUserData, error: siteUserError } = await supabase
      .from('site_users')
      .select('id')
      .eq('user_id', userId);
    
    if (siteUserError) {
      console.error('Error checking site_users (table might not exist):', siteUserError);
      
      // If site_users table doesn't exist or has permission issues,
      // we'll use the company_users data directly for now
      console.log('🔄 Falling back to company_users for admin checks');
      return await fallbackToCompanyUsers(userId);
    }
    
    if (siteUserData && siteUserData.length > 0) {
      console.log('✅ User already exists in site_users');
      return true;
    }
    
    console.log('🔍 User needs migration - checking company_users...');
    
    // Check if user exists in old company_users table
    const { data: companyUserData, error: companyUserError } = await supabase
      .from('company_users')
      .select(`
        company_id,
        role_id,
        companies (
          id,
          name
        )
      `)
      .eq('user_id', userId);
    
    if (companyUserError) {
      console.error('Error checking company_users:', companyUserError);
      return false;
    }
    
    if (!companyUserData || companyUserData.length === 0) {
      console.log('❌ User not found in company_users either');
      return false;
    }
    
    console.log('🏢 Found user in company_users:', companyUserData);
    
    // For each company, find the first site and migrate user there
    for (const companyUser of companyUserData) {
      const companyId = companyUser.company_id;
      
      // Get first site for this company
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .limit(1);
      
      if (sitesError) {
        console.error('Error fetching sites:', sitesError);
        continue;
      }
      
      if (!sites || sites.length === 0) {
        console.log(`❌ No sites found for company ${companyId}, creating default site...`);
        
        // Create a default site for this company
        const { data: newSite, error: createSiteError } = await supabase
          .from('sites')
          .insert([{
            name: `${companyUser.companies.name} - Main Site`,
            company_id: companyId,
            description: 'Default site created during migration'
          }])
          .select()
          .single();
        
        if (createSiteError) {
          console.error('Error creating default site:', createSiteError);
          continue;
        }
        
        console.log('✅ Created default site:', newSite);
        sites[0] = newSite;
      }
      
      const siteId = sites[0].id;
      
      // Migrate user to site_users
      const { data: migratedUser, error: migrationError } = await supabase
        .from('site_users')
        .insert([{
          user_id: userId,
          site_id: siteId,
          role_id: companyUser.role_id
        }])
        .select();
      
      if (migrationError) {
        console.error('Error migrating user to site_users:', migrationError);
        continue;
      }
      
      console.log('✅ Successfully migrated user to site_users:', migratedUser);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error in migration:', error);
    return false;
  }
};

// ===== SITES MANAGEMENT =====

// Fetch all sites for a company
export const fetchCompanySites = async (companyId) => {
  try {
    console.log('🏢 Fetching sites for company:', companyId);
    
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    
    console.log('✅ Company sites fetched:', data);
    return data;
  } catch (error) {
    console.error("❌ Error fetching company sites:", error);
    throw error;
  }
};

// Create a new site
export const createSite = async (siteData) => {
  try {
    console.log('➕ Creating new site:', siteData);
    
    const { data, error } = await supabase
      .from('sites')
      .insert([{
        name: siteData.name,
        company_id: siteData.companyId,
        location: siteData.location || null,
        description: siteData.description || null,
        plan_limit: siteData.plan_limit || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Site created:', data);
    return data;
  } catch (error) {
    console.error("❌ Error creating site:", error);
    throw error;
  }
};

// Update a site
export const updateSite = async (siteId, updates) => {
  try {
    console.log('✏️ Updating site:', { siteId, updates });
    
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', siteId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Site updated:', data);
    return data;
  } catch (error) {
    console.error("❌ Error updating site:", error);
    throw error;
  }
};

// Delete a site
export const deleteSite = async (siteId) => {
  try {
    console.log('🗑️ Deleting site:', siteId);
    
    const { data, error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ Site deleted:', data);
    return data;
  } catch (error) {
    console.error("❌ Error deleting site:", error);
    throw error;
  }
};

// ===== SITE_USERS MANAGEMENT =====

// Fetch users for a specific site
export const fetchSiteUsers = async (siteId) => {
  try {
    console.log('👥 Fetching users for site:', siteId);
    
    // Step 1: Get basic site_users data first
    const { data: siteUsersData, error: siteUsersError } = await supabase
      .from('site_users')
      .select('id, user_id, role_id, can_edit, created_at')
      .eq('site_id', siteId);
    
    if (siteUsersError) {
      console.error("❌ Site users query error:", {
        message: siteUsersError.message,
        details: siteUsersError.details,
        hint: siteUsersError.hint,
        code: siteUsersError.code,
        fullError: siteUsersError
      });
      throw siteUsersError;
    }
    
    if (!siteUsersData || siteUsersData.length === 0) {
      console.log('📭 No users found for site:', siteId);
      return [];
    }
    
    console.log('✅ Raw site_users data:', siteUsersData);
    
    // Step 2: Get user details for each user_id
    const userIds = siteUsersData.map(su => su.user_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .in('id', userIds);
    
    if (usersError) {
      console.error("❌ Users query error:", usersError);
      // Don't throw here, continue with partial data
    }
    
    // Step 3: Get role details for each role_id
    const roleIds = siteUsersData.map(su => su.role_id).filter(Boolean);
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .in('id', roleIds);
    
    if (rolesError) {
      console.error("❌ Roles query error:", rolesError);
      // Don't throw here, continue with partial data
    }
    
    // Step 4: Combine all data
    const usersWithRoles = siteUsersData.map(siteUser => {
      const user = usersData?.find(u => u.id === siteUser.user_id);
      const role = rolesData?.find(r => r.id === siteUser.role_id);
      
      return {
        id: siteUser.id, // site_users id (for editing site-specific properties)
        user_id: siteUser.user_id, // actual user id
        email: user?.email || 'Unknown',
        full_name: user?.full_name || '',
        created_at: user?.created_at || siteUser.created_at,
        roles: role ? [role.name] : [],
        roleId: siteUser.role_id,
        can_edit: siteUser.can_edit || false
      };
    });
    
    console.log('✅ Site users with details:', usersWithRoles);
    return usersWithRoles;
  } catch (error) {
    console.error("❌ Error fetching site users:", error);
    throw error;
  }
};

// Fetch all sites with company info (for dropdowns)
export const fetchAllSitesWithCompanies = async () => {
  try {
    console.log('🌍 Fetching all sites with company info');
    
    // FIXED: Use separate queries to avoid nested RLS issues
    const { data: sitesData, error: sitesError } = await supabase
      .from('sites')
      .select('id, name, location, company_id')
      .order('name');
    
    if (sitesError) throw sitesError;

    if (!sitesData || sitesData.length === 0) {
      console.log('✅ No sites found');
      return [];
    }

    // Get company details separately
    const companyIds = [...new Set(sitesData.map(site => site.company_id).filter(Boolean))];
    let companies = [];
    
    if (companyIds.length > 0) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);
      
      if (companyError) {
        console.warn('Could not fetch companies:', companyError);
        companies = [];
      } else {
        companies = companyData || [];
      }
    }

    // Combine the data manually
    const sitesWithCompanies = sitesData.map(site => ({
      ...site,
      companies: companies.find(c => c.id === site.company_id) || { id: site.company_id, name: 'Unknown Company' }
    }));

    console.log('✅ All sites with companies fetched:', sitesWithCompanies);
    return sitesWithCompanies;
  } catch (error) {
    console.error("❌ Error fetching sites with companies:", error);
    throw error;
  }
};

// Add user to site
export const addUserToSite = async (userId, siteId, roleId = null) => {
  try {
    console.log('➕ Adding user to site:', { userId, siteId, roleId });
    
    const insertData = {
      user_id: userId,
      site_id: siteId
    };
    
    if (roleId) {
      insertData.role_id = roleId;
    }
    
    const { data, error } = await supabase
      .from('site_users')
      .insert([insertData])
      .select();
    
    if (error) throw error;
    
    console.log('✅ User added to site:', data);
    return data;
  } catch (error) {
    console.error("❌ Error adding user to site:", error);
    throw error;
  }
};

// Remove user from site
export const removeUserFromSite = async (userId, siteId) => {
  try {
    console.log('🏢 Removing user from site:', { userId, siteId });
    
    const { data, error } = await supabase
      .from('site_users')
      .delete()
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User removed from site:', data);
    return data;
  } catch (error) {
    console.error("❌ Error removing user from site:", error);
    throw error;
  }
};

// Update user role in site_users table
export const updateUserRoleInSite = async (userId, siteId, roleId) => {
  try {
    console.log('🔄 Updating user role in site:', { userId, siteId, roleId });
    
    const { data, error } = await supabase
      .from('site_users')
      .update({ role_id: roleId })
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User role updated in site:', data);
    return data;
  } catch (error) {
    console.error("❌ Error updating user role in site:", error);
    throw error;
  }
};

// Check if user has admin role in any site
export const isUserSiteAdmin = async (userId) => {
  try {
    console.log('🔍 Checking site admin status for user:', userId);
    
    const { data, error } = await supabase
      .from('site_users')
      .select(`
        id,
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("❌ Error checking site admin status:", error);
      console.error("Error details:", error);
      return false;
    }

    console.log('📊 Site users data:', data);

    if (!data || data.length === 0) {
      console.log('❌ User not found in site_users table');
      return false;
    }

    // Check if any of the user's roles are admin roles
    const isAdmin = data.some(siteUser => {
      return siteUser.roles && ['super_admin', 'company_admin'].includes(siteUser.roles.name);
    });

    console.log('✅ Is user admin?', isAdmin);
    return isAdmin;
    
  } catch (error) {
    console.error("❌ Error checking site admin status:", error);
    return false;
  }
};

// Get user's admin sites with role details
export const getUserAdminSites = async (userId) => {
  try {
    console.log('🔍 Fetching admin sites for user:', userId);
    
    // FIXED: Use simpler query without complex nesting
    const { data, error } = await supabase
      .from('site_users')
      .select(`
        id,
        site_id,
        role_id
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("❌ Error fetching admin sites:", error);
      console.error("Error details:", error);
      return [];
    }

    console.log('📊 All user sites data:', data);

    if (!data || data.length === 0) {
      console.log('❌ No sites found for user');
      return [];
    }

    // Get role details separately to avoid complex joins
    const roleIds = [...new Set(data.map(item => item.role_id).filter(Boolean))];
    let roles = [];
    if (roleIds.length > 0) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id, name')
        .in('id', roleIds);
      roles = roleData || [];
    }

    // Get site details separately
    const siteIds = [...new Set(data.map(item => item.site_id).filter(Boolean))];
    let sites = [];
    if (siteIds.length > 0) {
      const { data: siteData } = await supabase
        .from('sites')
        .select('id, name, company_id')
        .in('id', siteIds);
      sites = siteData || [];
    }

    // Get company details separately
    const companyIds = [...new Set(sites.map(site => site.company_id).filter(Boolean))];
    let companies = [];
    if (companyIds.length > 0) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);
      companies = companyData || [];
    }

    // Combine the data manually
    const adminSites = data
      .map(siteUser => {
        const role = roles.find(r => r.id === siteUser.role_id);
        const site = sites.find(s => s.id === siteUser.site_id);
        const company = site ? companies.find(c => c.id === site.company_id) : null;
        
        return {
          ...siteUser,
          roles: role,
          sites: site ? {
            ...site,
            companies: company
          } : null
        };
      })
      .filter(siteUser => {
        return siteUser.roles && ['super_admin', 'company_admin'].includes(siteUser.roles.name);
      });

    console.log('✅ Admin sites found:', adminSites);
    return adminSites;

  } catch (error) {
    console.error("❌ Error fetching admin sites:", error);
    return [];
  }
};

// Fetch sites that the user is mapped to
export const fetchUserSites = async (userId) => {
  try {
    console.log('🏢 Fetching sites for user:', userId);
    
    const { data, error } = await supabase
      .from('site_users')
      .select(`
        site_id,
        sites (
          id,
          name,
          location,
          companies (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Extract sites from the response
    const sites = data.map(item => ({
      ...item.sites,
      company: item.sites.companies
    })).filter(Boolean);
    
    console.log('✅ User sites fetched:', sites);
    return sites;
  } catch (error) {
    console.error("❌ Error fetching user sites:", error);
    throw error;
  }
};

// Send invitation to user for site access
export const sendInvitation = async (email, siteId, fullName = '', roleId = null) => {
  try {
    console.log('📧 Sending invitation:', { email, siteId, fullName, roleId });
    
    // Get current user to set as invited_by
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Check if user already exists and is linked to site
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingUser) {
      // Check if already linked to this site
      const { data: existingLink } = await supabase
        .from('site_users')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('site_id', siteId)
        .single();
      
      if (existingLink) {
        throw new Error('User is already a member of this site');
      }
    }
    
    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert([{
        email: email,
        site_id: siteId,
        role_id: roleId,
        invited_by: user.id
      }])
      .select();
    
    if (inviteError) {
      if (inviteError.code === '23505') { // Unique constraint violation
        throw new Error('An invitation has already been sent to this email for this site');
      }
      throw inviteError;
    }
    
    // Get auth token for backend call
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication required to send invitations');
    }

    // Call backend to send the email
    const response = await fetch(`${BACKEND_URL}/api/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: email,
        full_name: fullName,
        invitation_token: invitation[0].token,
        site_id: siteId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send invitation email');
    }
    
    console.log('✅ Invitation sent successfully:', invitation[0]);
    return invitation[0];
  } catch (error) {
    console.error("❌ Error sending invitation:", error);
    throw error;
  }
};

// Accept invitation and link user to site
export const acceptInvitation = async (token) => {
  try {
    console.log('🎫 Accepting invitation with token:', token);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to accept invitation');
    
    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*, sites(name, companies(name))')
      .eq('token', token)
      .single();
    
    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation');
    }
    
    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('This invitation has expired');
    }
    
    // Check if already accepted
    if (invitation.accepted_at) {
      throw new Error('This invitation has already been accepted');
    }
    
    // Check if email matches
    if (invitation.email !== user.email) {
      throw new Error('This invitation was sent to a different email address');
    }
    
    // Create site_users entry
    const { error: linkError } = await supabase
      .from('site_users')
      .insert([{
        user_id: user.id,
        site_id: invitation.site_id,
        role_id: invitation.role_id
      }]);
    
    if (linkError && linkError.code !== '23505') { // Ignore if already exists
      throw linkError;
    }
    
    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token);
    
    if (updateError) throw updateError;
    
    console.log('✅ Invitation accepted successfully');
    return invitation;
  } catch (error) {
    console.error("❌ Error accepting invitation:", error);
    throw error;
  }
};

// Legacy function - now redirects to sendInvitation
export const createUserForSite = async (email, siteId, fullName = '', roleId = null) => {
  return sendInvitation(email, siteId, fullName, roleId);
};

// ===== DUAL-TRACK USER MANAGEMENT =====

// Add existing user to site (Track 2 - for users who already have accounts)
export const addExistingUserToSite = async (email, siteId, roleId = null, canEdit = false) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/add-existing-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email,
        site_id: siteId,
        role_id: roleId,
        can_edit: canEdit
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: Failed to add user`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding existing user to site:', error);
    throw error;
  }
};

// Search for existing users within the same company that can be added to a site
export const searchCompanyUsers = async (siteId, searchTerm = '') => {
  try {
    console.log('🔍 Searching company users for site:', siteId, 'term:', searchTerm);
    
    // Step 1: Get site and company info separately
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', siteId)
      .single();

    if (siteError) {
      console.error("❌ Site query error:", {
        message: siteError.message,
        details: siteError.details,
        hint: siteError.hint,
        code: siteError.code
      });
      throw siteError;
    }
    
    if (!siteData) throw new Error('Site not found');

    const companyId = siteData.company_id;
    console.log('✅ Found company ID:', companyId);

    // Step 2: Get company name separately
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const companyName = companyData?.name || 'Unknown Company';

    // Step 3: Get all users already in this site (to exclude them)
    const { data: existingSiteUsers, error: existingError } = await supabase
      .from('site_users')
      .select('user_id')
      .eq('site_id', siteId);

    if (existingError) {
      console.error("❌ Existing site users query error:", existingError);
      throw existingError;
    }

    const existingUserIds = new Set(
      (existingSiteUsers || []).map(su => su.user_id)
    );
    console.log('✅ Found existing user IDs to exclude:', existingUserIds);

    // Step 4: Get all site_users for this company
    const { data: companySiteUsers, error: companySiteUsersError } = await supabase
      .from('site_users')
      .select('user_id, sites!inner(company_id)')
      .eq('sites.company_id', companyId);

    if (companySiteUsersError) {
      console.error("❌ Company site users query error:", companySiteUsersError);
      throw companySiteUsersError;
    }

    // Get unique user IDs from company (excluding current site users)
    const companyUserIds = [...new Set(
      (companySiteUsers || [])
        .map(item => item.user_id)
        .filter(userId => !existingUserIds.has(userId))
    )];
    
    console.log('✅ Found company user IDs:', companyUserIds);

    if (companyUserIds.length === 0) {
      return {
        users: [],
        companyName
      };
    }

    // Step 5: Get user details for company users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', companyUserIds);

    if (usersError) {
      console.error("❌ Users details query error:", usersError);
      throw usersError;
    }

    let filteredUsers = usersData || [];

    // Step 6: Apply search filter if provided
    if (searchTerm && searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(term) ||
        (user.full_name && user.full_name.toLowerCase().includes(term))
      );
    }

    console.log('✅ Filtered users found:', filteredUsers.length);

    return {
      users: filteredUsers.slice(0, 20), // Limit to 20 results
      companyName
    };

  } catch (error) {
    console.error('❌ Error searching company users:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error
    });
    throw error;
  }
};

// ===== END DUAL-TRACK USER MANAGEMENT =====

// ===== PLAN LIMIT VALIDATION =====

// Fetch user's sites for PM planning (with company info)
export const fetchUserSitesForPlanning = async (userId) => {
  try {
    console.log('🏢 Fetching user sites for planning:', userId);
    
    const { data, error } = await supabase
      .from('site_users')
      .select(`
        sites (
          id,
          name,
          plan_limit,
          companies (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Transform data to include company info
    const sites = data.map(item => ({
      id: item.sites.id,
      name: item.sites.name,
      plan_limit: item.sites.plan_limit,
      company: item.sites.companies,
      displayName: `${item.sites.companies.name} - ${item.sites.name}`
    })).filter(Boolean);
    
    console.log('✅ User sites for planning fetched:', sites);
    return sites;
  } catch (error) {
    console.error("❌ Error fetching user sites for planning:", error);
    throw error;
  }
};

// Check if site can create new plans based on plan_limit
export const checkSitePlanLimit = async (siteId, newPlansCount = 1) => {
  try {
    console.log('🔍 Checking plan limit for site:', siteId, 'new plans:', newPlansCount);
    
    // Get site's plan_limit
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('plan_limit, name')
      .eq('id', siteId)
      .single();
    
    if (siteError) throw siteError;
    
    // If plan_limit is null, treat as 0 (no plans allowed)
    const planLimit = siteData.plan_limit || 0;
    
    // Count existing Current plans for this site (don't count Replaced plans)
    const { data: plansData, error: plansError } = await supabase
      .from('pm_plans')
      .select('id')
      .eq('site_id', siteId)
      .eq('status', 'Current');
    
    if (plansError) throw plansError;
    
    const currentPlanCount = plansData?.length || 0;
    const totalAfterNew = currentPlanCount + newPlansCount;
    
    const result = {
      siteName: siteData.name,
      planLimit: planLimit,
      currentPlans: currentPlanCount,
      newPlans: newPlansCount,
      totalAfterNew: totalAfterNew,
      canCreate: totalAfterNew <= planLimit,
      remainingPlans: Math.max(0, planLimit - currentPlanCount)
    };
    
    console.log('✅ Plan limit check result:', result);
    return result;
  } catch (error) {
    console.error("❌ Error checking site plan limit:", error);
    throw error;
  }
};

// Check if user is super admin for plan limit override
export const isUserSuperAdmin = async (userId) => {
  try {
    console.log('🔍 Checking super admin status for user:', userId);
    
    const { data, error } = await supabase
      .from('site_users')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const isSuperAdmin = data.some(item => item.roles?.name === 'super_admin');
    console.log('✅ Is super admin?', isSuperAdmin);
    return isSuperAdmin;
  } catch (error) {
    console.error("❌ Error checking super admin status:", error);
    return false;
  }
};

// Keep other existing functions...
export async function completeUserProfile(profileData) {
  // Your existing implementation
}

export async function isProfileComplete(userId) {
  // Your existing implementation
}

// ===== DEPRECATED FUNCTIONS - FOR BACKWARDS COMPATIBILITY =====
// These wrap the new site-based functions for existing code compatibility

// DEPRECATED: Use isUserSiteAdmin instead
export const isUserAdmin = async (userId) => {
  return await isUserSiteAdmin(userId);
};

// DEPRECATED: Use getUserAdminSites instead  
export const getUserAdminCompanies = async (userId) => {
  return await getUserAdminSites(userId);
};

// DEPRECATED: Use fetchUserSites instead
export const fetchUserCompanies = async (userId) => {
  return await fetchUserSites(userId);
};

// DEPRECATED: Use fetchSiteUsers instead
export const fetchCompanyUsers = async (siteId) => {
  return await fetchSiteUsers(siteId);
};

// DEPRECATED: Use removeUserFromSite instead
export const removeUserFromCompany = async (userId, siteId) => {
  return await removeUserFromSite(userId, siteId);
};

// DEPRECATED: Use updateUserRoleInSite instead
export const updateUserRoleInCompany = async (userId, siteId, roleId) => {
  return await updateUserRoleInSite(userId, siteId, roleId);
};

// DEPRECATED: Use updateUserRoleInSite with roleId=null instead
export const removeUserRoleFromCompany = async (userId, siteId) => {
  return await updateUserRoleInSite(userId, siteId, null);
};

// DEPRECATED: Use createUserForSite instead
export const createUserByEmail = async (email, siteId, fullName = '', roleId = null) => {
  return await createUserForSite(email, siteId, fullName, roleId);
};

// AI-Powered Child Asset Suggestions with authentication
export const suggestChildAssets = async (parentAssetData) => {
  try {
    console.log('🧩 Requesting child asset suggestions for parent:', parentAssetData.name);

    // Get current session for auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication required to suggest child assets');
    }

    const response = await fetch(`${BACKEND_URL}/api/suggest-child-assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        parent_asset_name: parentAssetData.name,
        parent_asset_make: parentAssetData.make,
        parent_asset_model: parentAssetData.model,
        parent_asset_category: parentAssetData.category,
        environment: parentAssetData.environment,
        additional_context: parentAssetData.notes,
        top_n: 8
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('❌ Non-JSON error response:', errorText);
      }
      
      console.error('❌ API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        rawResponse: errorText
      });
      
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Child asset suggestions received:', data.suggestions);
    return data.suggestions;

  } catch (error) {
    console.error('❌ Error requesting child asset suggestions:', error);
    throw error;
  }
};
