import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import PMPlanner from "./pages/PMPlanner";
import { AuthProvider } from "./hooks/useAuth";
import MainLayout from "./layouts/MainLayout"; // you’ll need to create this if missing

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<PMPlanner />} />
            <Route path="/pm-planner" element={<PMPlanner />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
