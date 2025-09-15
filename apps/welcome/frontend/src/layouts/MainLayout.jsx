import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import { useToSCheck } from '../hooks/useToSCheck';
import { AuthLoading } from '../components/loading/LoadingStates';
import AppLoader from '../components/loading/AppLoader';
import { isUserSiteAdmin, getUserAdminSites } from '../api';
import ToSAcceptanceModal from '../components/ToSAcceptanceModal';
import { Toaster } from '../components/ui/toaster';
import { useState, useEffect, useRef, useCallback } from 'react';

// GoogleLoginButton Component
function GoogleLoginButton({ className = "" }) {
  const { loginWithGoogle, loading } = useAuth();

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (!result.success) {
      console.error('Google login failed:', result.error);
    }
  };

  return (
    <button 
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
}

// Admin Menu Component
function AdminMenu({ adminSites = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const siteNames = adminSites.map(ac => `${ac.sites?.companies?.name || 'Unknown Company'} - ${ac.sites?.name || 'Unknown Site'}`).join(', ');
  const roleNames = [...new Set(adminSites.map(ac => ac.roles?.name).filter(Boolean))].join(', ');
  const isSuperAdmin = adminSites.some(ac => ac.roles?.name === 'super_admin');
  const isCompanyAdmin = adminSites.some(ac => ac.roles?.name === 'company_admin');
  const canManageCompanies = isSuperAdmin || isCompanyAdmin;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        title={`Admin for: ${siteNames}`}
      >
        Menu
        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          {adminSites.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Access</div>
              <div className="text-sm text-gray-700 mt-1">
                <div className="font-medium">{roleNames}</div>
                <div className="text-xs text-gray-500 truncate">{siteNames}</div>
              </div>
            </div>
          )}
          <div className="py-1">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
            >
              Dashboard
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={() => handleNavigation('/admin/users')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              User Management
            </button>
            {canManageCompanies && (
              <button
                onClick={() => handleNavigation('/admin/companies')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Manage Companies/Sites
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => handleNavigation('/admin/super-admins')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Super Admin Management
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared AuthHeader component
function AuthHeader({ onAdminLoadingChange }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSites, setAdminSites] = useState([]);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const lastCheckedUserId = useRef(null);
  const adminStatusCache = useRef(new Map());
  
  // Notify parent component of loading state changes - prevent duplicate calls
  const lastReportedState = useRef(adminCheckLoading);
  useEffect(() => {
    if (onAdminLoadingChange && lastReportedState.current !== adminCheckLoading) {
      onAdminLoadingChange(adminCheckLoading);
      lastReportedState.current = adminCheckLoading;
    }
  }, [adminCheckLoading, onAdminLoadingChange]);

  const checkAdminStatus = useCallback(async () => {
    console.log('🔍 checkAdminStatus called:', {
      userId: user?.id,
      lastCheckedUserId: lastCheckedUserId.current,
      shouldCheck: user?.id && user.id !== lastCheckedUserId.current
    });
    
    if (user?.id && user.id !== lastCheckedUserId.current) {
      // Check cache first for faster loading
      const cached = adminStatusCache.current.get(user.id);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        console.log('⚡ MainLayout: Using cached admin status for:', user.id);
        setIsAdmin(cached.isAdmin);
        setAdminSites(cached.adminSites);
        lastCheckedUserId.current = user.id;
        setAdminCheckLoading(false); // Important: Set loading to false for cached results
        return;
      }
      
      console.log('🔐 MainLayout: Starting admin status check for:', user.id);
      setAdminCheckLoading(true);
      lastCheckedUserId.current = user.id;
      
      try {
        // Run admin checks in parallel for better performance
        const [adminStatus, userAdminSites] = await Promise.all([
          isUserSiteAdmin(user.id),
          getUserAdminSites(user.id)
        ]);
        
        // Cache the results
        adminStatusCache.current.set(user.id, {
          isAdmin: adminStatus,
          adminSites: userAdminSites,
          timestamp: Date.now()
        });
        
        console.log('✅ MainLayout: Admin check complete:', { isAdmin: adminStatus, sitesCount: userAdminSites.length });
        setIsAdmin(adminStatus);
        setAdminSites(userAdminSites);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAdminSites([]);
        // Reset the ref so we can retry later
        lastCheckedUserId.current = null;
      } finally {
        console.log('✅ MainLayout: Admin check loading = false');
        setAdminCheckLoading(false);
        // Force a small delay to ensure state is properly updated
        setTimeout(() => setAdminCheckLoading(false), 100);
      }
    } else if (!user?.id) {
      // Reset state when user logs out
      setIsAdmin(false);
      setAdminSites([]);
      lastCheckedUserId.current = null;
      adminStatusCache.current.clear();
    }
  }, [user?.id]);

  // Only check admin status when user changes and is actually present
  useEffect(() => {
    if (user?.id) {
      checkAdminStatus();
    }
  }, [user?.id]); // Depend directly on user?.id instead of checkAdminStatus

  // This is now handled by unified loading state above

  if (user) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
              ArcTecFox — AI-Powered Preventive Maintenance
            </h1>
            <div className="flex items-center space-x-4">
              {user.user_metadata?.avatar_url && (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-gray-800">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Always visible links */}
            <button
              onClick={() => navigate('/terms-of-service')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline"
            >
              Privacy Policy
            </button>
            {!adminCheckLoading && isAdmin && <AdminMenu adminSites={adminSites} />}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent text-center mb-4">
          ArcTecFox — AI-Powered Preventive Maintenance
        </h1>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Sign in to Access PM Tools
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Sign in with your Google account to access the maintenance planning tools.
          </p>
          <GoogleLoginButton className="mx-auto" />
          <div className="flex justify-center items-center space-x-4 mt-4">
            <button
              onClick={() => navigate('/terms-of-service')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline"
            >
              Terms of Service
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, loading: authLoading } = useAuth();
  const { needsToSAcceptance, loading: tosLoading, markToSAsAccepted } = useToSCheck(user);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  
  // Reduced logging - only log when state actually changes
  const prevState = useRef();
  const currentState = { hasUser: !!user, authLoading, tosLoading, needsToSAcceptance, adminCheckLoading };
  
  if (!prevState.current || JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
    console.log('🏠 MainLayout: State changed:', currentState);
    prevState.current = currentState;
  }
  
  // Add callback to track admin loading changes - only log actual changes
  const handleAdminLoadingChange = useCallback((isLoading) => {
    setAdminCheckLoading(prev => {
      if (prev !== isLoading) {
        console.log('📢 MainLayout: Admin loading changed:', { from: prev, to: isLoading });
      }
      return isLoading;
    });
  }, []);

  const handleToSAccept = () => {
    markToSAsAccepted();
  };

  const handleToSReject = async () => {
    // Log out the user if they reject the Terms of Service
    await logout();
  };

  // Show unified loading state for better UX - only block on auth and ToS, let admin load in background
  const isInitialLoading = authLoading || (user && tosLoading);
  
  // Add timeout fallback in case loading gets stuck
  useEffect(() => {
    if (isInitialLoading) {
      const timeout = setTimeout(() => {
        console.log('⚠️ MainLayout: Loading timeout - force completing loading states');
        setAdminCheckLoading(false);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isInitialLoading]);
  
  // Only show loading state when actually loading critical components
  if (isInitialLoading) {
    // Log only once when entering loading state
    const loadingKey = `${authLoading}-${tosLoading}`;
    const lastLoadingKey = useRef('');
    
    if (lastLoadingKey.current !== loadingKey) {
      console.log('🔄 MainLayout: Critical loading state', { authLoading, tosLoading });
      lastLoadingKey.current = loadingKey;
    }
    
    return (
      <AppLoader 
        authLoading={authLoading}
        tosLoading={tosLoading}
        adminCheckLoading={false} // Don't block on admin loading
      />
    );
  }
  
  // Log only once when loading completes
  const wasLoading = useRef(true);
  if (wasLoading.current) {
    console.log('🎉 MainLayout: Ready - showing main interface');
    wasLoading.current = false;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col">
      {/* Auth header stays at top of every page */}
      <AuthHeader onAdminLoadingChange={handleAdminLoadingChange} />
      
      {/* Logo and welcome section */}
      <section className="bg-white rounded-lg shadow-md mx-auto max-w-6xl mt-8 p-8 space-y-6 text-center">
        <img 
          src="/assets/ArcTecFox-logo.jpg" 
          alt="ArcTecFox Logo" 
          width="120" 
          height="120" 
          className="mx-auto mb-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
        />
        <h2 className="text-2xl font-semibold text-gray-800">
          Welcome to our AI-Powered Maintenance Planning Platform
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Our AI helps you create detailed PM plans for your specific equipment. Enter your asset
          info below and let the system generate schedules, safety procedures, and rationale.
        </p>
        <p className="text-gray-600 max-w-4xl mx-auto border-t pt-6">
          Manage pumps, motors, valves, and more with maintenance strategies from manufacturer specs,
          industry best practices, and your real-world ops. Generate a plan to get started.
        </p>
      </section>
      
      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </div>

      {/* Footer with Terms and Privacy links */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <a 
              href="/terms-of-service" 
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-gray-400">|</span>
            <a 
              href="/privacy-policy" 
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* Terms of Service Modal - shown only to authenticated users who haven't accepted */}
      {user && needsToSAcceptance && (
        <ToSAcceptanceModal
          user={user}
          onAccept={handleToSAccept}
          onReject={handleToSReject}
        />
      )}
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}