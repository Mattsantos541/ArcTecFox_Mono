import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import React, { Suspense } from 'react';

// Import Home eagerly for fast initial load
import Home from "./pages/Home";
import UnifiedLayout from "./layouts/UnifiedLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Lazy load all other pages for code splitting
const MaintenanceSchedule = React.lazy(() => import("./components/dashboard/maintenance-schedule"));
const UserManagement = React.lazy(() => import("./pages/UserManagement"));
const CompanyManagement = React.lazy(() => import("./pages/CompanyManagement"));
const SuperAdminManagement = React.lazy(() => import("./pages/SuperAdminManagement"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner text="Authenticating..." />;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  // Tab visibility tracking (without logging)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      // Tab visibility handling can be added here if needed
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner text="Loading page..." />}>
            <Routes>
              {/* All routes use UnifiedLayout for consistent navigation */}
              <Route element={<UnifiedLayout />}>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <MaintenanceSchedule />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/companies" element={
                  <ProtectedRoute>
                    <CompanyManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/super-admins" element={
                  <ProtectedRoute>
                    <SuperAdminManagement />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
