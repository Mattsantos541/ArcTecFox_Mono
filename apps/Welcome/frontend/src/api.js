const API_BASE_URL = 'http://localhost:8000';

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

// Get Current User
export const getCurrentUser = async () => {
  try {
    console.log('👤 Getting current user...');
    
    // For development, return null (no user logged in)
    // You can implement real Supabase auth later
    const user = null;
    
    if (!user) {
      throw new Error('Auth session missing!');
    }
    
    console.log('✅ Current user:', user);
    return user;
  } catch (error) {
    console.error('❌ Error getting current user:', error.message);
    return null; // Return null instead of throwing for auth errors
  }
};

// Login User
export const loginUser = async (email, password) => {
  try {
    console.log('🔐 Logging in user:', email);
    
    // Mock login for development
    const mockUser = {
      id: '123',
      email: email,
      user_metadata: { name: 'Test User' }
    };
    
    console.log('✅ User logged in successfully:', mockUser);
    return { user: mockUser, error: null };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { user: null, error: error.message };
  }
};

// Logout User
export const logoutUser = async () => {
  try {
    console.log('👋 Logging out user...');
    
    // Mock logout
    console.log('✅ User logged out successfully');
    return { error: null };
  } catch (error) {
    console.error('❌ Logout error:', error);
    return { error: error.message };
  }
};

// Sign Up User
export const signUpUser = async (email, password, userData = {}) => {
  try {
    console.log('📝 Signing up user:', email);
    
    // Mock signup
    const mockUser = {
      id: Date.now().toString(),
      email: email,
      user_metadata: userData
    };
    
    console.log('✅ User signed up successfully:', mockUser);
    return { user: mockUser, error: null };
  } catch (error) {
    console.error('❌ Signup error:', error);
    return { user: null, error: error.message };
  }
};

// ============================================================================
// PM PLANNER FUNCTIONS
// ============================================================================

// Generate PM Plan
export const generatePMPlan = async (planData) => {
  try {
    console.log('🚀 Generating PM Plan with data:', planData);
    
    const response = await fetch(`${API_BASE_URL}/api/generate_pm_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ PM Plan generated successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error generating PM plan:', error);
    
    // Return mock data if backend is not available
    const mockPlan = [
      {
        task_name: "Monthly Inspection",
        maintenance_interval: "Monthly",
        reason: "Preventive maintenance",
        instructions: "Visual inspection of all components",
        safety_precautions: "Ensure equipment is powered off",
        engineering_rationale: "Regular inspection prevents unexpected failures",
        common_failures_prevented: "Wear, corrosion, misalignment",
        usage_insights: "Monitor for unusual sounds or vibrations",
        scheduled_dates: ["2025-01-01", "2025-02-01", "2025-03-01"]
      }
    ];
    
    console.log('🔄 Using mock PM plan data');
    return mockPlan;
  }
};

// Save PM Plan Input
export const savePMPlanInput = async (planData) => {
  try {
    console.log('💾 Saving PM plan input to database:', planData);
    
    // Helper function to safely convert to integer
    const safeParseInt = (value) => {
      if (!value || value === '' || isNaN(value)) return null;
      const parsed = parseInt(value);
      return isNaN(parsed) ? null : parsed;
    };

    // Map frontend fields to database column names
    const dbData = {
      asset_name: planData.asset_name || planData.name,
      asset_model: planData.asset_model || planData.model,
      serial_no: planData.serial_no || planData.serial,
      eq_category: planData.eq_category || planData.category,
      op_hours: safeParseInt(planData.op_hours || planData.hours),
      cycles: safeParseInt(planData.cycles),
      env_desc: planData.env_desc || planData.environment,
      plan_start_date: planData.plan_start_date || planData.date_of_plan_start,
      lead_id: planData.lead_id
    };

    // For now, return success with the data
    console.log('✅ PM plan input saved successfully (mock):', dbData);
    return { success: true, data: dbData };
  } catch (error) {
    console.error('❌ Error saving PM plan input:', error);
    throw error;
  }
};

// Save PM Lead
export const savePMLead = async (email, company) => {
  try {
    console.log('📝 Saving lead data:', { email, company });
    
    // Mock lead creation
    const mockLead = { 
      id: Date.now(), 
      email, 
      company,
      created_at: new Date().toISOString()
    };
    
    console.log('✅ Lead data saved successfully (mock):', mockLead);
    return mockLead;
  } catch (error) {
    console.error('❌ Error saving lead:', error);
    throw error;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Check API Health
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error.message);
    return false;
  }
};

// Generic API Call Helper
export const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Export API_BASE_URL for other modules
export { API_BASE_URL };