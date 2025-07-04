// src/api.js
// ✅ Temporary Supabase & API mock for frontend-only development

// Fake supabase client
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      console.log(`🔐 [MOCK] Signing in user: ${email}`);
      return { data: { user: { id: "mock-user-id", email } }, error: null };
    },
    signUp: async ({ email, password }) => {
      console.log(`🆕 [MOCK] Signing up user: ${email}`);
      return { data: { user: { id: "mock-user-id", email } }, error: null };
    },
    signOut: async () => {
      console.log(`🚪 [MOCK] Signing out user`);
      return { error: null };
    },
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: { id: "mock-user-id", email: "mock@example.com" } }, error: null }),
  },
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: [], error: null }),
    order: () => ({ select: async () => ({ data: [], error: null }) }),
    eq: () => ({ select: async () => ({ data: [], error: null }) }),
  }),
};

// ✅ Auth functions
export async function signIn(email, password) {
  return (await supabase.auth.signInWithPassword({ email, password })).data.user;
}

export async function signUp(email, password) {
  return (await supabase.auth.signUp({ email, password })).data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  console.log("✅ [MOCK] Signed out");
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ✅ PM Planner mock functions
export const generatePMPlan = async (planData) => {
  console.log('🤖 [MOCK] Generating PM plan for:', planData.name);
  return [
    {
      task_name: "Mock Task",
      maintenance_interval: "Monthly",
      instructions: "1. Inspect | 2. Clean",
      reason: "Prevent failures",
      engineering_rationale: "Standard practice",
      safety_precautions: "Use gloves",
      common_failures_prevented: "Wear and tear",
      usage_insights: "No significant issues detected.",
      scheduled_dates: ["2025-07-05", "2025-08-05"],
    },
  ];
};

export const savePMPlanInput = async (planData) => {
  console.log('💾 [MOCK] Saving PM plan input:', planData);
  return { id: "mock-pm-id" };
};

export const fetchPMPlans = async () => {
  console.log('📥 [MOCK] Fetching PM plans');
  return [];
};

export const fetchAssets = async () => {
  console.log('📥 [MOCK] Fetching assets');
  return [];
};

export const fetchMetrics = async () => {
  console.log('📥 [MOCK] Fetching metrics');
  return [];
};

// ✅ User Profile mocks
export async function completeUserProfile(profileData) {
  console.log('✅ [MOCK] Completing profile:', profileData);
  return { success: true };
}

export async function isProfileComplete(userId) {
  console.log('✅ [MOCK] Checking profile for user:', userId);
  return true;
}
