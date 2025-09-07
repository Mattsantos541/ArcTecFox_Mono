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
            {/* ---------- PUBLIC (no app layout) ---------- */}
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

            {/* ---------- PROTECTED (uses MainLayout with <Outlet />) ---------- */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<MaintenanceSchedule />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/companies" element={<CompanyManagement />} />
              <Route path="/admin/super-admins" element={<SuperAdminManagement />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
