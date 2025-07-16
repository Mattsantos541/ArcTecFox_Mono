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
    
    // Step 2: Insert PM plan with the user ID and company ID
    const planInsertData = {
      asset_name: planData.name,
      asset_model: planData.model,
      serial_no: planData.serial,
      eq_category: planData.category,
      op_hours: parseInt(planData.hours) || 0,
      additional_context: planData.additional_context || null,
      env_desc: planData.environment,
      plan_start_date: planData.date_of_plan_start || null,
      created_by: userId, // Use the ID from users table
      company_id: planData.companyId || null, // Add company ID
    };

    // Add user manual data if provided
    if (planData.userManual) {
      planInsertData.user_manual_path = planData.userManual.filePath;
      planInsertData.user_manual_filename = planData.userManual.fileName;
      planInsertData.user_manual_original_name = planData.userManual.originalName;
      planInsertData.user_manual_file_size = planData.userManual.fileSize;
      planInsertData.user_manual_file_type = planData.userManual.fileType;
      planInsertData.user_manual_uploaded_at = planData.userManual.uploadedAt;
      
      console.log('📎 Including user manual data:', planData.userManual.fileName);
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

export const savePMPlanResults = async (pmPlanId, aiGeneratedPlan) => {
  try {
    console.log('💾 Saving PM plan results to database:', { pmPlanId, taskCount: aiGeneratedPlan.length });
    
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
      consumables: task.consumables || null
    }));

    const { data, error } = await supabase
      .from('pm_tasks')
      .insert(resultsToInsert)
      .select();
    
    if (error) throw error;
    
    console.log('✅ PM plan results saved successfully:', data.length, 'tasks saved');
    
    // Debug: Check what was actually saved to database
    console.log('🔍 FRONTEND: First saved task consumables:', data[0]?.consumables);
    
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

// Check if user has admin role in any company
export const isUserAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        role_id,
        roles!inner (
          name
        )
      `)
      .eq('user_id', userId)
      .in('roles.name', ['super_admin', 'company_admin']);

    if (error) {
      console.error("❌ Error checking admin status:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("❌ Error checking admin status:", error);
    return false;
  }
};

// Get user's admin companies with role details
export const getUserAdminCompanies = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        company_id,
        companies!inner (
          id,
          name
        ),
        roles!inner (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .in('roles.name', ['super_admin', 'company_admin']);

    if (error) {
      console.error("❌ Error fetching admin companies:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Error fetching admin companies:", error);
    return [];
  }
};

// Fetch companies that the user is mapped to
export const fetchUserCompanies = async (userId) => {
  try {
    console.log('🏢 Fetching companies for user:', userId);
    
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        company_id,
        companies (
          id,
          name
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Extract companies from the response
    const companies = data.map(item => item.companies).filter(Boolean);
    console.log('✅ User companies fetched:', companies);
    return companies;
  } catch (error) {
    console.error("❌ Error fetching user companies:", error);
    throw error;
  }
};

// Fetch users and their roles for a specific company
export const fetchCompanyUsers = async (companyId) => {
  try {
    console.log('👥 Fetching users for company:', companyId);
    
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        user_id,
        role_id,
        roles (
          id,
          name
        ),
        users (
          id,
          email,
          full_name,
          created_at
        )
      `)
      .eq('company_id', companyId);
    
    if (error) {
      console.error("❌ Supabase error:", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    // Transform data to include role names from company_users table
    const usersWithRoles = data.map(item => ({
      ...item.users,
      roles: item.roles ? [item.roles.name] : [],
      roleId: item.role_id
    }));
    
    console.log('✅ Company users fetched:', usersWithRoles);
    return usersWithRoles;
  } catch (error) {
    console.error("❌ Error fetching company users:", error);
    throw error;
  }
};

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

// Remove user from a specific company
export const removeUserFromCompany = async (userId, companyId) => {
  try {
    console.log('🏢 Removing user from company:', { userId, companyId });
    
    const { data, error } = await supabase
      .from('company_users')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User removed from company:', data);
    return data;
  } catch (error) {
    console.error("❌ Error removing user from company:", error);
    throw error;
  }
};

// Update user role in company_users table
export const updateUserRoleInCompany = async (userId, companyId, roleId) => {
  try {
    console.log('🔄 Updating user role in company:', { userId, companyId, roleId });
    
    const { data, error } = await supabase
      .from('company_users')
      .update({ role_id: roleId })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User role updated in company:', data);
    return data;
  } catch (error) {
    console.error("❌ Error updating user role in company:", error);
    throw error;
  }
};

// Remove user role from company_users table
export const removeUserRoleFromCompany = async (userId, companyId) => {
  try {
    console.log('🔄 Removing user role from company:', { userId, companyId });
    
    const { data, error } = await supabase
      .from('company_users')
      .update({ role_id: null })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ User role removed from company:', data);
    return data;
  } catch (error) {
    console.error("❌ Error removing user role from company:", error);
    throw error;
  }
};

// Create new user by email
export const createUserByEmail = async (email, companyId, fullName = '', roleId = null) => {
  try {
    console.log('➕ Creating new user:', { email, companyId, fullName, roleId });
    
    // First, check if user with this email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      throw checkError;
    }
    
    let userId;
    let userData;
    
    if (existingUser) {
      // User already exists, use existing user
      console.log('👤 User already exists:', existingUser);
      userId = existingUser.id;
      userData = [existingUser];
      
      // Check if user is already linked to this company
      const { data: existingLink, error: linkCheckError } = await supabase
        .from('company_users')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();
      
      if (linkCheckError && linkCheckError.code !== 'PGRST116') {
        throw linkCheckError;
      }
      
      if (existingLink) {
        throw new Error('User is already linked to this company');
      }
    } else {
      // Create new user
      userId = crypto.randomUUID();
      
      const { data: newUserData, error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: email,
          full_name: fullName,
          created_at: new Date().toISOString(),
          profile_completed: false
        }])
        .select();
      
      if (userError) throw userError;
      userData = newUserData;
      console.log('✅ New user created:', userData[0]);
    }
    
    // Create the company-user relationship with role if provided
    const companyUserData = {
      user_id: userId,
      company_id: companyId
    };
    
    if (roleId) {
      companyUserData.role_id = roleId;
    }
    
    const { data: companyUserResult, error: companyUserError } = await supabase
      .from('company_users')
      .insert([companyUserData])
      .select();
    
    if (companyUserError) throw companyUserError;
    
    console.log('✅ User linked to company:', companyUserResult[0]);
    return userData[0];
  } catch (error) {
    console.error("❌ Error creating user:", error);
    throw error;
  }
};

// TEMPORARY: Check current user data structure
export const checkUserDataStructure = async (userId) => {
  try {
    console.log('🔍 Checking user data structure for:', userId);
    
    // Check users table by ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .eq('id', userId);
    
    if (userError) throw userError;
    
    // Check users table by email (for comparison)
    const { data: userByEmail, error: userByEmailError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .eq('email', 'willisreed17@gmail.com');
    
    if (userByEmailError) throw userByEmailError;
    
    // Check company_users table by user ID
    const { data: companyUserData, error: companyUserError } = await supabase
      .from('company_users')
      .select('user_id, company_id')
      .eq('user_id', userId);
    
    if (companyUserError) {
      console.error('❌ Error querying company_users by user_id:', companyUserError);
    }
    
    // Check ALL company_users records to see if table has data
    const { data: allCompanyUsers, error: allCompanyUsersError } = await supabase
      .from('company_users')
      .select('user_id, company_id');
    
    if (allCompanyUsersError) {
      console.error('❌ Error querying all company_users:', allCompanyUsersError);
    }
    
    // Try direct SQL query using RPC function
    const { data: directQueryResult, error: directQueryError } = await supabase
      .rpc('get_user_companies', { user_email: 'willisreed17@gmail.com' })
      .catch(() => ({ data: null, error: 'RPC function not found' }));
    
    console.log('📊 User data by ID:', userData);
    console.log('📊 User data by email:', userByEmail);
    console.log('📊 Company-user relationships by ID:', companyUserData);
    console.log('📊 ALL company_users records:', allCompanyUsers);
    console.log('📊 Direct query result:', directQueryResult);
    console.log('📊 Direct query error:', directQueryError);
    
    return { userData, userByEmail, companyUserData, allCompanyUsers, directQueryResult };
  } catch (error) {
    console.error("❌ Error checking user data structure:", error);
    throw error;
  }
};

// TEMPORARY: Migrate user from old structure to new structure
export const migrateUserToNewStructure = async (userId) => {
  try {
    console.log('🔄 Migrating user to new structure:', userId);
    
    // Get user's current company_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, company_id')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    console.log('📊 User data for migration:', userData);
    
    if (!userData.company_id) {
      console.log('❌ No company_id found for user');
      return null;
    }
    
    console.log('🔍 Found company_id:', userData.company_id);
    
    // Check if relationship already exists in company_users
    const { data: existingRelation, error: checkError } = await supabase
      .from('company_users')
      .select('user_id, company_id')
      .eq('user_id', userId)
      .eq('company_id', userData.company_id);
    
    if (checkError) throw checkError;
    
    console.log('🔍 Existing relations found:', existingRelation);
    
    if (existingRelation.length > 0) {
      console.log('✅ Relationship already exists in company_users');
      return existingRelation[0];
    }
    
    console.log('➕ Creating new relationship in company_users table');
    
    // Create new relationship in company_users table
    const { data: newRelation, error: insertError } = await supabase
      .from('company_users')
      .insert([{
        user_id: userId,
        company_id: userData.company_id
      }])
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }
    
    console.log('✅ User migrated to new structure:', newRelation[0]);
    return newRelation[0];
  } catch (error) {
    console.error("❌ Error migrating user:", error);
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
