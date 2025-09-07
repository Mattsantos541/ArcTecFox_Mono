import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import Home from "./pages/Home";
import UserManagement from "./pages/UserManagement";
import CompanyManagement from "./pages/CompanyManagement";
import SuperAdminManagement from "./pages/SuperAdminManagement";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AcceptInvitation from "./pages/AcceptInvitation";
import MainLayout from "./layouts/MainLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import RedirectIfAuthed from "./routes/RedirectIfAuthed";

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
            {/* PUBLIC */}
            <Route
              path="/"
              element={
                <RedirectIfAuthed>
                  <Home />
                </RedirectIfAuthed>
              }
            />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

            {/* PROTECTED */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MaintenanceSchedule />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UserManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CompanyManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/super-admins"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <SuperAdminManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
