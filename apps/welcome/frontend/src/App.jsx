import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import PMPlanner from "./pages/PMPlanner";  // ✔️ correct because PMPlanner is in src/pages
import Home from "./pages/Home";             // ✔️ already correct

//import LeadCaptureModal from "../components/LeadCaptureModal";

import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />            {/* 👈 Update this */}
              <Route path="/pmplanner" element={<PMPlanner />} />
              <Route path="/dashboard" element={<MaintenanceSchedule />} />  {/* Optional cleanup */}
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

