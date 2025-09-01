import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import PMPlanner from "./pages/PMPlanner"; // keeps your old authenticated planner
import Home from "./pages/Home";           // new landing page
import SimpleLayout from "./layouts/SimpleLayout";
import MainLayout from "./layouts/MainLayout"; // your existing authenticated shell
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public landing */}
            <Route element={<SimpleLayout />}>
              <Route path="/" element={<Home />} />
            </Route>

            {/* Authenticated app (unchanged) */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<MaintenanceSchedule />} />
              <Route path="/pmplanner" element={<PMPlanner />} />
              {/* keep the rest of your admin routes here */}
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
