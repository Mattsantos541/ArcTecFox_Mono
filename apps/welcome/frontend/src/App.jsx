import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import PMPlanner from "./pages/PMPlanner";
import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import UserManagement from "./pages/UserManagement";
import SuperAdminManagement from "./pages/SuperAdminManagement";
import CompanyManagement from "./pages/CompanyManagement";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./layouts/MainLayout"; // you'll need to create this if missing

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<MaintenanceSchedule />} />
              <Route path="/pmplanner" element={<PMPlanner />} />
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

export default App;
