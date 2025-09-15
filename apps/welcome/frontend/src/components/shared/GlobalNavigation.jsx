import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isUserSiteAdmin, getUserAdminSites, fetchAccessRequests } from "../../api";
import UserStatusBar from "../UserStatusBar";

// Admin Menu Component
function AdminMenu({ adminSites = [], pendingAccessRequests = 0 }) {
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
            {/* Main Navigation */}
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
            >
              Dashboard
            </button>
            
            {/* Admin Section - Only show if user has admin access */}
            {adminSites.length > 0 && (
              <>
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
                    onClick={() => handleNavigation('/admin/super-admins?tab=access-requests')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Super Admin Management</span>
                    {pendingAccessRequests > 0 && (
                      <span className="ml-2 text-xs text-gray-500">({pendingAccessRequests})</span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GlobalNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSites, setAdminSites] = useState([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const lastCheckedUserId = useRef(null);
  const adminStatusCache = useRef(new Map());
  
  const isActive = (path) => location.pathname === path;

  // Check admin status when user changes
  const checkAdminStatus = useCallback(async () => {
    if (user?.id && user.id !== lastCheckedUserId.current) {
      // Check cache first for faster loading
      const cached = adminStatusCache.current.get(user.id);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        setIsAdmin(cached.isAdmin);
        setAdminSites(cached.adminSites);
        setPendingAccessRequests(cached.pendingAccessRequests || 0);
        lastCheckedUserId.current = user.id;
        setAdminCheckLoading(false);
        return;
      }
      
      setAdminCheckLoading(true);
      lastCheckedUserId.current = user.id;
      
      try {
        // Run admin checks in parallel for better performance
        const [adminStatus, userAdminSites] = await Promise.all([
          isUserSiteAdmin(user.id),
          getUserAdminSites(user.id)
        ]);
        
        // Check for pending access requests if user is super admin
        let pendingCount = 0;
        const isSuperAdmin = userAdminSites.some(site => site.roles?.name === 'super_admin');
        if (isSuperAdmin) {
          try {
            const requests = await fetchAccessRequests('pending');
            pendingCount = requests.length;
          } catch (error) {
            console.error('Error fetching access requests:', error);
          }
        }
        
        // Cache the results
        adminStatusCache.current.set(user.id, {
          isAdmin: adminStatus,
          adminSites: userAdminSites,
          pendingAccessRequests: pendingCount,
          timestamp: Date.now()
        });
        
        setIsAdmin(adminStatus);
        setAdminSites(userAdminSites);
        setPendingAccessRequests(pendingCount);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAdminSites([]);
        lastCheckedUserId.current = null;
      } finally {
        setAdminCheckLoading(false);
      }
    } else if (!user?.id) {
      setIsAdmin(false);
      setAdminSites([]);
      setPendingAccessRequests(0);
      lastCheckedUserId.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/assets/ArcTecFox-logo.jpg" 
              alt="ArcTecFox" 
              className="h-8 w-8"
            />
            <span className="hidden sm:inline font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
              ArcTecFox — AI-Powered Preventive Maintenance
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* PM Plan button removed */}
          </nav>

          {/* Menu and User Status */}
          <div className="flex items-center space-x-4">
            {user && (
              <AdminMenu adminSites={adminSites} pendingAccessRequests={pendingAccessRequests} />
            )}
            <UserStatusBar />
          </div>
        </div>
      </div>
    </header>
  );
}