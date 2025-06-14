import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import CompanyOverview from "./pages/CompanyOverview";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import PMPlanner from "./pages/PMPlanner";
import WorkOrders from "./pages/WorkOrders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { AuthProvider } from "./hooks/useAuth";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<CompanyOverview />} />
            <Route path="/company-overview" element={<CompanyOverview />} />
            <Route path="/pm-planner" element={<PMPlanner />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

export default App;
