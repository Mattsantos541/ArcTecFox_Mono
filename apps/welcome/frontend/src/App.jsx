import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import PMPlanner from "./pages/PMPlanner";
import MaintenanceSchedule from "./components/dashboard/maintenance-schedule";
import { AuthProvider } from "./hooks/useAuth";
import MainLayout from "./layouts/MainLayout"; // you’ll need to create this if missing

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<MaintenanceSchedule />} />
            <Route path="/pmplanner" element={<PMPlanner />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
