import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import Home from "./pages/Home";
import UserManagement from "./pages/UserManagement";
import CompanyManagement from "./pages/CompanyManagement";
import SuperAdminManagement from "./pages/SuperAdminManagement";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AcceptInvitation from "./pages/AcceptInvitation";
import UnifiedLayout from "./layouts/UnifiedLayout";
import MainLayout from "./layouts/MainLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
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
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
